/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */

"use strict";
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');

const BIDECDSA = require('./BIDECDSA');
const WTM = require('./WTM');
const fetch = require('node-fetch');
const BIDTenant = require('./BIDTenant');

const cache = new NodeCache({ stdTTL: 10 * 60 });

const getReportsPublicKey = async (tenantInfo) => {
    try {
        const sd = await BIDTenant.getSD(tenantInfo);
        let reportsPublicKeyCache = cache.get(sd.reports + "/publickeys");

        if (reportsPublicKeyCache) {
            return reportsPublicKeyCache;
        }

        let headers = {
            'Content-Type': 'application/json',
            'charset': 'utf-8',
        }

        let api_response = await fetch(sd.reports + "/publickeys", {
            method: 'get',
            headers: headers
        });

        let ret = null;
        if (api_response) {
            api_response = await api_response.json();
            ret = api_response.publicKey;
            cache.set(sd.reports + "/publickeys", ret);
        }

        return ret;
    } catch (error) {
        throw error;
    }

}

const logEvent = async (tenantInfo, eventName, data, requestId = uuidv4()) => {

    const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
    const keySet = BIDTenant.getKeySet();
    const licenseKey = tenantInfo.licenseKey;
    const sd = await BIDTenant.getSD(tenantInfo);

    let reportsPublicKey = await getReportsPublicKey(tenantInfo);

    const {
        community: {
            id: communityId
        },
        tenant: {
            id: tenantId
        }
    } = communityInfo;

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, reportsPublicKey);

    const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify({
        ts: Math.round(new Date().getTime() / 1000),
        appid: 'fixme',
        uuid: uuidv4()
    }), sharedKey);

    let headers = {
        'Content-Type': 'application/json',
        'charset': 'utf-8',
        publickey: keySet.pKey,
        licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
        requestid: encryptedRequestId
    };

    const encryptedData = BIDECDSA.encrypt(JSON.stringify(data), sharedKey);

   WTM.executeRequest({
        method: 'put',
        url: sd.reports + "/tenant/" + tenantId + "/community/" + communityId + "/event/" + eventName,
        headers,
        body: {
            data: encryptedData
        },
        timeout: 5000,
        requestUID: requestId
    })
};


module.exports = {
    logEvent
}
