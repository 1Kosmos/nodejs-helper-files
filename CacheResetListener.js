'use strict';

/**
 * CacheResetListener — Listens for "flush your caches" signal on Kafka.
 *
 * HOW IT WORKS:
 *   1. Connects to Kafka topic 'platform_cache_reset'
 *   2. Each pod gets its own consumer group (so every pod receives every message)
 *   3. When a message arrives from CaaS, calls CacheRegistry.flushAll()
 *   4. All in-memory caches are cleared — next request fetches fresh data
 *
 * USAGE (in each service's CacheResetConsumer.js):
 *   const CacheResetListener = require('blockid-nodejs-helpers/CacheResetListener');
 *   await CacheResetListener.initialize({ kafkaConfig, serviceName, logger });
 */

const CacheRegistry = require('./CacheRegistry');

const TOPIC_NAME = 'platform_cache_reset';
const REPLAY_WINDOW_MS = 30000; // reject messages older than 30 seconds

let initialized = false;

const initialize = async ({ kafkaConfig, serviceName, logger }) => {
  // Only initialize once per process
  if (initialized) {
    logger.info('[CacheResetListener] Already initialized, skipping');
    return;
  }

  // Skip if Kafka is not configured or disabled
  if (!kafkaConfig || kafkaConfig.kafka_off === true) {
    logger.info('[CacheResetListener] Kafka not available or disabled, skipping');
    return;
  }

  const { brokers } = kafkaConfig;
  if (!Array.isArray(brokers) || brokers.length === 0) {
    logger.info('[CacheResetListener] No brokers configured, skipping');
    return;
  }

  // kafkajs is optional — service must have it installed
  let Kafka;
  try {
    ({ Kafka } = require('kafkajs'));
  } catch (e) {
    logger.error('[CacheResetListener] kafkajs not installed, skipping');
    return;
  }

  try {
    // Each pod gets a unique group so every pod receives every message (fan-out)
    const podId = process.env.HOSTNAME || require('crypto').randomUUID();
    const groupId = `${TOPIC_NAME}-${serviceName}-${podId}`;

    const kafka = new Kafka({ clientId: `client-${TOPIC_NAME}`, brokers });
    const consumer = kafka.consumer({ groupId });

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

          // Only accept messages from CaaS
          if (payload.source !== 'caas') {
            logger.warn(`[CacheResetListener] Ignoring message from: ${payload.source}`);
            return;
          }

          // Reject old/replayed messages
          if (payload.timestamp && Math.abs(Date.now() - payload.timestamp) > REPLAY_WINDOW_MS) {
            logger.warn(`[CacheResetListener] Rejecting stale message (age: ${Date.now() - payload.timestamp}ms)`);
            return;
          }

          // Flush all caches
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
    logger.error(`[CacheResetListener] Initialization failed: ${error.message}`);
  }
};

module.exports = { initialize };
