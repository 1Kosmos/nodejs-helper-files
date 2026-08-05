'use strict';

/**
 * CacheRegistry — Tracks all NodeCache instances for centralized flush.
 *
 * HOW IT WORKS:
 *   1. This file replaces the 'node-cache' module with a wrapper.
 *   2. Every time anyone does `new NodeCache()`, the instance is saved in a list.
 *   3. When `flushAll()` is called, every saved instance is cleared.
 *
 * USAGE:
 *   Add this as the FIRST require in your service's entry point (index.js / server.js):
 *     require('blockid-nodejs-helpers/CacheRegistry');
 *
 *   That's it. All caches created after this line are automatically tracked.
 *   Safe no-op if node-cache is not installed.
 */

const allCaches = [];

// Patch node-cache if available — safe no-op if not installed
try {
  const RealNodeCache = require('node-cache');

  function TrackedNodeCache(...args) {
    const instance = new RealNodeCache(...args);
    allCaches.push(instance);
    return instance;
  }
  TrackedNodeCache.prototype = RealNodeCache.prototype;

  const nodeCacheEntry = require.cache[require.resolve('node-cache')];
  if (nodeCacheEntry) {
    nodeCacheEntry.exports = TrackedNodeCache;
  }
} catch (e) {
  // node-cache not installed — flushAll() will be a no-op
}

/**
 * Clears ALL cached data across the entire service.
 * Called by CacheResetListener when a flush signal is received from Kafka.
 */
const flushAll = () => {
  let totalKeys = 0;

  allCaches.forEach((cache) => {
    try {
      totalKeys += (typeof cache.getStats === 'function' ? cache.getStats().keys : cache.keys().length) ?? 0;
      cache.flushAll();
    } catch (e) { /* skip — cache instance may be in a bad state */ }
  });

  return { nodeCaches: allCaches.length, totalKeys };
};

module.exports = { flushAll };
