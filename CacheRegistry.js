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
 */

// Step 1: Save the real NodeCache constructor
const RealNodeCache = require('node-cache');

// Step 2: Keep a list of all cache instances
const allCaches = [];

// Step 3: Create a wrapper that saves each new instance to the list
function TrackedNodeCache(...args) {
  const instance = new RealNodeCache(...args);
  allCaches.push(instance);
  return instance;
}
TrackedNodeCache.prototype = RealNodeCache.prototype;

// Step 4: Replace node-cache in Node's require system
// After this, any file that does require('node-cache') gets TrackedNodeCache
require.cache[require.resolve('node-cache')].exports = TrackedNodeCache;

/**
 * Clears ALL cached data across the entire service.
 * Called by CacheResetListener when a flush signal is received from Kafka.
 */
const flushAll = () => {
  let totalKeys = 0;

  // Clear every NodeCache instance (providers, WTM, BIDTenant, etc.)
  allCaches.forEach((cache) => {
    try {
      totalKeys += cache.keys().length;
      cache.flushAll();
    } catch (e) { /* skip if cache was garbage collected */ }
  });

  return { nodeCaches: allCaches.length, totalKeys };
};

module.exports = { flushAll };
