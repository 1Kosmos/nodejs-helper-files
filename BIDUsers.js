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
const fetch = require('node-fetch');

const fetchUserByDID = async (tenantInfo, did, fetchDevices) => {
  try {
    const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
    const keySet = BIDTenant.getKeySet();
    const licenseKey = tenantInfo.licenseKey;
    const sd = await BIDTenant.getSD(tenantInfo);

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, communityInfo.community.publicKey);

    const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify({
      ts: Math.round(new Date().getTime() / 1000),
      appid: 'fixme',
      uuid: uuidv4()
    }), sharedKey);

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',
      'X-TenantTag': communityInfo.tenant.tenanttag,
      publickey: keySet.pKey,
      licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
      requestid: encryptedRequestId
    }
    let url = sd.adminconsole + "/api/r1/community/" + communityInfo.community.name + "/userdid/" + did + "/userinfo";
    if (fetchDevices === true) {
      url = url + "?devicelist=true";
    }

    let api_response = await fetch(url, {
      method: 'get',
      headers: headers
    });

    let ret = null;
    if (api_response) {
      api_response = await api_response.json();
      if (api_response.data) {
        let dec_data = BIDECDSA.decrypt(api_response.data, sharedKey);
        ret = JSON.parse(dec_data);
      }
    }

    return ret;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  fetchUserByDID
}
