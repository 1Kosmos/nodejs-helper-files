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
const BIDUsers = require('./BIDUsers');
const fetch = require('node-fetch');

const cache = new NodeCache({ stdTTL: 10 * 60 });

const getSessionPublicKey = async () => {
  try {
    const sd = await BIDSDK.getSD();

    let sessionsPublicKeyCache = cache.get(sd.sessions + "/publickeys");

    if (sessionsPublicKeyCache) {
      return sessionsPublicKeyCache;
    }

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',
    }

    let api_response = await fetch(sd.sessions + "/publickeys", {
      method: 'get',
      headers: headers
    });

    let ret = null;
    if (api_response) {
      api_response = await api_response.json();
      ret = api_response.publicKey;
      cache.set(sd.sessions + "/publickeys", ret);
    }

    return ret;
  } catch (error) {
    throw error;
  }

}

const createNewSession = async (authType, scopes) => {
  try {
    const communityInfo = await BIDSDK.getCommunityInfo();
    const keySet = BIDSDK.getKeySet();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();
    let sessionsPublicKey = await getSessionPublicKey();

    let req = {
      origin: {
        tag: communityInfo.tenant.tenanttag,
        url: sd.adminconsole,
        communityName: communityInfo.community.name,
        communityId: communityInfo.community.id,
        authPage: 'blockid://authenticate'
      },
      scopes: (scopes !== undefined && scopes !== null) ? scopes : "",
      authtype: (authType !== undefined && authType !== null) ? authType : "none",
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

    let api_response = await fetch(sd.sessions + "/session/new", {
      method: 'put',
      body: JSON.stringify(req),
      headers: headers
    });

    if (api_response) {
      api_response = await api_response.json();
      api_response.url = sd.sessions;
    }

    return api_response;
  } catch (error) {
    throw error;
  }
}

const pollSession = async (sessionId, fetchProfile, fetchDevices) => {
  try {
    const keySet = BIDSDK.getKeySet();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();

    let sessionsPublicKey = await getSessionPublicKey();

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

    let api_response = await fetch(sd.sessions + "/session/" + sessionId + "/response", {
      method: 'get',
      headers: headers
    });

    let ret = null;
    if (api_response) {

      let status = api_response.status;
      if (status !== 200) {
        ret = {
          status: status,
          message: await api_response.text()
        }
        return ret;
      }

      ret = await api_response.json();
      ret.status = status;

      if (ret.data) {
        let clientSharedKey = BIDECDSA.createSharedKey(keySet.prKey, ret.publicKey);
        let dec_data = BIDECDSA.decrypt(ret.data, clientSharedKey);
        ret.user_data = JSON.parse(dec_data);
      }
    }

    if (ret && ret.user_data && ret.user_data.did && fetchProfile === true) {
      ret.account_data = await BIDUsers.fetchUserByDID(ret.user_data.did, fetchDevices);
    }

    return ret;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  createNewSession,
  pollSession
}
