/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
"use strict";
const BIDECDSA = require('./BIDECDSA');
const BIDTenant = require('./BIDTenant');
const BIDUsers = require('./BIDUsers');
const BIDReports = require('./BIDReports');
const WTM = require('./WTM');
const { v4: uuidv4 } = require('uuid');

const getPublicKey = async (baseUrl) => {
  const pubicKeyUrl = `${baseUrl}/publickeys`;
  const response = await WTM.executeRequest({
    method: 'get',
    url: pubicKeyUrl,
    keepAlive: true,
    cacheKey: pubicKeyUrl,
    ttl: 86400
  });

  const ret = response && response.json && response.json.publicKey ? response.json.publicKey : null;
  if (!ret) {
    throw new ApiError(httpStatus.NOT_FOUND, Messages.noPublicKeyFound);
  }
  return ret;
};

const createNewSession = async (tenantInfo, authType, scopes, metadata) => {
  try {

    const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
    const keySet = BIDTenant.getKeySet();
    const licenseKey = tenantInfo.licenseKey;
    const sd = await BIDTenant.getSD(tenantInfo);

    let sessionsPublicKey = await getPublicKey(sd.sessions);

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

    const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify(WTM.createRequestID()), sharedKey);

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',
      publickey: keySet.pKey,
      licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
      requestid: encryptedRequestId
    }

    let api_response = await WTM.executeRequest({
      method: 'put',
      url: sd.sessions + "/session/new",
      headers,
      body: req,
      keepAlive: true
    });

    let status = api_response.status;
    if (status !== 201) {
      api_response = {
        status: status,
        message: api_response.text
      }
      return api_response;
    }

    api_response = api_response.json;
    api_response.url = sd.sessions;

    return api_response;
  } catch (error) {
    throw error;
  }
}

const pollSession = async (tenantInfo, sessionId, fetchProfile, fetchDevices, eventDataOrNull, requestIdorNull) => {
  try {

    let requestId = requestIdorNull || WTM.createRequestID();
    const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
    const keySet = BIDTenant.getKeySet();
    const licenseKey = tenantInfo.licenseKey;
    const sd = await BIDTenant.getSD(tenantInfo);

    let sessionsPublicKey = await getPublicKey(sd.sessions);

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, sessionsPublicKey);

    const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify(WTM.createRequestID(requestId)), sharedKey);

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',
      publickey: keySet.pKey,
      licensekey: BIDECDSA.encrypt(licenseKey, sharedKey),
      requestid: encryptedRequestId,
      addsessioninfo: 1
    }

    let api_response = await WTM.executeRequest({
      method: 'get',
      url: sd.sessions + "/session/" + sessionId + "/response",
      headers,
      keepAlive: true,
      requestID: requestId,
    });

    let ret = null;

    let status = api_response.status;
    if (status !== 200) {
      ret = {
        status: status,
        message: api_response.text
      }
      return ret;
    }

    ret = api_response.json;
    ret.status = status;

    if (!ret.data) {
      ret = {
        status: 401,
        message: "Session data not found"
      }
      return ret;
    }

    let clientSharedKey = BIDECDSA.createSharedKey(keySet.prKey, ret.publicKey);
    let dec_data = BIDECDSA.decrypt(ret.data, clientSharedKey);
    ret.user_data = JSON.parse(dec_data);

    if (!ret.user_data.hasOwnProperty("did")) {
      ret.status = HttpStatus.SC_UNAUTHORIZED;
      return ret;
    }

    if (ret && ret.user_data && ret.user_data.did && fetchProfile === true) {
      ret.account_data = await BIDUsers.fetchUserByDID(tenantInfo, ret.user_data.did, fetchDevices);
    }

    //check if authenticator response is authorized.
    let userIdList = ret.account_data ? ret.account_data.userIdList : [];
    if (ret.user_data.userid == null && userIdList.length > 0) {
      ret.user_data.userid = userIdList[0]
    }

    if (userIdList.indexOf(ret.user_data.userid) > 0) {
      ret.isValid = true;
    } else {//this covers pon not found, ponUsers empty and ponUsers does not carry mobile user
      ret.status = 401;
      ret.isValid = false;
      ret.message = "Unauthorized user";
    }

    let session_purpose = ret.sessionInfo && ret.sessionInfo.metadata ? ret.sessionInfo.metadata.purpose : null;

    // Report Event
    if (session_purpose === "authenticattion") {
      let eventData = {
        "tenant_dns": tenantInfo.dns,
        "tenant_tag": communityInfo.tenant.tenanttag,
        "service_name": "NodeJS Helper",
        "auth_method": "qr",
        "type": "event",
        "event_id": uuidv4(),
        "version": "v1",
        "session_id": sessionId,
        "journey_id": requestId.journeyId,
        "did": ret.user_data.did,
        "auth_public_key": ret.publicKey,
        "user_id": ret.user_data.userid,
        "login_state": "SUCCESS",
        ...eventDataOrNull
      }

      let eventName = ret.isValid ? "E_LOGIN_SUCCEEDED" : "E_LOGIN_FAILED";

      if (!ret.isValid) {
        eventData.reason = {
          reason: "User not found in PON data"
        }
        eventData.login_state = "FAILED"
      }
      BIDReports.logEvent(tenantInfo, eventName, eventData, requestId);
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

    let sessionsPublicKey = await getPublicKey(sd.sessions);

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

    const encryptedRequestId = BIDECDSA.encrypt(JSON.stringify(WTM.createRequestID()), sharedKey);

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
