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
const BIDTenant = require('./BIDTenant');
const WTM = require('./WTM');

const cache = new NodeCache({ stdTTL: 10 * 60 });

const getVcsPublicKey = async (tenantInfo) => {
    try {

        const sd = await BIDTenant.getSD(tenantInfo);
        let vcsPublicKeyCache = cache.get(sd.vcs + "/publickeys");

        if (vcsPublicKeyCache) {
            return vcsPublicKeyCache;
        }

        let headers = {
            'Content-Type': 'application/json',
            'charset': 'utf-8',
        }

        let url = `${sd.vcs}/publickeys`;
        let api_response = await WTM.executeRequest({ method: 'get', url, headers});
        
        let ret = null;
        if (api_response) {
            api_response = api_response.json;
            ret = api_response.publicKey;
            cache.set(sd.vcs + "/publickeys", ret);
        }

        return ret;
    } catch (error) {
        throw error;
    }

}

const issueVerifiableCredentials = async (tenantInfo, type, document) => {
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
                did: userDid
            }
        });

        api_response = api_response.json;

        return api_response;
    } catch (error) {
        throw error;
    }
}

const verifyVerifiableCredentials = async (tenantInfo, issuedVerifiableCredentials) => {
    try {
        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        let sessionsPublicKey = await getVcsPublicKey(tenantInfo);
        
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
            url: sd.vcs + "/tenant/" + communityInfo.tenant.id + "/community/" + communityInfo.community.id + "/verify/vc",
            headers,
            body: {
                vc: issuedVerifiableCredentials
            }
        });

        api_response = api_response.json;

        return api_response;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    issueVerifiableCredentials,
    verifyVerifiableCredentials
}
