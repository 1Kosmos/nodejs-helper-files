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

/**
 * Flushes ALL NodeCache instances in the process + WTM HTTP response cache.
 * @returns {{ nodeCaches: number, wtmKeys: number }}
 */
const flushAll = () => {
  let totalKeys = 0;
  allCaches.forEach((c) => {
    try {
      totalKeys += c.keys().length;
      c.flushAll();
    } catch (e) { /* ignore */ }
  });

  let wtmKeys = 0;
  try {
    const WTM = require('./WTM');
    if (typeof WTM.flushCache === 'function') {
      wtmKeys = WTM.flushCache();
    }
  } catch (e) { /* ignore */ }

  return { nodeCaches: allCaches.length, totalKeys, wtmKeys };
};

module.exports = { flushAll, allCaches };
