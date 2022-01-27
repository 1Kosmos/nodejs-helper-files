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

const requestOTP = async (userName, emailToOrNull, smsToOrNull, smsISDCodeOrNull) => {
  try {
    const communityInfo = await BIDSDK.getCommunityInfo();
    const keySet = BIDSDK.getKeySet();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();

    let req = {
      userId: userName,
      communityId: communityInfo.community.id,
      tenantId: communityInfo.tenant.id
    }

    if (emailToOrNull !== null) {
      req.emailTo = emailToOrNull;
    }

    if (smsISDCodeOrNull !== null && smsToOrNull != null) {
      req.smsTo = smsToOrNull;
      req.smsISDCode = smsISDCodeOrNull;
    }

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, communityInfo.community.publicKey);

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

    let api_respose = await fetch(sd.adminconsole + "/api/r2/otp/generate", {
      method: 'post',
      body: JSON.stringify(req),
      headers: headers
    });

    if (api_respose) {
      api_respose = await api_respose.json();
      if (api_respose.data) {
        let dec_data = BIDECDSA.decrypt(api_respose.data, sharedKey);
        api_respose.response = JSON.parse(dec_data);
      }
    }

    return api_respose;
  } catch (error) {
    throw error;
  }
}

const verifyOTP = async (userName, otpCode) => {
  try {
    const communityInfo = await BIDSDK.getCommunityInfo();
    const keySet = BIDSDK.getKeySet();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();

    let req = {
      userId: userName,
      code: otpCode,
      communityId: communityInfo.community.id,
      tenantId: communityInfo.tenant.id
    }

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, communityInfo.community.publicKey);

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

    let api_respose = await fetch(sd.adminconsole + "/api/r2/otp/verify", {
      method: 'post',
      body: JSON.stringify(req),
      headers: headers
    });

    if (api_respose) {
      api_respose = await api_respose.json();
    }

    return api_respose;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  requestOTP,
  verifyOTP
}
