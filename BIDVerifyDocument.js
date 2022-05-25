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
const BIDSDK = require('./BIDSDK');
const fetch = require('node-fetch');
const BIDTenant = require('./BIDTenant');

const cache = new NodeCache({ stdTTL: 10 * 60 });

const getDocVerifyPublicKey = async (tenantInfo) => {
  try {
    const sd = await BIDSDK.getSD(tenantInfo);
    let docVerifyPublicKeyCache = cache.get(sd.docuverify + "/publickeys");

    if (docVerifyPublicKeyCache) {
      return docVerifyPublicKeyCache;
    }

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',
    }

    let api_response = await fetch(sd.docuverify + "/publickeys", {
      method: 'get',
      headers: headers
    });

    let ret = null;
    if (api_response) {
      api_response = await api_response.json();
      ret = api_response.publicKey;
      cache.set(sd.docuverify + "/publickeys", ret);
    }

    return ret;
  } catch (error) {
    throw error;
  }
}

const verifyDocument = async (tenantInfo, dvcId, verifications, document) => {
  try {

    const keySet = BIDTenant.getKeySet();
    const licenseKey = tenantInfo.licenseKey;
    const sd = await BIDTenant.getSD(tenantInfo);
    const docVerifyPublicKey = await getDocVerifyPublicKey(tenantInfo);

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, docVerifyPublicKey);

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

    const encryptedRequestData = BIDECDSA.encrypt(
      JSON.stringify({
        dvcID: dvcId,
        verifications,
        document
      }),
      sharedKey
    );

    let api_response = await fetch(sd.docuverify + "/verify", {
      method: 'post',
      body: JSON.stringify({ data: encryptedRequestData }),
      headers: headers
    });

    let ret = null;
    if (api_response) {
      api_response = await api_response.json();
      let dec_data = api_response.data ? JSON.parse(BIDECDSA.decrypt(api_response.data, sharedKey)) : api_response;
      ret = dec_data;
    }
    return ret;
  } catch (error) {
    throw error;
  }
}

const createDocumentSession = async (tenantInfo, dvcId, documentType) => {
  try {
    const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
    const keySet = BIDTenant.getKeySet();
    const licenseKey = tenantInfo.licenseKey;
    const sd = await BIDTenant.getSD(tenantInfo);
    const docVerifyPublicKey = await getDocVerifyPublicKey(tenantInfo);

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, docVerifyPublicKey);
    let userUIDAndDid = uuidv4();

    const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify({
      ts: Math.round(new Date().getTime() / 1000),
      appid: 'fixme',
      uuid: uuidv4()
    }), sharedKey);

    const headers = {
      'Content-Type': 'application/json',
      charset: 'utf-8',
      publickey: keySet.pKey,
      licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
      requestid: encryptedRequestId
    };

    const req = {
      dvcID: dvcId,
      sessionRequest: {
        tenantDNS: tenantInfo.dns,
        communityName: communityInfo.community.name,
        documentType,
        userUID: userUIDAndDid,
        did: userUIDAndDid
      }
    };

    const encryptedData = {
      data: BIDECDSA.encrypt(JSON.stringify(req), sharedKey)
    };

    let api_response = await fetch(sd.docuverify + "/document_share_session/create", {
      method: 'post',
      body: JSON.stringify(encryptedData),
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

const pollSessionResult = async (tenantInfo, dvcId, sessionId) => {
  try {
    const keySet = BIDTenant.getKeySet();
    const licenseKey = tenantInfo.licenseKey;
    const sd = await BIDTenant.getSD(tenantInfo);
    const docVerifyPublicKey = await getDocVerifyPublicKey(tenantInfo);

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, docVerifyPublicKey);

    const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify({
      ts: Math.round(new Date().getTime() / 1000),
      appid: 'fixme',
      uuid: uuidv4()
    }), sharedKey);

    const headers = {
      'Content-Type': 'application/json',
      charset: 'utf-8',
      publickey: keySet.pKey,
      licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
      requestid: encryptedRequestId
    };

    const req = {
      dvcID: dvcId,
      sessionId
    };

    const encryptedData = {
      data: BIDECDSA.encrypt(JSON.stringify(req), sharedKey)
    };

    let api_response = await fetch(sd.docuverify + "/document_share_session/result", {
      method: 'post',
      body: JSON.stringify(encryptedData),
      headers: headers
    });

    if (api_response) {
      api_response = await api_response.json();

      if (api_response.data) {
        let dec_data = BIDECDSA.decrypt(api_response.data, sharedKey);
        api_response = JSON.parse(dec_data);
      }
    }

    return api_response;

  } catch (error) {
    throw error;
  }
}

module.exports = {
  verifyDocument,
  createDocumentSession,
  pollSessionResult
}
