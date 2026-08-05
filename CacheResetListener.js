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
const REPLAY_WINDOW_MS = 30000; // allow up to 30s clock skew in either direction

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
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
    logger.info('[CacheResetListener] kafkajs not installed, skipping');
    return;
  }

  let consumer = null;
  try {
    // Each pod gets a unique group so every pod receives every message (fan-out)
    const podId = process.env.HOSTNAME || require('crypto').randomBytes(8).toString('hex');
    const groupId = `${TOPIC_NAME}-${serviceName}-${podId}`;

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

          // Only accept messages from CaaS
          if (payload.source !== 'caas') {
            logger.warn(`[CacheResetListener] Ignoring message from: ${payload.source}`);
            return;
          }

          // Reject old/replayed messages (or missing timestamp)
          if (!Number.isFinite(payload.timestamp) || Math.abs(Date.now() - payload.timestamp) > REPLAY_WINDOW_MS) {
            logger.warn(`[CacheResetListener] Rejecting message — invalid or stale timestamp`);
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
    // Clean up consumer on partial initialization failure
    if (consumer) {
      try { await consumer.disconnect(); } catch (e) { /* best effort */ }
    }
    logger.error(`[CacheResetListener] Initialization failed: ${error.message}`);
  }
};

module.exports = { initialize };
