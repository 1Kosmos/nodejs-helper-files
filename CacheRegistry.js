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

const NodeCache = require('node-cache');

const allCaches = [];

// Patch NodeCache constructor to auto-register every instance
const _originalInit = NodeCache.prototype.init;
NodeCache.prototype.init = function (...args) {
  allCaches.push(this);
  return _originalInit.apply(this, args);
};

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
