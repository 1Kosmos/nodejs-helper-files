'use strict';

/**
 * CacheRegistry — Auto-captures all NodeCache instances for centralized flush.
 *
 * MUST be required at the very top of index.js (before any other require that creates NodeCache):
 *   require('blockid-nodejs-helpers/CacheRegistry');
 *
 * After this, any `new NodeCache()` anywhere in the service is auto-registered.
 * When flushAll() is called, every NodeCache instance + WTM cache is cleared.
 */

const OriginalNodeCache = require('node-cache');

const allCaches = [];

// Replace node-cache module export with a wrapper that captures every instance.
// node-cache v5.x does NOT have a `.init()` prototype method, so patching the
// constructor via the require cache is the only reliable interception point.
function PatchedNodeCache(...args) {
  const instance = new OriginalNodeCache(...args);
  allCaches.push(instance);
  return instance;
}

// Preserve prototype chain so instanceof checks still work
PatchedNodeCache.prototype = OriginalNodeCache.prototype;
PatchedNodeCache.prototype.constructor = PatchedNodeCache;

// Replace in Node's require cache so all subsequent `require('node-cache')` get the patched version
require.cache[require.resolve('node-cache')].exports = PatchedNodeCache;

// Resolve WTM once at module load (avoids repeated require lookup on every flush)
let WTM = null;
try {
  WTM = require('./WTM');
} catch (e) { /* WTM not available — skip */ }

/**
 * Flushes ALL NodeCache instances in the process + WTM HTTP response cache.
 * @returns {{ nodeCaches: number, totalKeys: number, wtmKeys: number }}
 */
const flushAll = () => {
  let totalKeys = 0;
  allCaches.forEach((c) => {
    try {
      totalKeys += c.keys().length;
      c.flushAll();
    } catch (e) { /* ignore dead cache reference */ }
  });

  let wtmKeys = 0;
  if (WTM && typeof WTM.flushCache === 'function') {
    try {
      wtmKeys = WTM.flushCache();
    } catch (e) { /* ignore */ }
  }

  return { nodeCaches: allCaches.length, totalKeys, wtmKeys };
};

module.exports = { flushAll, allCaches };
