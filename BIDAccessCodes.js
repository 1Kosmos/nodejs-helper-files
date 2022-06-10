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
const fetch = require('node-fetch');
const BIDTenant = require('./BIDTenant');

const requestEmailVerificationLink = async (tenantInfo, emailTo, emailTemplateB64OrNull, emailSubjectOrNull, createdBy, ttl_seconds_or_null) => {
    try {

        if (!emailTo) {
            return { statusCode: 400, message: "emailTo is required parameter" }
        }

        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        const {
            community: {
                publicKey: communityPublicKey,
                name: communityName
            },
            tenant: {
                tenanttag: tenantTag
            }
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
            'X-tenantTag': tenantTag,
            publickey: keySet.pKey,
            licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
            requestid: encryptedRequestId
        };

        const req = {
            createdBy,
            version: "v0",
            type: "verification_link",
            emailTo
        };

        if (ttl_seconds_or_null !== null) {
            req.ttl_seconds = ttl_seconds_or_null;
        }

        if (emailTemplateB64OrNull !== null) {
            req.emailTemplateB64 = emailTemplateB64OrNull;
        }

        if (emailSubjectOrNull !== null) {
            req.emailSubject = emailSubjectOrNull
        }

        const encryptedData = BIDECDSA.encrypt(
            JSON.stringify(req),
            sharedKey
        );

        let api_response = await fetch(sd.adminconsole + "/api/r2/acr/community/" + communityName + "/code", {
            method: 'put',
            body: JSON.stringify({ data: encryptedData }),
            headers: headers
        });
        
        let status = api_response.status;
        
        if (api_response) {
            api_response = await api_response.json();
        }
        
        api_response.statusCode = status;

        return api_response;

    } catch (error) {
        throw error;
    }
}

const fetchAccessCode = async (tenantInfo, code) => {
    try {
        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        const {
            community: {
                publicKey: communityPublicKey,
                name: communityName
            },
            tenant: {
                tenanttag: tenantTag
            }
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
            'X-tenantTag': tenantTag,
            publickey: keySet.pKey,
            licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
            requestid: encryptedRequestId
        };

        let api_response = await fetch(sd.adminconsole + "/api/r1/acr/community/" + communityName + "/" + code, {
            method: 'get',
            headers: headers
        });

        let status = api_response.status;

        if (api_response) {
            api_response = await api_response.json();
            if (api_response.data) {
                let dec_data = BIDECDSA.decrypt(api_response.data, sharedKey);
                api_response = JSON.parse(dec_data);
            }
        }

        api_response.statusCode = status;

        return api_response;

    } catch (error) {
        throw error;
    }
}

const verifyAndRedeemEmailVerificationCode = async (tenantInfo, code) => {
    try {

        if (!code) {
            return { statusCode: 400, message: "code is required parameter" }
        }

        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);
        const keySet = BIDTenant.getKeySet();

        const {
            community: {
                publicKey: communityPublicKey,
                name: communityName
            },
            tenant: {
                tenanttag: tenantTag
            }
        } = communityInfo;

        let access_code_response = await fetchAccessCode(tenantInfo, code);

        if (access_code_response.statusCode !== 200) {
            return access_code_response;
        }

        if (access_code_response.type !== 'verification_link') {
            return { statusCode: 400, message: "Provided verification code is invalid type" };
        }

        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, communityPublicKey);

        const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify({
            ts: Math.round(new Date().getTime() / 1000),
            appid: 'fixme',
            uuid: uuidv4()
        }), sharedKey);

        let headers = {
            'Content-Type': 'application/json',
            'charset': 'utf-8',
            'X-tenantTag': tenantTag,
            publickey: keySet.pKey,
            licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
            requestid: encryptedRequestId
        };

        let api_response = await fetch(sd.adminconsole + "/api/r1/acr/community/" + communityName + "/" + code + "/redeem", {
            method: 'post',
            body: JSON.stringify({}),
            headers: headers
        });

        let status = api_response.status;

        if (api_response) {
            api_response = await api_response.json();
        }

        if (status === 200) {
            api_response = { ...api_response, ...access_code_response };
            api_response.status = "redeemed";
        }

        api_response.statusCode = status;

        return api_response;

    } catch (error) {
        throw error;
    }
}

module.exports = {
    requestEmailVerificationLink,
    verifyAndRedeemEmailVerificationCode
}
