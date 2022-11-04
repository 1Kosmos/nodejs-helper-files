/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the 'License');
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
'use strict';
const fetch = require('node-fetch');
const NodeCache = require('node-cache');
const httpStatus = require('http-status');
const keepAliveAgent = require('./KeepAliveAgent');

const cache = new NodeCache();

/**
 * @typedef LoggerType
 * @type {Object}
 * @property {function(string): void} info
 * 
 * @typedef RequestObject
 * @type {Object}
 * @property {string} url                                           - URL to call
 * @property {('get'|'put'|'post'|'delete'|'patch')} method         - Request method
 * @property {Object} [body]                                        - Request body (optional)
 * @property {Object} [urlSearchParams]                             - Url search params (optional)
 * @property {Object} [headers]                                     - Request headers (optional)
 * @property {boolean} [keepAlive]                                  - Keep alive connection flag - if specified, WTM will keep connection (optional)
 * @property {string} [cacheKey]                                    - Cache key - if specified, WTM will cache response (optional)
 * @property {number} [ttl]                                         - Cache expiry time in seconds (optional)
 * @property {LoggerType} [Logger]                                  - Logger object (optional)
 * @property {string} [requestUID]                                  - Request UID for logging (optional)
 * @property {function(*): void} [preCacheCallback]                 - Pre cache callback - if specified, WTM will call this function with response and cache returned value (optional)
 * @property {number} [timeout]                                     - Timeout - in seconds, if specified request will timeout after this time (optional)
 * 
 * @param {RequestObject} object 
 * @returns {Promise<void>}
 */
const executeRequest = async (object) => {
    let cachedData = object.cacheKey ? await cache.get(object.cacheKey) : null;
    if (cachedData) {
        if (object.Logger) {
            object.Logger.info(`WTM ${object.method} call to URL: ${object.url} with requestId: ${object.requestUID ? object.requestUID : 'n/a'} skipped and using cache, with keep-alive ${ object.keepAlive ? 'enabled' : 'disabled'}`);
        }
        return cachedData;
    }

    let request = {
        method: object.method
    };

    if (object.headers) {
        request.headers = object.headers;
    }
    if (object.body) {
        request.body = JSON.stringify(object.body);
    } else if (object.urlSearchParams) {
        request.body = object.urlSearchParams
    }

    if (object.keepAlive) {
        request.agent = keepAliveAgent
    }

    if (object.agent) {
        request.agent = object.agent
    }

    let timeoutId;
    if (object.timeout !== undefined) {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), object.timeout * 1000);

        request.signal = controller.signal;
    }

    if (object.Logger) {
        object.Logger.info(`WTM ${object.method} calling to URL: ${object.url} with requestId: ${object.requestUID ? object.requestUID : 'n/a'}, with keep-alive ${ object.keepAlive ? 'enabled' : 'disabled'}`);
    }

    let ret = {};
    let api_response = await fetch(object.url, request);
    if (api_response) {
        ret.status = api_response.status;
        ret.text = await api_response.text();
        try {
            ret.json = JSON.parse(ret.text);
        } catch (error) {
            //ret.error = error; //MK: SEP/2 this is not supposed to be an error
            if (object.Logger) {
                object.Logger.info(`WTM ${object.method} called to URL:${object.url} with requestId: ${object.requestUID ? object.requestUID : 'n/a'} resulted in ${ret.status} with body: ${ret.error}`);
            }
        }
    }

    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    const responseStatus = [
        httpStatus.UNAUTHORIZED,
        httpStatus.FORBIDDEN,
        httpStatus.INTERNAL_SERVER_ERROR
    ]
    if (responseStatus.includes(ret.status) && object.Logger) {
        object.Logger.info(`WTM ${object.method} called to URL:${object.url} with requestId: ${object.requestUID ? object.requestUID : 'n/a'} resulted in ${ret.status} with body: ${ret.text}`);
    }

    if (object.cacheKey && ret.status == httpStatus.OK) {
        if (object.preCacheCallback) {
            ret = object.preCacheCallback(ret);
        }

        if (ret) {
            cache.set(object.cacheKey, ret, object.ttl);
        }
    }

    return ret;
};


module.exports = {
    executeRequest
};
