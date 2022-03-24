"use strict";
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');

const BIDECDSA = require('./BIDECDSA');
const BIDSDK = require('./BIDSDK');
const fetch = require('node-fetch');

const cache = new NodeCache({ stdTTL: 10 * 60 });

const getDocVerifyPublicKey = async () => {
  try {
    const sd = await BIDSDK.getSD();
    console.log('sd:', sd);
    let docVerifyPublicKeyCache = cache.get(sd.docuverify + "/publickeys");

    if (docVerifyPublicKeyCache) {
      return docVerifyPublicKeyCache;
    }

    let headers = {
      'Content-Type': 'application/json',
      'charset': 'utf-8',
    }

    let api_response = await fetch(sd.docuverify + "/publickeys", {
      method: 'get',
      headers: headers
    });

    let ret = null;
    if (api_response) {
      api_response = await api_response.json();
      ret = api_response.publicKey;
      cache.set(sd.docuverify + "/publickeys", ret);
    }

    return ret;
  } catch (error) {
    throw error;
  }
}

const verifyDocument = async (dvcId, verifications, document) => {
  try {
    console.log('dvcId:', dvcId);
    console.log('verifications:', verifications);
    console.log('document:', document)
    const keySet = BIDSDK.getKeySet();
    const licenseKey = BIDSDK.getLicense();
    const sd = await BIDSDK.getSD();
    const docVerifyPublicKey = await getDocVerifyPublicKey();

    let sharedKey = BIDECDSA.createSharedKey(keySet.prKey, docVerifyPublicKey);

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

    const encryptedRequestData = BIDECDSA.encrypt(
      JSON.stringify({
        dvcID: dvcId,
        verifications,
        document
      }),
      sharedKey
    );

    let api_response = await fetch(sd.docuverify + "/verify", {
      method: 'post',
      body: JSON.stringify({ data: encryptedRequestData }),
      headers: headers
    });

    let ret = null;
    if (api_response) {
      api_response = await api_response.json();
      let dec_data = api_response.data ? JSON.parse(BIDECDSA.decrypt(api_response.data, sharedKey)) : api_response;
      ret = dec_data;
    }
    return ret;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  verifyDocument
}
