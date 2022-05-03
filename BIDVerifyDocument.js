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

const cache = new NodeCache({ stdTTL: 10 * 60 });

const smsTemplate = "Hello Developer, Please complete the document scan for <tenantname> by going to <link>"

const getDocVerifyPublicKey = async () => {
  try {
    const sd = await BIDSDK.getSD();
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

const verifyDocument = async (dvcId, verifications, document) => {
  try {
    const keySet = BIDSDK.getKeySet();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();
    const docVerifyPublicKey = await getDocVerifyPublicKey();

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

const sendSMS = async (communityInfo, smsTo, smsISDCode, smsTemplateB64, requestIdUuid) => {
  try {
    const keySet = BIDSDK.getKeySet();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();

    const {
      community:
      {
        publicKey: communityPublicKey,
        tenantid: tenantId,
        id: communityId
      },
      tenant: {
        tenanttag: tenantTag
      }
    } = communityInfo;

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, communityPublicKey);

    const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify({
      ts: Math.round(new Date().getTime() / 1000),
      appid: 'fixme',
      uuid: requestIdUuid
    }), sharedKey);

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',
      'X-TenantTag': tenantTag,
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

const createDocumentSession = async (dvcID, documentType, smsTo, smsISDCode) => {
  try {
    const keySet = BIDSDK.getKeySet();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();
    const docVerifyPublicKey = await getDocVerifyPublicKey();
    const communityInfo = await BIDSDK.getCommunityInfo();
    const tenantInfo = BIDSDK.getTenant();

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, docVerifyPublicKey);
    let requestIdUuid = uuidv4();
    let userUIDAndDid = uuidv4();

    const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify({
      ts: Math.round(new Date().getTime() / 1000),
      appid: 'fixme',
      uuid: requestIdUuid
    }), sharedKey);

    const headers = {
      'Content-Type': 'application/json',
      charset: 'utf-8',
      publickey: keySet.pKey,
      licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
      requestid: encryptedRequestId
    };

    const req = {
      dvcID,
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

    const templateText = smsTemplate
      .toString()
      .replace(/<tenantname>/, communityInfo.tenant.name)
      .replace(/<link>/, api_response.url);
    
    const smsTemplateB64 = Buffer.from(templateText).toString('base64');

    await sendSMS(communityInfo, smsTo, smsISDCode, smsTemplateB64, requestIdUuid);
    return ({ sessionId: api_response.sessionId, sessionUrl: api_response.url });

  } catch (error) {
    throw error;
  }
}

module.exports = {
  verifyDocument,
  createDocumentSession
}
