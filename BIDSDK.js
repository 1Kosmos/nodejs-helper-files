/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */

"use strict";
const NodeCache = require('node-cache');
const BIDECDSA = require('./BIDECDSA');
const fetch = require('node-fetch');

const cache = new NodeCache({ stdTTL: 10 * 60 });

let tenant = {
  dns: '1k-dev.1kosmos.net',
  communityName: 'default'
};

let loaded = false;

let communityInfo = null;
let sd = null;

let licenseKey = "";

let keySet = null;

const setupTenant = async (obj, license) => {
    loaded = false;
    communityInfo = null;//clear out.
    sd = null;
    tenant = obj;
    licenseKey = license;
    
    if (!keySet) {
      let keys = BIDECDSA.generateKeyPair();
      keySet = {
        prKey: keys[0],
        pKey: keys[1]
      };
    }

    await loadCommunityInfo();

    loaded = true;
    return true;
}

const isLoaded =() => {
  return loaded;
}

const getTenant = () => {
  return tenant;
}

const getSD = () => {
  let sdUrl = "https://" + tenant.dns + "/caas/sd";
  let sdCache = cache.get(sdUrl);
  if (!sdCache) {
    return loadSD(sdUrl);
  }

  return sdCache;
}

const getKeySet = () => {
  return keySet;
}

const setKeySet = (prKey, pKey) => {
  keySet = {
    prKey,
    pKey
  };
  return keySet;
}

const getCommunityInfo = () => {
  let url = "https://" + tenant.dns + "/api/r1/system/community_info/fetch";
  let communityInfoCache = cache.get(url);

  if (!communityInfoCache) {
    return loadCommunityInfo();
  }

  return communityInfoCache;
}

const getLicense = () => {
  return licenseKey;
}

const loadCommunityInfo = async () => {
  try {
    communityInfo = null;
    let url = "https://" + tenant.dns + "/api/r1/system/community_info/fetch";

    let req = {};
    if (tenant.tenantId) {
      req.tenantId = tenant.tenantId;
    }
    else {
      req.dns = tenant.dns;
    }

    if (tenant.communityId) {
      req.communityId = tenant.communityId;
    }
    else {
      req.communityName = tenant.communityName;
    }

    let api_respose = await fetch(url, {
      method: 'post',
      body: JSON.stringify(req),
      headers: {
        'Content-Type': 'application/json',
        'charset': 'utf-8'
      }
    });

    if (api_respose) {
      api_respose = await api_respose.json();
      if (api_respose.tenant && api_respose.community) {
        communityInfo = api_respose;
      }
    }

    let sdUrl = "https://" + tenant.dns + "/caas/sd";
    cache.set(url, communityInfo);

    sd = await loadSD(sdUrl);

    return communityInfo;
  } catch (error) {
    throw error;
  }
}

const loadSD = async (url) => {
  try {
    sd = null;
    let api_respose = await fetch(url, {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        'charset': 'utf-8'
      }
    });

    if (api_respose) {
      api_respose = await api_respose.json();
      if (api_respose.licenses) {
        sd = api_respose;
      }
    }
    cache.set(url, sd);
    return sd;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  setupTenant,
  getSD,
  getKeySet,
  getTenant,
  getCommunityInfo,
  getLicense,
  isLoaded,
  setKeySet
}
