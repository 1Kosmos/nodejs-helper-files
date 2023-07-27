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

    let cachedData = object.cacheKey ? await cache.get(object.cacheKey) : null;

    if (object.Logger) {
        object.Logger.info(`WTM ${object.method} call to URL: ${object.url} with requestId: ${object.requestUID ? object.requestUID : 'n/a'} w/ keepAlive: ${ object.keepAlive ? 'enabled' : 'disabled'} will use cache: ${cachedData ? "yes" : "no"}`);
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

    let t1 = Date.now();
    object.Logger.info(`WTM completed for ${object.method} to URL:${object.url} with requestId: ${object.requestUID ? object.requestUID : 'n/a'} in ${t1 - t0}`);

    return ret;
};


module.exports = {
    executeRequest
};
