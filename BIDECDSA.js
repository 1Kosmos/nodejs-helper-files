/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License. 
 * You may obtain a copy of this license at 
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
const crypto = require('crypto');
const ALGO = 'aes-256-gcm';
const ethers = require('ethers');
const jwkToPem = require('jwk-to-pem');

//ref original https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81

module.exports = {
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
      const set1 = crypto.createECDH('secp256k1');
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
    const set1 = crypto.createECDH('secp256k1');
    set1.generateKeys()

    let prKey = set1.getPrivateKey().toString('base64')
    let pKey = Buffer.from(set1.getPublicKey().toString('hex').substr(2), 'hex').toString("base64")

    return [prKey, pKey];
  },

  createWallet: function () {
    const wallet = ethers.Wallet.createRandom();

    const { address, mnemonic } = wallet;
    const { privateKey } = wallet.signingKey;

    // Compute **uncompressed** public key (65 bytes, 0x04 prefix)
    const uncompressedPublicKey = ethers.SigningKey.computePublicKey(privateKey, false);

    const privateKeyBytes = ethers.getBytes(privateKey);
    let publicKeyBytes = ethers.getBytes(uncompressedPublicKey);

    // Drop the 0x04 prefix if needed (like in your v5 logic)
    if (publicKeyBytes.length > 64) {
      publicKeyBytes = publicKeyBytes.slice(1);
    }

    const privateKeyBase64 = ethers.encodeBase64(privateKeyBytes);
    const publicKeyBase64 = ethers.encodeBase64(publicKeyBytes);

    const did = address.startsWith("0x") ? address.slice(2).toLowerCase() : address.toLowerCase();

    return {
      did,
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64,
      mnemonic: mnemonic.phrase
    };
  },

  toBase64Url: function (buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  
  toJwkPrivateKey: function(privateKeyBase64, publicKeyBase64) {
    const pub = Buffer.from(publicKeyBase64, 'base64');
    return {
      kty: 'EC',
      crv: 'secp256k1',
      d: toBase64Url(Buffer.from(privateKeyBase64, 'base64')),
      x: toBase64Url(pub.slice(0, 32)),
      y: toBase64Url(pub.slice(32, 64)),
    };
  },
  
  toJwkPublicKey: function (publicKeyBase64) {
    const pub = Buffer.from(publicKeyBase64, 'base64');
    return {
      kty: 'EC',
      crv: 'secp256k1',
      x: toBase64Url(pub.slice(0, 32)),
      y: toBase64Url(pub.slice(32, 64)),
    };
  },
  
  sign: function(data, privateKeyBase64, publicKeyBase64) {
    const jwk = toJwkPrivateKey(privateKeyBase64, publicKeyBase64);
    const pem = jwkToPem(jwk, { private: true });

    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();

    const signature = sign.sign({ key: pem, dsaEncoding: 'ieee-p1363' });
    return signature.toString('base64');
  },
  
  verify: function(data, signatureBase64, publicKeyBase64) {
    try{
      const jwk = toJwkPublicKey(publicKeyBase64);
      const pem = jwkToPem(jwk);
    
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();
    
      const signature = Buffer.from(signatureBase64, 'base64');
      return verify.verify({ key: pem, dsaEncoding: 'ieee-p1363' }, signature);
    } catch (error){
      throw error;
    }
  }
}