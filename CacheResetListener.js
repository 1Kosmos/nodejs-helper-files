'use strict';

/**
 * CacheResetListener — Listens for "flush your caches" signal on Kafka.
 *
 * HOW IT WORKS:
 *   1. Connects to Kafka topic 'platform-cache-reset'
 *   2. Each pod gets its own consumer group (so every pod receives every message)
 *   3. When a message arrives from CaaS, calls CacheRegistry.flushAll()
 *   4. All in-memory caches are cleared — next request fetches fresh data
 *
 * USAGE:
 *   const CacheResetListener = require('blockid-nodejs-helpers/CacheResetListener');
 *   await CacheResetListener.initialize({ kafkaConfig, serviceName, logger });
 */

const CacheRegistry = require('./CacheRegistry');

const TOPIC_NAME = 'platform-cache-reset';
const REPLAY_WINDOW_MS = 30000;

let initialized = false;

const initialize = async ({ kafkaConfig, serviceName, logger }) => {
  if (initialized) {
    logger.info('[CacheResetListener] Already initialized, skipping');
    return;
  }

  if (!kafkaConfig || kafkaConfig.kafka_off === true) {
    logger.info('[CacheResetListener] Kafka not available or disabled, skipping');
    return;
  }

  const { brokers } = kafkaConfig;
  if (!Array.isArray(brokers) || brokers.length === 0) {
    logger.info('[CacheResetListener] No brokers configured, skipping');
    return;
  }

  let consumer = null;
  try {
    const podId = process.env.HOSTNAME || require('crypto').randomUUID();
    const groupId = `${TOPIC_NAME}-${serviceName}-${podId}`;

    const { Kafka } = require('kafkajs');
    const kafka = new Kafka({ clientId: `${TOPIC_NAME}-${serviceName}-${podId}`, brokers });
    consumer = kafka.consumer({ groupId });

    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: false });

    consumer.on(consumer.events.CRASH, (event) => {
      if (!event.payload.restart) {
        logger.error('[CacheResetListener] Consumer crashed — cache flush disabled until restart');
      }
    });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          if (message.value == null) return;
          const payload = JSON.parse(message.value.toString());

          if (payload.source !== 'caas') {
            logger.warn(`[CacheResetListener] Ignoring message from: ${payload.source}`);
            return;
          }

          if (payload.timestamp && Math.abs(Date.now() - payload.timestamp) > REPLAY_WINDOW_MS) {
            logger.warn('[CacheResetListener] Rejecting stale message');
            return;
          }

          const result = CacheRegistry.flushAll();
          logger.info(`[CacheResetListener] Cache flush complete: ${result.nodeCaches} caches, ${result.totalKeys} keys cleared`);
        } catch (error) {
          logger.error(`[CacheResetListener] Error processing message: ${error.message}`);
        }
      },
    });

    initialized = true;
    logger.info(`[CacheResetListener] Listening on topic ${TOPIC_NAME} (groupId: ${groupId})`);
  } catch (error) {
    if (consumer) {
      try { await consumer.disconnect(); } catch (e) { /* best effort */ }
    }
    logger.error(`[CacheResetListener] Initialization failed: ${error.message}`);
  }
};

module.exports = { initialize };
