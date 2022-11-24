/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
"use strict";
const { v4: uuidv4 } = require('uuid');
const BIDECDSA = require('./BIDECDSA');
const BIDTenant = require('./BIDTenant');
const WTM = require('./WTM');

const getVcsPublicKey = async (tenantInfo) => {
    try {

        const sd = await BIDTenant.getSD(tenantInfo);

        let headers = {
            'Content-Type': 'application/json',
            'charset': 'utf-8',
        }

        let url = `${sd.vcs}/publickeys`;
        let ret = await WTM.executeRequest({
            method: 'get',
            url,
            headers,
            cacheKey: url,
            ttl: 600,
            preCacheCallback: function (preCachedData) {
                return preCachedData.json ? preCachedData.json.publicKey : null;
            }
        });

        return ret;
    } catch (error) {
        throw error;
    }

}

const requestVCForID = async (tenantInfo, type, document) => {
    try {

        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        let sessionsPublicKey = await getVcsPublicKey(tenantInfo);

        let userDid = uuidv4();

        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, sessionsPublicKey);

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
        }

        let api_response = await WTM.executeRequest({
            method: 'post',
            url: sd.vcs + "/tenant/" + communityInfo.tenant.id + "/community/" + communityInfo.community.id + "/vc/from/document/" + type,
            headers,
            body: {
                document,
                did: userDid,
                publicKey: keySet.pKey
            }
        });

        let status = api_response.status;
        
        api_response = api_response.json;

        if (status === 200) {
            api_response = api_response.vc;
        }

        return api_response;

    } catch (error) {
        throw error;
    }
}

module.exports = {
    requestVCForID
}
