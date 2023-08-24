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
const BIDUsers = require('./BIDUsers');
const fetch = require('node-fetch');
const WTM = require('./WTM');

const cache = new NodeCache({ stdTTL: 10 * 60 });

const getSessionPublicKey = async (tenantInfo) => {
  try {
    const sd = await BIDTenant.getSD(tenantInfo);
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

const createNewSession = async (tenantInfo, authType, scopes, metadata) => {
  try {

    const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
    const keySet = BIDTenant.getKeySet();
    const licenseKey = tenantInfo.licenseKey;
    const sd = await BIDTenant.getSD(tenantInfo);

    let sessionsPublicKey = await getSessionPublicKey(tenantInfo);

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
      metadata
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

      let status = api_response.status;
      if (status !== 201) {
        api_response = {
          status: status,
          message: await api_response.text()
        }
        return api_response;
      }

      api_response = await api_response.json();
      api_response.url = sd.sessions;
    }

    return api_response;
  } catch (error) {
    throw error;
  }
}

const pollSession = async (tenantInfo, sessionId, fetchProfile, fetchDevices) => {
  try {

    const keySet = BIDTenant.getKeySet();
    const licenseKey = tenantInfo.licenseKey;
    const sd = await BIDTenant.getSD(tenantInfo);

    let sessionsPublicKey = await getSessionPublicKey(tenantInfo);

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
      ret.account_data = await BIDUsers.fetchUserByDID(tenantInfo, ret.user_data.did, fetchDevices);
    }

    return ret;
  } catch (error) {
    throw error;
  }
}

const fetchSessionInfo = async (tenantInfo, sessionId) => {
  try {
    const sd = await BIDTenant.getSD(tenantInfo);

    let api_response = await WTM.executeRequest({
      method: 'get',
      url: sd.sessions + "/session/" + sessionId,
      keepAlive: true
    });

    let status = api_response.status;

    if (status === 200) {
      api_response = api_response.json;
      api_response.status = status;
    }

    return api_response;

  } catch (error) {
    throw error;
  }
}

const authenticateSession = async (tenantInfo, sessionId, publicKey, appid, did, data, ialOrNull, eventDataOrNull) => {
  try {

    const keySet = BIDTenant.getKeySet();
    const sd = await BIDTenant.getSD(tenantInfo);

    let sessionsPublicKey = await getSessionPublicKey(tenantInfo);

    let req = {
      data,
      publicKey,
      did,
      appid
    }

    if (ialOrNull !== null) {
      req.ial = ialOrNull;
    }

    if (eventDataOrNull !== null) {
      req.eventData = eventDataOrNull;
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
      requestid: encryptedRequestId
    }

    let api_response = await WTM.executeRequest({
      method: 'post',
      url: sd.sessions + "/session/" + sessionId + "/authenticate",
      body: req,
      headers,
      keepAlive: true
    });

    let status = api_response.status;

    if (status === 200) {
      api_response = api_response.json;
      api_response.status = status;
    }

    return api_response;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  createNewSession,
  pollSession,
  fetchSessionInfo,
  authenticateSession
}



let session = {
  "sessionId": "8a4ff860-3375-4115-96eb-fe8d9230cef0_1",
  "data": "MmFjMWY2M2JkYTU2ODVkNH8PWvza9zzFmuG/3jiUCPytBFp5/KqV1Sg1mWCc9ALn1skHWb1Ch+aUXMo2PRNOwbveWUItoUmQ82dii/NB/CgHfWRQSCRCtJMV4JQ63am+iLDnr85xeI6+sXBNdVv6SFCad6dVyNqJZtL2RyiEZgEvQaY+6WtPbyylI3wvfVO0zjXXZLskB1nb/pi3rgZQBzZL19O9VULkLR5GEY7X0Fms3uYXTfL0ZUDVn2WDbD3tdQSZWfDkasBYe9PaxwkqtLB5dRmq8x1NOHClevWcEgCLNLjWmUV8M+/o+tBQUEJQNtUzwOiVflDmpGucLEWNkrLfeeA/mVbAi55xH3h3obW54HasD/JqwSZJd/wmtJU2t1NV+W0HCpVuK7stY3Pt+oXM8kb7aG/ebEHkEFa0TKPz/NrdTxCzHg3S5ssq8uht/PXn1kU+2IxGn29lkWiGhie/DcediwURiBYMkEk9QNrJAarlvljMHtwc4ZUfO/BCU9TkoZZ9va3t4DGOUfXHR8ixBNZ94Ol6NrP97wWuVP2owO4a1V5C4cy3C57KFb/VKmlJecoOdsxkAXkFXGJSQQokUzKZZs3t6YO8xIjB+hmG6VkfdaDseDt3d024n9Fsk5uzpuJ11vqtkoZO3x5JqFARw9p598zXV2LEhVn/W6fcb7XRpEGWCZ0wdCw=",
  "appid": "com.onekosmos.kernel.blockid",
  "ial": "IAL1",
  "did": "jenish_did",
  "publicKey": "CE8kpAxwLCGlFj2rGEADuHe7L2KtUncZqOccwlHWrQmr86bWivPljL5ReEIr/lr4ES3wFP446VtdYT/qtSOAOA==",
  "eventData": "event data",

}
