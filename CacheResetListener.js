'use strict';

/**
 * CacheResetListener — Kafka-based distributed cache flush for all 1Kosmos microservices.
 *
 * Usage (one line in each service's index.js after Kafka config is fetched):
 *   const CacheResetListener = require('blockid-nodejs-helpers/CacheResetListener');
 *   CacheResetListener.initialize({ kafkaConfig, serviceName, logger, onFlush });
 *
 * Options:
 *   - kafkaConfig: { brokers: string[], kafka_off?: boolean }
 *   - serviceName: e.g. 'adminapi', 'caas', 'users-mgmt' (used for groupId + target matching)
 *   - logger: Winston logger instance (must have .info, .warn, .error)
 *   - onFlush: optional callback invoked after WTM cache is flushed (for service-specific caches)
 *   - verifySignature: optional async function(payload) => boolean for ECDSA verification
 */

const WTM = require('./WTM');
const CacheRegistry = require('./CacheRegistry');

const TOPIC_NAME = 'platform_cache_reset';
const REPLAY_WINDOW_MS = 30000;

let consumer = null;
let initialized = false;

const initialize = async ({ kafkaConfig, serviceName, logger, onFlush, verifySignature }) => {
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
      if (!event.payload.restart) logger.error('[CacheResetListener] Connection to KafkaJS is lost, please restart this service');
    });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          if (message.value == null) return;

          const payload = JSON.parse(message.value.toString());

          // Signature verification (if provided)
          if (verifySignature) {
            const isValid = await verifySignature(payload);
            if (!isValid) {
              logger.warn('[CacheResetListener] Rejecting unverified message');
              return;
            }
          } else {
            // Fallback: basic source check
            if (payload.source !== 'caas') {
              logger.warn(`[CacheResetListener] Ignoring message from untrusted source: ${payload.source}`);
              return;
            }
          }

          // Replay protection (if signature has timestamp)
          if (payload.timestamp && Math.abs(Date.now() - payload.timestamp) > REPLAY_WINDOW_MS) {
            logger.warn(`[CacheResetListener] Rejecting stale message (age: ${Date.now() - payload.timestamp}ms)`);
            return;
          }

          if (payload.targets && !Array.isArray(payload.targets)) {
            logger.warn('[CacheResetListener] Ignoring message with invalid targets');
            return;
          }

          const targets = payload.targets;
          const shouldFlush = !targets || targets.length === 0 || targets.includes(serviceName);

          if (!shouldFlush) {
            logger.info(`[CacheResetListener] Not targeted (targets: ${JSON.stringify(targets)}), skipping`);
            return;
          }

          // Flush all caches (WTM + all NodeCache instances)
          const result = CacheRegistry.flushAll();
          logger.info(`[CacheResetListener] Cache flush complete: ${result.nodeCaches} caches, ${result.totalKeys} keys cleared, WTM: ${result.wtmKeys} keys`);

          // Call service-specific flush callback if provided
          if (onFlush && typeof onFlush === 'function') {
            onFlush();
          }
        } catch (error) {
          logger.error(`[CacheResetListener] Error processing message: ${error}`);
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
