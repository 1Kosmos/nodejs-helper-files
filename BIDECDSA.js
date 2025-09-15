/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
const crypto = require('crypto');
const ALGO = 'aes-256-gcm';
const { v4: uuidv4 } = require('uuid');
const bip39 = require('bip39');

const BIDCaas = require('./BIDCaas');
let ecCurveName = null;

//ref original https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81

module.exports = {
  getECCurveName: async function getECCurveName() {
    if (ecCurveName) {
      return ecCurveName;
    }
    if (process.env.EC_CURVE_NAME) {
      ecCurveName = process.env.EC_CURVE_NAME;
      return ecCurveName;
    }

    const envData = await BIDCaas.getEnvironment();
    if (envData.EC_CURVE_NAME) {
      ecCurveName = envData.EC_CURVE_NAME;
      return ecCurveName;
    }

    console.debug('[ALERT] EC_CURVE_NAME not configured, defaulting to secp256k1');
    ecCurveName = 'secp256k1';
    return ecCurveName;
  },
  ecdsaHelper: function (method, str, key) {
    if (method === "encrypt") {
      return this.encrypt(str, key)
    }

    if (method === "decrypt") {
      return this.decrypt(str, key)
    }

    return ""
  },

  encrypt: function (str, key64) {
    const key = Buffer.from(key64, 'base64')
    var iv;
    {
      const iv_bytes = crypto.randomBytes(16)
      iv = Buffer.from(iv_bytes, 'utf8')
    }

    const cipher = crypto.createCipheriv(ALGO, key, iv);

    let enc_b64 = cipher.update(str, 'utf8', 'base64');
    enc_b64 += cipher.final('base64');

    const enc_bytes = Buffer.from(enc_b64, 'base64')
    const authTagBytes = cipher.getAuthTag()
    //concat iv, enc_bytes, authTag

    const resultBuffer = Buffer.concat([iv, enc_bytes, authTagBytes])
    const resultB64 = resultBuffer.toString("base64")

    return resultB64
  },

  decrypt: function (enc_b64, key64) {
    const key = Buffer.from(key64, 'base64')

    var enc_buffer = Buffer.from(enc_b64, 'base64')
    const iv = enc_buffer.slice(0, 16)
    const authTag = enc_buffer.slice(enc_buffer.length - 16, enc_buffer.length)

    enc_buffer = enc_buffer.slice(iv.length, (enc_buffer.length - authTag.length))
    const enc = enc_buffer.toString('base64')

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    let str = decipher.update(enc, 'base64', 'utf8');
    str += decipher.final('utf8');
    return str;
  },

  createSharedKey: function (prKey, pKey64) {
    try {
      const set1 = crypto.createECDH(ecCurveName);
      set1.setPrivateKey(Buffer.from(prKey, 'base64'))
      /* convert other party's public key to encryption public key : ref php code */
      var ret = ""
      {
        const pBuffer = Buffer.from(pKey64, 'base64')
        const pHex = "04" + pBuffer.toString('hex')

        ret = set1.computeSecret(pHex, 'hex', 'base64')
      }

      return ret

    }
    catch (error) {
      throw error
    }
  },

  generateKeyPair: function () {
    const set1 = crypto.createECDH(ecCurveName);
    set1.generateKeys()

    let prKey = set1.getPrivateKey().toString('base64')
    let pKey = Buffer.from(set1.getPublicKey().toString('hex').substr(2), 'hex').toString("base64")

    return [prKey, pKey];
  },

  createWallet: function () {
    const [prKey, pKey] = this.generateKeyPair();
    const mnemonic = bip39.generateMnemonic();
    return {
      did: uuidv4(),
      publicKey: pKey,
      privateKey: prKey,
      mnemonic
    };
  }
};
