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

let keySet = null;

const getKeySet = () => {

    if (keySet) {
        return keySet;
    }

    let keys = BIDECDSA.generateKeyPair();
    
    keySet = {
        prKey: keys[0],
        pKey: keys[1]
    };

    return keySet
}

const setKeySet = (prKey, pKey) => {
    keySet = {
        prKey,
        pKey
    };
    return keySet;
}

const getCommunityInfo = async (tenantInfo) => {
    try {
        let communityInfo = null;
        let req = {};
        let communityCacheKey = `communityCache_${tenantInfo.dns}`;

        if (tenantInfo.tenantId) {
            req.tenantId = tenantInfo.tenantId;
            communityCacheKey = `${communityCacheKey}_${tenantInfo.tenantId}`;
        }
        else {
            req.dns = tenantInfo.dns;
        }

        if (tenantInfo.communityId) {
            req.communityId = tenantInfo.communityId;
            communityCacheKey = `${communityCacheKey}_${tenantInfo.communityId}`;
        }
        else {
            req.communityName = tenantInfo.communityName;
            communityCacheKey = `${communityCacheKey}_${tenantInfo.communityName}`;
        }

        let communityInfoCache = cache.get(communityCacheKey);

        if (communityInfoCache) {
            return communityInfoCache;
        }

        let url = "https://" + tenantInfo.dns + "/api/r1/system/community_info/fetch";

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

        cache.set(communityCacheKey, communityInfo);

        return communityInfo;
    } catch (error) {
        throw error;
    }
}

const getSD = async (tenantInfo) => {
    try {

        let sdCacheKey = `sdCache_${tenantInfo.dns}`;

        if (tenantInfo.tenantId) {
            sdCacheKey = `${sdCacheKey}_${tenantInfo.tenantId}`;
        }

        if (tenantInfo.communityId) {
            sdCacheKey = `${sdCacheKey}_${tenantInfo.communityId}`;
        } else {
            sdCacheKey = `${sdCacheKey}_${tenantInfo.communityName}`;
        }

        let sdCache = cache.get(sdCacheKey);

        if (sdCache) {
            return sdCache;
        }

        let sdUrl = "https://" + tenantInfo.dns + "/caas/sd";

        let sd = null;

        let api_respose = await fetch(sdUrl, {
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
        cache.set(sdCacheKey, sd);
        return sd;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    getCommunityInfo,
    getSD,
    setKeySet,
    getKeySet
}
