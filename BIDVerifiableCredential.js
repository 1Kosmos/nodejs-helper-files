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
var URL = require('url');
const httpStatus = require('http-status/lib');

const getPublicKey = async (baseUrl) => {
	const pubicKeyUrl = `${baseUrl}/publickeys`;
	const response = await WTM.executeRequest({
		method: 'get',
		url: pubicKeyUrl,
		keepAlive: true,
		cacheKey: pubicKeyUrl,
		ttl: 600
	});

	const ret = response && response.json && response.json.publicKey ? response.json.publicKey : null;
	if (!ret) {
		Logger.debug(`reqId: ${requestId} Got response while fetching publicKey from url: ${pubicKeyUrl}, Response: ${JSON.stringify(response)}`);
		throw new ApiError(httpStatus.NOT_FOUND, Messages.noPublicKeyFound);
	}
	return ret;
};

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
            keepAlive: true,
            preCacheCallback: function (preCachedData) {
                return preCachedData.json ? preCachedData.json.publicKey : null;
            }
        });

        return ret;
    } catch (error) {
        throw error;
    }

}

const requestVCForID = async (tenantInfo, type, document, userDid, userPublickey, userUrn) => {
    try {

        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        let vcsPublicKey = await getVcsPublicKey(tenantInfo);

        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, vcsPublicKey);

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
                publicKey: userPublickey,
                userURN: userUrn
            },
            keepAlive: true
        });

        api_response = api_response.json;

        return api_response;

    } catch (error) {
        throw error;
    }
}

const requestVCForPayload = async (tenantInfo, type, issuer, info, userDid, userPublickey, userUrn) => {
    try {

        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        let vcsPublicKey = await getVcsPublicKey(tenantInfo);

        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, vcsPublicKey);

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
            url: sd.vcs + "/tenant/" + communityInfo.tenant.id + "/community/" + communityInfo.community.id + "/vc/from/payload/" + type,
            headers,
            body: {
                info,
                did: userDid,
                publicKey: userPublickey,
                issuer,
                userURN: userUrn
            },
            keepAlive: true
        });

        api_response = api_response.json;

        return api_response;

    } catch (error) {
        throw error;
    }
}

const verifyCredential = async (tenantInfo, vc) => {
    try {
        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        let vcsPublicKey = await getVcsPublicKey(tenantInfo);

        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, vcsPublicKey);

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
            url: sd.vcs + "/tenant/" + communityInfo.tenant.id + "/community/" + communityInfo.community.id + "/vc/verify",
            headers,
            body: {
                vc
            },
            keepAlive: true
        });

        api_response = api_response.json;

        return api_response;
    } catch (error) {
        throw error;
    }
}

const requestVPForCredentials = async (tenantInfo, vcs) => {
    try {
        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        let vcsPublicKey = await getVcsPublicKey(tenantInfo);

        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, vcsPublicKey);

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
            url: sd.vcs + "/tenant/" + communityInfo.tenant.id + "/community/" + communityInfo.community.id + "/vp/create",
            headers,
            body: {
                vcs
            },
            keepAlive: true
        });

        api_response = api_response.json;

        return api_response;

    } catch (error) {
        throw error;
    }
}

const verifyPresentation = async (tenantInfo, vp) => {
    try {
        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        let vcsPublicKey = await getVcsPublicKey(tenantInfo);

        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, vcsPublicKey);

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
            url: sd.vcs + "/tenant/" + communityInfo.tenant.id + "/community/" + communityInfo.community.id + "/vp/verify",
            headers,
            body: {
                vp
            },
            keepAlive: true
        });

        return api_response.json;

    } catch (error) {
        throw error;
    }
}

const getVcStatusById = async (tenantInfo, vcId) => {
    try {
        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        let vcsPublicKey = await getVcsPublicKey(tenantInfo);

        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, vcsPublicKey);

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
            method: 'get',
            url: sd.vcs + "/tenant/" + communityInfo.tenant.id + "/community/" + communityInfo.community.id + "/vc/" + vcId + "/status",
            headers,
            keepAlive: true
        });

        return api_response.json;

    } catch (error) {
        throw error;
    }
}

const getVPWithDownlaodUri = async (licenseKey, keySet, downloadUri, requestID) => {
    try {
        //const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        // const keySet = BIDTenant.getKeySet();
        // const licenseKey = tenantInfo.licenseKey;
        // const sd = await BIDTenant.getSD(tenantInfo);

        const serviceUrl = `https://` + URL.parse(downloadUri, true).host + "/vcs"

        let vcsPublicKey = await getPublicKey(serviceUrl);

        let sharedKey = BIDECDSA.createSharedKey(keySet.keySecret, vcsPublicKey);

        const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify(requestID), sharedKey);

        let headers = {
            'Content-Type': 'application/json',
            'charset': 'utf-8',
            publickey: keySet.keyId,
            licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
            requestid: encryptedRequestId
        }

        let api_response = await WTM.executeRequest({
            method: 'get',
            url: downloadUri,
            headers,
            keepAlive: true
        });

        const ret = {
            status: api_response.status
        }
        if (api_response.status === httpStatus.OK && api_response.json && api_response.json.data) {
            const str = BIDECDSA.decrypt(api_response.json.data, sharedKey)
            ret.vp = JSON.parse(str).vp
        }
        else {
            ret.response = api_response.text
        }

        return ret;

    } catch (error) {
        throw error;
    }
}

module.exports = {
    requestVCForID,
    requestVCForPayload,
    verifyCredential,
    requestVPForCredentials,
    verifyPresentation,
    getVcStatusById,
    getVPWithDownlaodUri
}
