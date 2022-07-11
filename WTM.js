/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
"use strict";
const fetch = require('node-fetch')
const NodeCache = require('node-cache')
const cache = new NodeCache();
const httpStatus = require('http-status');
/*
request object 
{
    method: get/put/post/delete/patch
    url
    headers: {k:v}
    body: json
    cacheKey: string / optional
    ttl: seconds
    preCacheCallback: function(object) return for what to cache OR null to skip cache.
}
*/
const executeRequest = async(object) => {

    let cachedData = object.cacheKey ? await cache.get(object.cacheKey) : null
    if (cachedData) {
        if (object.Logger) {
            object.Logger.info(`WTM ${object.method} call to ${object.url} with reqId: ${object.requestUID ? object.requestUID : "n/a"} skipped and using Cache`)
        }
        return cachedData
    }

    let request = {
        method: object.method
    }

    if (object.headers) {
        request.headers = object.headers
    }
    if (object.body) {
        request.body = JSON.stringify(object.body)
    }

    if (object.timeout !== undefined) {
        request.timeout = object.timeout
    }

    if (object.Logger) {
        object.Logger.info(`WTM ${object.method} calling to ${object.url} with reqId: ${object.requestUID ? object.requestUID : "n/a"}`)
    }


    let ret = {}
    let api_response = await fetch(object.url, request)
    if (api_response) {
        ret.status = api_response.status
        ret.text = await api_response.text()
        try {
            ret.json = JSON.parse(ret.text)
        } catch (error) {
            ret.error = error
        }
      }

      if (object.cacheKey && ret.status == httpStatus.OK) {
          if (object.preCacheCallback) {
              ret = object.preCacheCallback(ret)
          }
          
          if (ret) {
            cache.set(object.cacheKey, ret, object.ttl)
          }
      }
  
      return ret
}


module.exports = {
  executeRequest
}
