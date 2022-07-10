/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
"use strict";
const WTM = require('./WTM');
const BIDECDSA = require('./BIDECDSA')
const { v4: uuidv4 } = require('uuid');
const moment = require("moment")
const sha512 = require('js-sha512')

const makeInfraKey = () => {
    let infraKey = process.env.INFRA_LICENSE_KEY
    if (infraKey) {
        const expiryDate = moment(moment.now()).add(1, 'year').toDate()
        return  {
            type: "hawk",
            disabled: false,
            expiry: expiryDate,
            authLevel: "service",
            tag: "infra_license_key",
            keySecret: infraKey,
            keyId: sha512(infraKey)
        }
    }
    return null
}


const getCurrentLicense = async(licenseKey, serviceUrl, myKeyPair, requestUID = uuidv4(), senderId) => {

    const infraKey = makeInfraKey()
    if (infraKey && infraKey.keySecret === licenseKey) {
        return infraKey
    }

    let cacheKey = `${serviceUrl}/${licenseKey}`

    let pubicKeyUrl = `${serviceUrl}/publickeys`
    let publicKey = (await WTM.executeRequest({method:'get', url: pubicKeyUrl, cacheKey:pubicKeyUrl, ttl:600})).json.publicKey

    let sharedKey = BIDECDSA.createSharedKey(myKeyPair.keySecret, publicKey);

    const requestId = JSON.stringify({
        ts: Math.round(new Date().getTime() / 1000),
        appid: senderId,
        uuid: requestUID
    });

    const headers = {
        licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
        requestid: BIDECDSA.encrypt(requestId, sharedKey),
        publickey: myKeyPair.keyId
    }

    let url = `${serviceUrl}/servicekey/current`
    let ret = (await WTM.executeRequest({method: 'get'
                    , url: url
                    , headers: headers
                    , cacheKey: cacheKey
                    , ttl: 600
                    , preCacheCallback: function(preCacheResult) {
                        let allowed = preCacheResult.json.keySecret === licenseKey && !preCacheResult.json.disabled && moment(preCacheResult.json.expiry) > moment.now();
                        return allowed ? preCacheResult : null
                    }})).json
    

    return ret;

}


const checkCommunityLicense = async(licenseKey, communityId, serviceUrl, myKeyPair, requestUID = uuidv4(), senderId) => {

    const infraKey = makeInfraKey()
    if (infraKey && infraKey.keySecret === licenseKey) {
        infraKey.isAuthorized = true
        return infraKey
    }
    

    let cacheKey = `${serviceUrl}/${communityId}/${licenseKey}`

    let pubicKeyUrl = `${serviceUrl}/publickeys`
    let publicKey = (await WTM.executeRequest({method: 'get', url: pubicKeyUrl, cacheKey: pubicKeyUrl, ttl:600})).json.publicKey

    let sharedKey = BIDECDSA.createSharedKey(myKeyPair.keySecret, publicKey);

    const requestId = JSON.stringify({
        ts: Math.round(new Date().getTime() / 1000),
        appid: senderId,
        uuid: requestUID
    });

    const headers = {
        licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
        requestid: BIDECDSA.encrypt(requestId, sharedKey),
        publickey: myKeyPair.keyId
    }

    let url = `${serviceUrl}/community/${communityId}/licensecheck`
    let ret = (await WTM.executeRequest({method: 'get'
                    , url: url
                    , headers: headers
                    , cacheKey: cacheKey
                    , ttl: 600
                    , preCacheCallback: function(preCacheResult) {
                        preCacheResult.json.keySecret = licenseKey
                        let allowed = preCacheResult.json.isAuthorized &&  moment(preCacheResult.json.expiry) > moment.now();
                        return allowed ? preCacheResult : null
                    }})).json
    

    return ret;

}


module.exports = {
    getCurrentLicense,
    checkCommunityLicense,
    makeInfraKey
}
