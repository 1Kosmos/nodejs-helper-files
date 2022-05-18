/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
"use strict";
const { v4: uuidv4 } = require('uuid');
const BIDSDK = require('./BIDSDK');
const fetch = require('node-fetch');

const fetchAttestationOptions = async (optionsRequest) => {
  try {
    const communityInfo = await BIDSDK.getCommunityInfo();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();

    let req = {
      ...optionsRequest,
      communityId: communityInfo.community.id,
      tenantId: communityInfo.tenant.id
    }

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',

      licensekey: licenseKey,
      requestid: uuidv4()
    }

    let api_respose = await fetch(sd.webauthn + "/u1/attestation/options", {
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

const submitAttestationResult = async (resultRequest) => {
  try {
    const communityInfo = await BIDSDK.getCommunityInfo();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();

    let req = {
      ...resultRequest,
      communityId: communityInfo.community.id,
      tenantId: communityInfo.tenant.id
    }

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',
      licensekey: licenseKey,
      requestid: uuidv4()
    }

    let api_respose = await fetch(sd.webauthn + "/u1/attestation/result", {
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

const fetchAssertionOptions = async (optionsRequest) => {
  try {
    const communityInfo = await BIDSDK.getCommunityInfo();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();

    let req = {
      ...optionsRequest,
      communityId: communityInfo.community.id,
      tenantId: communityInfo.tenant.id
    }

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',

      licensekey: licenseKey,
      requestid: uuidv4()
    }

    let api_respose = await fetch(sd.webauthn + "/u1/assertion/options", {
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

const submitAssertionResult = async (resultRequest) => {
  try {
    const communityInfo = await BIDSDK.getCommunityInfo();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();

    let req = {
      ...resultRequest,
      communityId: communityInfo.community.id,
      tenantId: communityInfo.tenant.id
    }

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',
      licensekey: licenseKey,
      requestid: uuidv4()
    }

    let api_respose = await fetch(sd.webauthn + "/u1/assertion/result", {
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
  fetchAttestationOptions,
  submitAttestationResult,
  fetchAssertionOptions,
  submitAssertionResult
}
