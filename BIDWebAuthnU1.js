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



const fetchAttestationOptions = async (optionsRequest) => {
    try {
        const communityInfo = await BIDSDK.getCommunityInfo();
        const tenant        = BIDSDK.getTenant();
        const licenseKey = BIDSDK.getLicense();
        const sd = await BIDSDK.getSD();

        
        let req = {
          ...optionsRequest,
          dns: tenant.dns,
          communityId: communityInfo.community.id,
          tenantId: communityInfo.tenant.id
        }
    
        let headers = {
          'Content-Type': 'application/json',
          'charset': 'utf-8',
          
          licensekey: licenseKey,
          requestid: uuidv4()
        }
    
        let api_respose = await fetch(sd.webauthn + "/attestation/options", {
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

const submitAttestationResult = async(resultRequest) => {
    try {
        const communityInfo = await BIDSDK.getCommunityInfo();
        const tenant        = BIDSDK.getTenant();
        const licenseKey = BIDSDK.getLicense();
        const sd = await BIDSDK.getSD();

        let req = {
          ...resultRequest,
          dns: tenant.dns,
          communityId: communityInfo.community.id,
          tenantId: communityInfo.tenant.id
        }
    
        let headers = {
          'Content-Type': 'application/json',
          'charset': 'utf-8',
          licensekey: licenseKey,
          requestid: uuidv4()
        }
    
        let api_respose = await fetch(sd.webauthn + "/attestation/result", {
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

const fetchAssertionOptions = async(optionsRequest) => {
    try {
        const communityInfo = await BIDSDK.getCommunityInfo();
        const tenant        = BIDSDK.getTenant();
        const licenseKey = BIDSDK.getLicense();
        const sd = await BIDSDK.getSD();

        
        let req = {
          ...optionsRequest,
          dns: tenant.dns,
          communityId: communityInfo.community.id,
          tenantId: communityInfo.tenant.id
        }
    
        let headers = {
          'Content-Type': 'application/json',
          'charset': 'utf-8',
          
          licensekey: licenseKey,
          requestid: uuidv4()
        }
    
        let api_respose = await fetch(sd.webauthn + "/assertion/options", {
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

const submitAssertionResult = async(resultRequest) => {
    try {
        const communityInfo = await BIDSDK.getCommunityInfo();
        const tenant        = BIDSDK.getTenant();
        const keySet = BIDSDK.getKeySet();
        const licenseKey = BIDSDK.getLicense();
        const sd = await BIDSDK.getSD();

        let req = {
          ...resultRequest,
          dns: tenant.dns,
          communityId: communityInfo.community.id,
          tenantId: communityInfo.tenant.id
        }
    

    
        let headers = {
          'Content-Type': 'application/json',
          'charset': 'utf-8',
          licensekey: licenseKey,
          requestid: uuidv4()
        }
    
        let api_respose = await fetch(sd.webauthn + "/assertion/result", {
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
    getPublickey,
    fetchAttestationOptions,
    submitAttestationResult,
    fetchAssertionOptions,
    submitAssertionResult
  }
  