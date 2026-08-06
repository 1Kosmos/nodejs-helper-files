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

const RealNodeCache = require('node-cache');
const allCaches = [];

function TrackedNodeCache(...args) {
  const instance = new RealNodeCache(...args);
  allCaches.push(instance);
  return instance;
}
TrackedNodeCache.prototype = RealNodeCache.prototype;

require.cache[require.resolve('node-cache')].exports = TrackedNodeCache;

/**
 * Clears ALL cached data across the entire service.
 */
const flushAll = () => {
  let totalKeys = 0;
  allCaches.forEach((cache) => {
    try {
      totalKeys += cache.keys().length;
      cache.flushAll();
    } catch (e) { /* skip */ }
  });
  return { nodeCaches: allCaches.length, totalKeys };
};

module.exports = { flushAll };
