'use strict';

/**
 * CacheResetListener — Kafka-based distributed cache flush for all 1Kosmos microservices.
 *
 * Usage:
 *   const CacheResetListener = require('blockid-nodejs-helpers/CacheResetListener');
 *   CacheResetListener.initialize({ kafkaConfig, serviceName, logger });
 *
 * Options:
 *   - kafkaConfig: { brokers: string[], kafka_off?: boolean }
 *   - serviceName: e.g. 'adminapi', 'caas', 'users-mgmt' (used for groupId)
 *   - logger: Winston logger instance (must have .info, .warn, .error)
 *   - onFlush: optional callback invoked after caches are flushed (for service-specific cleanup)
 */

const CacheRegistry = require('./CacheRegistry');

const TOPIC_NAME = 'platform_cache_reset';
const REPLAY_WINDOW_MS = 30000;

let consumer = null;
let initialized = false;

const initialize = async ({ kafkaConfig, serviceName, logger, onFlush }) => {
  if (initialized) {
    logger.info('[CacheResetListener] Already initialized, skipping');
    return;
  }

  if (!kafkaConfig) {
    logger.info('[CacheResetListener] No kafkaConfig provided, skipping');
    return;
  }

  if (kafkaConfig.kafka_off === true) {
    logger.info('[CacheResetListener] Kafka is disabled (kafka_off), skipping');
    return;
  }

  const { brokers } = kafkaConfig;
  if (!Array.isArray(brokers) || brokers.length === 0) {
    logger.info('[CacheResetListener] No brokers configured, skipping');
    return;
  }

  let Kafka;
  try {
    ({ Kafka } = require('kafkajs'));
  } catch (e) {
    logger.error('[CacheResetListener] kafkajs not installed in this service, skipping');
    return;
  }

  try {
    const podId = process.env.HOSTNAME || require('crypto').randomUUID();
    const groupId = `${TOPIC_NAME}-${serviceName}-${podId}`;

    const kafkaClient = new Kafka({
      clientId: `client-${TOPIC_NAME}`,
      brokers,
    });

    consumer = kafkaClient.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: false });

    consumer.on(consumer.events.CRASH, (event) => {
      if (!event.payload.restart) {
        logger.error('[CacheResetListener] Consumer crashed and will not restart — cache flush disabled until service restart');
      }
    });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          if (message.value == null) return;

          const payload = JSON.parse(message.value.toString());

          // Source validation
          if (payload.source !== 'caas') {
            logger.warn(`[CacheResetListener] Ignoring message from untrusted source: ${payload.source}`);
            return;
          }

          // Replay protection
          if (payload.timestamp && Math.abs(Date.now() - payload.timestamp) > REPLAY_WINDOW_MS) {
            logger.warn(`[CacheResetListener] Rejecting stale message (age: ${Date.now() - payload.timestamp}ms)`);
            return;
          }

          // Flush all caches (NodeCache instances + WTM)
          const result = CacheRegistry.flushAll();
          logger.info(`[CacheResetListener] Cache flush complete: ${result.nodeCaches} caches, ${result.totalKeys} keys cleared, WTM: ${result.wtmKeys} keys`);

          // Service-specific flush callback
          if (onFlush && typeof onFlush === 'function') {
            onFlush();
          }
        } catch (error) {
          logger.error(`[CacheResetListener] Error processing message: ${error.message}`);
        }
      },
    });

    initialized = true;
    logger.info(`[CacheResetListener] Listening on topic ${TOPIC_NAME} (groupId: ${groupId})`);
  } catch (error) {
    // Clean up dangling consumer on partial failure
    if (consumer) {
      try { await consumer.disconnect(); } catch (e) { /* ignore */ }
      consumer = null;
    }
    logger.error(`[CacheResetListener] Initialization failed: ${error.message}`);
  }
};

module.exports = { initialize };
