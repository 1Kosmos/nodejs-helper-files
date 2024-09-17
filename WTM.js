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
const { v4: uuidv4 } = require('uuid');
const cache = new NodeCache();

const hostMappingString = Buffer.from(process.env.HOST_MAPPING || '', 'base64').toString('utf-8');

const createRequestID = (requestId = {}) => {
    const ts = Math.round(new Date().getTime() / 1000);
    const uuid = requestId.uuid || uuidv4();
    const appid = 'com.1kosmos.nodejs-helper.request';

    return { ...requestId, ts, uuid, appid };
};
/*
request object 
{
    method: get/put/post/delete/patch
    url
    headers: {k:v}
    body: json
    cacheKey: string / optional
    ttl: seconds
    keepAlive: boolean / optional
    preCacheCallback: function(object) return for what to cache OR null to skip cache.
}
*/
const executeRequest = async (object) => {
    let logger = object.logger ? object.logger : object.Logger

    if (object.deleteCacheKey) {
        const countDeleted = cache.del(object.deleteCacheKey);
        logger.info(`WTM ${object.method} called to URL:${object.url} with requestId: ${object.requestID ? JSON.stringify(object.requestID) : 'n/a'}  removed cache: ${countDeleted}}`);
    }

    let readFresh = object.read_fresh ? object.read_fresh : false;

    let cachedData = object.cacheKey && !readFresh ? await cache.get(object.cacheKey) : null;

    if (logger) {
        logger.info(`WTM ${object.method} call to URL: ${object.url} with requestId: ${object.requestID ? JSON.stringify(object.requestID) : 'n/a'} w/ keepAlive: ${ object.keepAlive ? 'enabled' : 'disabled'} will use cache: ${cachedData ? "yes" : "no"}`);
    }


    if (cachedData) {
        return cachedData;
    }

    let t0 = Date.now();

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

    if (object.timeout !== undefined) {
        request.timeout = object.timeout;
    }

    if (hostMappingString) {
      try {
        const hostMapping = JSON.parse(hostMappingString);
        const dns = new URL(object.url).hostname;

        if (hostMapping?.[dns]) {
          object.url = object.url.replace(dns, hostMapping[dns]);
          logger.info(
            `URL updated using host mapping. Original host: ${dns}, Mapped to: ${
              hostMapping[dns]
            }, Updated URL: ${object.url}, requestId: ${
              object.requestID || "n/a"
            }`
          );
        }
      } catch (error) {
        logger.error(
          `Failed to apply host mapping. Error: ${error.message}, requestId: ${
            object.requestID || "n/a"
          }`
        );
      }
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
            if (logger) {
                logger.info(`WTM ${object.method} called to URL:${object.url} with requestId: ${object.requestID ? JSON.stringify(object.requestID) : 'n/a'} resulted in ${ret.status} with body: ${ret.error}`);
            }
        }
    }

    const responseStatus = [
        httpStatus.UNAUTHORIZED,
        httpStatus.FORBIDDEN,
        httpStatus.INTERNAL_SERVER_ERROR
    ]
    if (responseStatus.includes(ret.status) && logger) {
        logger.info(`WTM ${object.method} called to URL:${object.url} with requestId: ${object.requestID ? JSON.stringify(object.requestID) : 'n/a'} resulted in ${ret.status} with body: ${ret.text}`);
    }

    if (object.cacheKey && ret.status == httpStatus.OK) {
        if (object.preCacheCallback) {
            ret = object.preCacheCallback(ret);
        }

        if (ret) {
            cache.set(object.cacheKey, ret, object.ttl);
        }
    }

    if (logger) {
        let t1 = Date.now();
        logger.info(`WTM completed for ${object.method} to URL:${object.url} with requestId: ${object.requestID ? JSON.stringify(object.requestID) : 'n/a'} in ${t1 - t0}`);
    }

    return ret;
};


module.exports = {
    executeRequest,
    createRequestID
};
