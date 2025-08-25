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
    return buf
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  },

  base64ToBuffer(base64) {
    return Buffer.from(base64, "base64");
  },

  privateKeyRawToPEM: function (privateKeyBase64) {
    const privBuf = this.base64ToBuffer(privateKeyBase64);
    if (privBuf.length !== 32) throw new Error("Invalid private key length");

    const ecPrivateKeyDER = Buffer.concat([
      Buffer.from("302e0201010420", "hex"),
      privBuf,
      Buffer.from("a00706052b8104000a", "hex"),
    ]);

    return crypto.createPrivateKey({
      key: ecPrivateKeyDER,
      format: "der",
      type: "sec1",
    });
  },

  // Convert raw 64-byte public key → SubjectPublicKeyInfo (DER)
  publicKeyRawToPEM: function (publicKeyBase64) {
    const pubBuf = this.base64ToBuffer(publicKeyBase64);
    if (pubBuf.length !== 64) throw new Error("Invalid public key length");

    const uncompressed = Buffer.concat([Buffer.from([0x04]), pubBuf]); // prepend 0x04

    const publicKeyDER = Buffer.concat([
      Buffer.from("3056301006072a8648ce3d020106052b8104000a034200", "hex"),
      uncompressed,
    ]);

    return crypto.createPublicKey({
      key: publicKeyDER,
      format: "der",
      type: "spki",
    });
  },

  // Convert raw r||s signature (64 bytes) → DER ECDSA signature
  rawSignatureToDER: function (sigBase64) {
    const sigBuf = this.base64ToBuffer(sigBase64);
    if (sigBuf.length !== 64) throw new Error("Invalid raw signature length");

    const r = sigBuf.slice(0, 32);
    const s = sigBuf.slice(32);

    function trimLeadingZeros(buf) {
      let i = 0;
      while (i < buf.length - 1 && buf[i] === 0) i++;
      return buf.slice(i);
    }

    function encodeInteger(buf) {
      buf = trimLeadingZeros(buf);
      // Add leading zero if high bit is set
      if (buf[0] & 0x80) buf = Buffer.concat([Buffer.from([0x00]), buf]);
      return Buffer.concat([Buffer.from([0x02, buf.length]), buf]);
    }

    const rEncoded = encodeInteger(r);
    const sEncoded = encodeInteger(s);
    const seqLen = rEncoded.length + sEncoded.length;
    return Buffer.concat([Buffer.from([0x30, seqLen]), rEncoded, sEncoded]);
  },

  sign(message, privateKeyBase64) {
    const privateKey = this.privateKeyRawToPEM(privateKeyBase64);
    const sign = crypto.createSign("SHA256");
    sign.update(message);
    sign.end();
    return sign.sign(privateKey).toString("base64");
  },

  verify(message, signatureBase64, publicKeyBase64) {
    let signature = this.base64ToBuffer(signatureBase64);
    // Auto-detect raw signature (64 bytes) and convert to DER
    if (signature.length === 64) {
        signature = this.rawSignatureToDER(signatureBase64);
    }

    const publicKey = this.publicKeyRawToPEM(publicKeyBase64);
    const verify = crypto.createVerify("SHA256");
    verify.update(message);
    verify.end();
    return verify.verify(publicKey, signature);
  },
};
