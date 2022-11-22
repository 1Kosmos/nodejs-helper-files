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
const httpStatus = require('http-status');

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

const getCurrentLicense = async (licenseKey, serviceUrl, myKeyPair, requestID, senderId, Logger) => {
    const infraKey = makeInfraKey();
    if (infraKey && infraKey.keySecret === licenseKey) {
        Logger.info(`BIDLicenses - getCurrentLicense for requestId: ${requestID ? JSON.stringify(requestID) : 'n/a'} for Hash: ${sha512(licenseKey)} resulted in infraLicenses for URL: ${serviceUrl} `);
        return infraKey;
    }

    let cacheKey = `${serviceUrl}/${licenseKey}`;

    let pubicKeyUrl = `${serviceUrl}/publickeys`;
    let publicKey = (await WTM.executeRequest({
        method: 'get',
        url: pubicKeyUrl,
        Logger,
        requestUID: requestID,
        cacheKey: pubicKeyUrl,
        ttl: 600
    })).json.publicKey;

    let sharedKey = BIDECDSA.createSharedKey(myKeyPair.keySecret, publicKey);

    const requestId = requestID;
    requestId.ts = Math.round(new Date().getTime() / 1000)
    requestId.uuid = requestID.uuid ? requestID.uuid : uuidv4()
    requestId.appid = senderId

    const headers = {
        licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
        requestid: BIDECDSA.encrypt(JSON.stringify(requestId), sharedKey),
        publickey: myKeyPair.keyId
    };

    let url = `${serviceUrl}/servicekey/current`;

    Logger.info(`BIDLicenses - getCurrentLicense calling WTM for requestId: ${requestID ? JSON.stringify(requestID) : 'n/a'} for Hash: ${sha512(licenseKey)} calling URL: ${url} `);

    let ret = (await WTM.executeRequest({
        method: 'get',
        url: url,
        Logger,
        requestUID: requestID,
        headers: headers,
        cacheKey: cacheKey,
        ttl: 600,
        preCacheCallback: function (preCacheResult) {
            let allowed = preCacheResult.json.keySecret === licenseKey && !preCacheResult.json.disabled && moment(preCacheResult.json.expiry) > moment.now();
            return allowed ? preCacheResult : null;
        }
    }));

    if (ret && ret.json && ret.json.disabled === false && ret.json.keySecret === licenseKey) {
        return ret.json;
    }
    throw { statusCode: httpStatus.UNAUTHORIZED, code: httpStatus.UNAUTHORIZED, messages: 'Invalid or Unauthorized License'};

};

const checkCommunityLicense = async (licenseKey, communityId, serviceUrl, myKeyPair, requestID, senderId, Logger) => {
    const infraKey = makeInfraKey();
    if (infraKey && infraKey.keySecret === licenseKey) {
        Logger.info(`BIDLicenses - checkCommunityLicense for requestId: ${requestID ? JSON.stringify(requestID) : 'n/a'} for Hash: ${sha512(licenseKey)} resulted in infraLicenses for URL: ${serviceUrl} `);
        infraKey.isAuthorized = true;
        return infraKey;
    }

    let cacheKey = `${serviceUrl}/${communityId}/${licenseKey}`;

    let pubicKeyUrl = `${serviceUrl}/publickeys`;
    let publicKey = (await WTM.executeRequest({
        method: 'get',
        url: pubicKeyUrl,
        Logger,
        requestUID: requestID,
        cacheKey: pubicKeyUrl,
        ttl: 600
    })).json.publicKey;

    let sharedKey = BIDECDSA.createSharedKey(myKeyPair.keySecret, publicKey);

    const requestId = requestID;
    requestId.uuid = requestID.uuid ? requestID.uuid : uuidv4()
    requestId.appid = senderId
    requestId.ts = Math.round(new Date().getTime() / 1000)

    const headers = {
        licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
        requestid: BIDECDSA.encrypt(JSON.stringify(requestId), sharedKey),
        publickey: myKeyPair.keyId
    };

    let url = `${serviceUrl}/community/${communityId}/licensecheck`;
    Logger.info(`BIDLicenses - checkCommunityLicense calling WTM for requestId: ${requestID ? JSON.stringify(requestID) : 'n/a'} for Hash: ${sha512(licenseKey)} calling URL: ${url} `);

    let ret = (await WTM.executeRequest({
        method: 'get',
        url: url,
        Logger,
        requestUID: requestID,
        headers: headers,
        cacheKey: cacheKey,
        ttl: 600,
        preCacheCallback: function (preCacheResult) {
            preCacheResult.json.keySecret = licenseKey;
            let allowed = preCacheResult.json.isAuthorized && moment(preCacheResult.json.expiry) > moment.now();
            return allowed ? preCacheResult : null;
        }
    }));

    if (ret && ret.json && ret.json.isAuthorized === true) {
        return ret.json;
    }
    throw { statusCode: httpStatus.UNAUTHORIZED, code: httpStatus.UNAUTHORIZED, messages: 'Invalid or Unauthorized License'};
};

const getU1CurrentLicense = async (licenseKey, serviceUrl, requestID = uuidv4(), senderId, Logger) => {

    const infraKey = makeInfraKey();
    if (infraKey && infraKey.keySecret === licenseKey) {
        Logger.info(`BIDLicenses - getCurrentLicense for requestId: ${requestID ? JSON.stringify(requestID) : 'n/a'} for Hash: ${sha512(licenseKey)} resulted in infraLicenses for URL: ${serviceUrl} `);
        return infraKey;
    }

    const headers = {
        licensekey: licenseKey,
        requestid: requestID
    };

    let cacheKey = `${serviceUrl}/${licenseKey}`;

    let url = `${serviceUrl}/u1/servicekey/current`;

    Logger.info(`BIDLicenses - "${senderId}" invokes getU1CurrentLicense calling WTM for requestId: ${requestID ? JSON.stringify(requestID) : 'n/a'} for Hash: ${sha512(licenseKey)} calling URL: ${url} `);

    let ret = (await WTM.executeRequest({
        method: 'get',
        url: url,
        Logger,
        requestUID: requestID,
        headers: headers,
        cacheKey: cacheKey,
        ttl: 600,
        preCacheCallback: function (preCacheResult) {
            let allowed = preCacheResult.json.keySecret === licenseKey && !preCacheResult.json.disabled && moment(preCacheResult.json.expiry) > moment.now();
            return allowed ? preCacheResult : null;
        }
    }));

    if (ret && ret.json && ret.json.disabled === false && ret.json.keySecret === licenseKey) {
        return ret.json;
    }
    throw { statusCode: httpStatus.UNAUTHORIZED, code: httpStatus.UNAUTHORIZED, messages: 'Invalid or Unauthorized License'};

};

const checkU1CommunityLicense = async (licenseKey, communityId, serviceUrl, requestID = uuidv4(), senderId, Logger) => {

    const infraKey = makeInfraKey();
    if (infraKey && infraKey.keySecret === licenseKey) {
        Logger.info(`BIDLicenses - checkU1CommunityLicense for requestId: ${requestID ? JSON.stringify(requestID) : 'n/a'} for Hash: ${sha512(licenseKey)} resulted in infraLicenses for URL: ${serviceUrl} `);
        infraKey.isAuthorized = true;
        return infraKey;
    }

    let headers;
    headers = {
        licensekey: licenseKey, 
        requestid: requestID
    };

    let cacheKey = `${serviceUrl}/${communityId}/${licenseKey}`;

    let url = `${serviceUrl}/u1/community/${communityId}/licensecheck`;
    Logger.info(`BIDLicenses - "${senderId}" invokes checkU1CommunityLicense calling WTM for requestId: ${requestID ? JSON.stringify(requestID) : 'n/a'} for Hash: ${sha512(licenseKey)} calling URL: ${url} `);

    let ret = (await WTM.executeRequest({
        method: 'get',
        url: url,
        Logger,
        requestUID: requestID,
        headers: headers,
        cacheKey: cacheKey,
        ttl: 600,
        preCacheCallback: function (preCacheResult) {
            preCacheResult.json.keySecret = licenseKey;
            let allowed = preCacheResult.json.isAuthorized && moment(preCacheResult.json.expiry) > moment.now();
            return allowed ? preCacheResult : null;
        }
    }));

    if (ret && ret.json && ret.json.isAuthorized === true) {
        return ret.json;
    }
    throw { statusCode: httpStatus.UNAUTHORIZED, code: httpStatus.UNAUTHORIZED, messages: 'Invalid or Unauthorized License'};
};

module.exports = {
    makeInfraKey,
    getCurrentLicense,
    checkCommunityLicense,
    getU1CurrentLicense,
    checkU1CommunityLicense    
};
