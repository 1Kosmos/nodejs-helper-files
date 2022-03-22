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

const getPublickey = async () => {
    try {
        const sd = await BIDSDK.getSD();
    
        let pkCache = cache.get(sd.webauthn + "/publickeys");
    
        if (pkCache) {
          return pkCache;
        }
    
        let headers = {
          'Content-Type': 'application/json',
          'charset': 'utf-8',
        }
    
        let api_response = await fetch(sd.webauthn + "/publickeys", {
          method: 'get',
          headers: headers
        });
    
        let ret = null;
        if (api_response) {
          api_response = await api_response.json();
          ret = api_response.publicKey;
          cache.set(sd.webauthn + "/publickeys", ret);
        }
    
        return ret;
      } catch (error) {
        throw error;
      }    
}

const fetchAttestationOptions = async (optionsRequest) => {
    try {
        const communityInfo = await BIDSDK.getCommunityInfo();
        const tenant        = BIDSDK.getTenant();
        const keySet = BIDSDK.getKeySet();
        const licenseKey = BIDSDK.getLicense();
        const sd = await BIDSDK.getSD();

        const waPublicKey = await getPublickey();
        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, waPublicKey);
    
        let req = {
          ...optionsRequest,
          dns: tenant.dns,
          communityId: communityInfo.community.id,
          tenantId: communityInfo.tenant.id
        }

        let reqBody = {
            data: BIDECDSA.encrypt(JSON.stringify(req), sharedKey)
        }
    
       
    
    
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
    
        let api_respose = await fetch(sd.webauthn + "/attestation/options", {
          method: 'post',
          body: JSON.stringify(reqBody),
          headers: headers
        });
    
        if (api_respose) {
          api_respose = await api_respose.json();
          if (api_respose.data) {
            let dec_data = BIDECDSA.decrypt(api_respose.data, sharedKey);
            api_respose = JSON.parse(dec_data);
          }
        }
    
        return api_respose;
      } catch (error) {
        throw error;
      }
    
}

const submitAttestationResult = async(resultRequest) => {
    try {
        const communityInfo = await BIDSDK.getCommunityInfo();
        const tenant        = BIDSDK.getTenant();
        const keySet = BIDSDK.getKeySet();
        const licenseKey = BIDSDK.getLicense();
        const sd = await BIDSDK.getSD();

        const waPublicKey = await getPublickey();
        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, waPublicKey);
    
        let req = {
          ...resultRequest,
          dns: tenant.dns,
          communityId: communityInfo.community.id,
          tenantId: communityInfo.tenant.id
        }

        let reqBody = {
            data: BIDECDSA.encrypt(JSON.stringify(req), sharedKey)
        }
    
       
    
    
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
    
        let api_respose = await fetch(sd.webauthn + "/attestation/result", {
          method: 'post',
          body: JSON.stringify(reqBody),
          headers: headers
        });
    
        if (api_respose) {
          api_respose = await api_respose.json();
          if (api_respose.data) {
            let dec_data = BIDECDSA.decrypt(api_respose.data, sharedKey);
            api_respose = JSON.parse(dec_data);
          }
        }
    
        return api_respose;
      } catch (error) {
        throw error;
      }
}

const fetchAssertionOptions = async(optionsRequest) => {
    try {
        const communityInfo = await BIDSDK.getCommunityInfo();
        const tenant        = BIDSDK.getTenant();
        const keySet = BIDSDK.getKeySet();
        const licenseKey = BIDSDK.getLicense();
        const sd = await BIDSDK.getSD();

        const waPublicKey = await getPublickey();
        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, waPublicKey);
    
        let req = {
          ...optionsRequest,
          dns: tenant.dns,
          communityId: communityInfo.community.id,
          tenantId: communityInfo.tenant.id
        }

        let reqBody = {
            data: BIDECDSA.encrypt(JSON.stringify(req), sharedKey)
        }
    
       
    
    
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
    
        let api_respose = await fetch(sd.webauthn + "/assertion/options", {
          method: 'post',
          body: JSON.stringify(reqBody),
          headers: headers
        });
    
        if (api_respose) {
          api_respose = await api_respose.json();
          if (api_respose.data) {
            let dec_data = BIDECDSA.decrypt(api_respose.data, sharedKey);
            api_respose = JSON.parse(dec_data);
          }
        }
    
        return api_respose;
      } catch (error) {
        throw error;
      }
        
}

const submitAssertionResult = async(resultRequest) => {
    try {
        const communityInfo = await BIDSDK.getCommunityInfo();
        const tenant        = BIDSDK.getTenant();
        const keySet = BIDSDK.getKeySet();
        const licenseKey = BIDSDK.getLicense();
        const sd = await BIDSDK.getSD();

        const waPublicKey = await getPublickey();
        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, waPublicKey);
    
        let req = {
          ...resultRequest,
          dns: tenant.dns,
          communityId: communityInfo.community.id,
          tenantId: communityInfo.tenant.id
        }

        let reqBody = {
            data: BIDECDSA.encrypt(JSON.stringify(req), sharedKey)
        }
    
       
    
    
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
    
        let api_respose = await fetch(sd.webauthn + "/assertion/result", {
          method: 'post',
          body: JSON.stringify(reqBody),
          headers: headers
        });
    
        if (api_respose) {
          api_respose = await api_respose.json();
          if (api_respose.data) {
            let dec_data = BIDECDSA.decrypt(api_respose.data, sharedKey);
            api_respose = JSON.parse(dec_data);
          }
        }
    
        return api_respose;
      } catch (error) {
        throw error;
      }

}



module.exports = {
    getPublickey,
    fetchAttestationOptions,
    submitAttestationResult,
    fetchAssertionOptions,
    submitAssertionResult
  }
  