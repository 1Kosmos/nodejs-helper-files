/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the 'License');
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
'use strict';
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const sha512 = require('js-sha512');

const WTM = require('./WTM');
const BIDECDSA = require('./BIDECDSA');

const makeInfraKey = () => {
    let infraKey = process.env.INFRA_LICENSE_KEY;
    if (infraKey) {
        const expiryDate = moment(moment.now()).add(1, 'year').toDate();
        return {
            type: 'hawk',
            disabled: false,
            expiry: expiryDate,
            authLevel: 'service',
            tag: 'infra_license_key',
            keySecret: infraKey,
            keyId: sha512(infraKey)
        };
    }
    return null;
};

const getCurrentLicense = async (licenseKey, serviceUrl, myKeyPair, requestUID = uuidv4(), senderId, Logger) => {

    const infraKey = makeInfraKey();
    if (infraKey && infraKey.keySecret === licenseKey) {
        Logger.info(`BIDLicenses - getCurrentLicense for requestId: ${requestUID ? requestUID : 'n/a'} for Hash: ${sha512(licenseKey)} resulted in infraLicenses for URL: ${serviceUrl} `);
        return infraKey;
    }

    const requestId = JSON.stringify({
        ts: Math.round(new Date().getTime() / 1000),
        appid: senderId,
        uuid: requestUID
    });

    let headers;
    let u1Route = false;
    if (!myKeyPair) {
        u1Route = true;
        headers = {
            licensekey: licenseKey,
            requestid: requestId
        };

    }

    let cacheKey = `${serviceUrl}/${licenseKey}`;

    if (!u1Route) { 
        let pubicKeyUrl = `${serviceUrl}/publickeys`;
        let publicKey = (await WTM.executeRequest({
            method: 'get',
            url: pubicKeyUrl,
            Logger,
            requestUID,
            cacheKey: pubicKeyUrl,
            ttl: 600
        })).json.publicKey;

        let sharedKey = BIDECDSA.createSharedKey(myKeyPair.keySecret, publicKey);

        headers = {
            licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
            requestid: BIDECDSA.encrypt(requestId, sharedKey),
            publickey: myKeyPair.keyId
        };    
    }

    let url = u1Route ? `${serviceUrl}/u1/servicekey/current` : `${serviceUrl}/servicekey/current`;

    Logger.info(`BIDLicenses - getCurrentLicense calling WTM for requestId: ${requestUID ? requestUID : 'n/a'} for Hash: ${sha512(licenseKey)} calling URL: ${url} `);

    let ret = (await WTM.executeRequest({
        method: 'get',
        url: url,
        Logger,
        requestUID,
        headers: headers,
        cacheKey: cacheKey,
        ttl: 600,
        preCacheCallback: function (preCacheResult) {
            let allowed = preCacheResult.json.keySecret === licenseKey && !preCacheResult.json.disabled && moment(preCacheResult.json.expiry) > moment.now();
            return allowed ? preCacheResult : null;
        }
    })).json;

    return ret;
};

const checkCommunityLicense = async (licenseKey, communityId, serviceUrl, myKeyPair, requestUID = uuidv4(), senderId, Logger) => {

    const infraKey = makeInfraKey();
    if (infraKey && infraKey.keySecret === licenseKey) {
        Logger.info(`BIDLicenses - checkCommunityLicense for requestId: ${requestUID ? requestUID : 'n/a'} for Hash: ${sha512(licenseKey)} resulted in infraLicenses for URL: ${serviceUrl} `);
        infraKey.isAuthorized = true;
        return infraKey;
    }

    const requestId = JSON.stringify({
        ts: Math.round(new Date().getTime() / 1000),
        appid: senderId,
        uuid: requestUID
    });

    let headers;
    let u1Route = false;
    if (!myKeyPair) {
        u1Route = true;
        headers = {
            licensekey: licenseKey,
            requestid: requestId
        };

    }

    let cacheKey = `${serviceUrl}/${communityId}/${licenseKey}`;

    if (!u1Route) {
        let pubicKeyUrl = `${serviceUrl}/publickeys`;
        let publicKey = (await WTM.executeRequest({
            method: 'get',
            url: pubicKeyUrl,
            Logger,
            requestUID,
            cacheKey: pubicKeyUrl,
            ttl: 600
        })).json.publicKey;

        let sharedKey = BIDECDSA.createSharedKey(myKeyPair.keySecret, publicKey);

        headers = {
            licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
            requestid: BIDECDSA.encrypt(requestId, sharedKey),
            publickey: myKeyPair.keyId
        };
    }

    let url = u1Route ? `${serviceUrl}/u1/community/${communityId}/licensecheck` : `${serviceUrl}/community/${communityId}/licensecheck`;
    Logger.info(`BIDLicenses - checkCommunityLicense calling WTM for requestId: ${requestUID ? requestUID : 'n/a'} for Hash: ${sha512(licenseKey)} calling URL: ${url} `);

    let ret = (await WTM.executeRequest({
        method: 'get',
        url: url,
        Logger,
        requestUID,
        headers: headers,
        cacheKey: cacheKey,
        ttl: 600,
        preCacheCallback: function (preCacheResult) {
            preCacheResult.json.keySecret = licenseKey;
            let allowed = preCacheResult.json.isAuthorized && moment(preCacheResult.json.expiry) > moment.now();
            return allowed ? preCacheResult : null;
        }
    })).json;

    return ret;
};

module.exports = {
    makeInfraKey,
    getCurrentLicense,
    checkCommunityLicense
};
