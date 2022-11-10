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
const fetch = require('node-fetch');

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

        let api_response = await fetch(sd.vcs + "/publickeys", {
            method: 'get',
            headers: headers
        });

        let ret = null;
        if (api_response) {
            api_response = await api_response.json();
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

        let req = {
            document,
            did: userDid
        }

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

        let api_response = await fetch(sd.vcs + "/tenant/" + communityInfo.tenant.id + "/community/" + communityInfo.community.id + "/vc/from/document/" + type, {
            method: 'post',
            body: JSON.stringify(req),
            headers: headers
        });

        let status = api_response.status;

        if (api_response) {
            api_response = await api_response.json();
        }

        api_response.status = status;
        return api_response;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    issueVerifiableCredentials
}