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
const BIDSDK = require('./BIDSDK');
const fetch = require('node-fetch');

const sendSMS = async (smsTo, smsISDCode, smsTemplateB64) => {
    try {
        const keySet = BIDSDK.getKeySet();
        const licenseKey = BIDSDK.getLicense();
        const sd = await BIDSDK.getSD();
        const communityInfo = await BIDSDK.getCommunityInfo();

        const {
            community:
            {
                publicKey: communityPublicKey,
                tenantid: tenantId,
                id: communityId
            },
        } = communityInfo;

        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, communityPublicKey);

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

        const req = {
            tenantId,
            communityId,
            smsTo,
            smsISDCode,
            smsTemplateB64
        };

        let api_response = await fetch(sd.adminconsole + "/api/r2/messaging/schedule", {
            method: 'post',
            body: JSON.stringify(req),
            headers: headers
        });

        if (api_response) {
            api_response = await api_response.json();
        }

        return api_response;

    } catch (error) {
        throw error;
    }
}

module.exports = {
    sendSMS
}
