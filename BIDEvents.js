'use strict';

const httpStatus = require('http-status');
const WTM = require('./WTM');

const BIDECDSA = require('./BIDECDSA');
const BIDTenant = require('./BIDTenant');

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
        throw { status: httpStatus.NOT_FOUND, messages: 'No public key found' };
    }
    return ret;
};

const logEvent = async (tenantInfo, eventName, data, requestId) => {
    try {

        const communityInfo = await BIDTenant.getCommunityInfo(tenantInfo);
        const keySet = BIDTenant.getKeySet();
        const licenseKey = tenantInfo.licenseKey;
        const sd = await BIDTenant.getSD(tenantInfo);

        let eventsPublicKey = await getPublicKey(sd.events);

        let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, eventsPublicKey);
        const encryptedData = BIDECDSA.encrypt(JSON.stringify(data), sharedKey);

        let api_response = await WTM.executeRequest({
            method: 'put',
            url: `${sd.events}/tenant/${communityInfo.tenant.id}/community/${communityInfo.community.id}/event/${eventName}`,
            headers: {
                'Content-Type': 'application/json',
                charset: 'utf-8',
                publickey: keySet.pKey,
                requestid: BIDECDSA.encrypt(JSON.stringify(requestId), sharedKey),
                licensekey: BIDECDSA.encrypt(licenseKey, sharedKey)
            },
            body: {
                data: encryptedData
            },
            requestID: requestId,
            keepAlive: true
        });
        return api_response.json;
    } catch (error) {
        return error
    }
};

module.exports = {
    logEvent,
};
