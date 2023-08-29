/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */

"use strict";
const fetch = require('node-fetch');

const BIDTenant = require('./BIDTenant');
const WTM = require('./WTM');

const requestAuthorizationCode = async (tenantInfo, proofOfAuthenticationJwt, clientId, responseType, scope, redirectUri, stateOrNull, nonceOrNull) => {
    try {
        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const sd = await BIDTenant.getSD(tenantInfo);

        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'charset': 'utf-8',
            'Accept': "application/json"
        }

        let req = {
            client_id: clientId,
            proof_of_authentication_jwt: proofOfAuthenticationJwt,
            response_type: responseType,
            scope,
            redirect_uri: redirectUri
        };

        if (stateOrNull !== null) {
            req.state = stateOrNull;
        }

        if (nonceOrNull !== null) {
            req.nonce = nonceOrNull;
        }

        let api_response = await fetch(sd.oauth2 + "/community/" + communityInfo.community.name + "/v1/authorize", {
            method: 'post',
            body: new URLSearchParams(req),
            headers,
            redirect: 'manual'
        });

        let status = api_response.status;

        if (status !== 200 && status !== 303) {
            return await api_response.json();
        }

        let location = api_response.headers.get('location');

        let searchParams = new URLSearchParams(new URL(location).searchParams);

        if (searchParams.get("error")) {
            return { statusCode: 400, message: searchParams.get("error_description") };
        }

        api_response = { statusCode: status, url: location };

        return api_response;

    } catch (error) {
        throw error;
    }
}

const requestToken = async (tenantInfo, clientId, clientSecret, grantType, redirectUri, codeOrNull, refreshTokenOrNull) => {
    try {
        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const sd = await BIDTenant.getSD(tenantInfo);

        let auth = 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64');

        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'charset': 'utf-8',
            'Authorization': auth
        }

        let req = {
            grant_type: grantType,
            redirect_uri: redirectUri
        };

        if(codeOrNull !== null) {
            req.code = codeOrNull;
        }

        if(refreshTokenOrNull !== null) {
            req.refresh_token = refreshTokenOrNull;
        }

        let api_response = await WTM.executeRequest({
            method: 'post',
            url: sd.oauth2 + "/community/" + communityInfo.community.name + "/v1/token",
            headers,
            urlSearchParams: new URLSearchParams(req),
            keepAlive: true
        });

        let status = api_response.status;

        api_response = api_response.json;
        api_response.status = status;

        return api_response;

    } catch (error) {
        throw error;
    }
}

module.exports = {
    requestAuthorizationCode,
    requestToken
}
