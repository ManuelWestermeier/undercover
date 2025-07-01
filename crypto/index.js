// cryptoLib.mjs
import {
  generateKeyPairSync,
  publicEncrypt as rsaPubEnc,
  privateDecrypt as rsaPrivDec,
  privateEncrypt as rsaPrivEnc,
  publicDecrypt as rsaPubDec,
  createPublicKey,
  createPrivateKey,
  createCipheriv,
  createDecipheriv,
  createSign,
  createVerify,
  createHash,
  randomBytes,
  constants,
} from "crypto";

const RSA_KEY_OPTIONS = {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "der" },
  privateKeyEncoding: { type: "pkcs8", format: "der" },
};

export function generateKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", RSA_KEY_OPTIONS);
  return {
    publicKey: Buffer.from(publicKey),
    privateKey: Buffer.from(privateKey),
  };
}

export function publicEncrypt(publicKeyDer, value) {
  const publicKey = createPublicKey({
    key: publicKeyDer,
    format: "der",
    type: "spki",
  });
  return rsaPubEnc(
    { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING },
    value
  );
}

export function privateDecrypt(privateKeyDer, value) {
  const privateKey = createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });
  return rsaPrivDec(
    { key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING },
    value
  );
}

export function privateEncrypt(privateKeyDer, value) {
  const privateKey = createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });
  return rsaPrivEnc(
    { key: privateKey, padding: constants.RSA_PKCS1_PADDING },
    value
  );
}

export function publicDecrypt(publicKeyDer, value) {
  const publicKey = createPublicKey({
    key: publicKeyDer,
    format: "der",
    type: "spki",
  });
  return rsaPubDec(
    { key: publicKey, padding: constants.RSA_PKCS1_PADDING },
    value
  );
}

export function encSyn(key, iv, data) {
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([enc, cipher.getAuthTag()]);
}

export function decSyn(key, iv, encryptedDataWithTag) {
  const tag = encryptedDataWithTag.slice(-16);
  const encrypted = encryptedDataWithTag.slice(0, -16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function sign(privateKeyDer, message) {
  const privateKey = createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });
  const signer = createSign("sha256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKey);
}

export function verify(publicKeyDer, message, signature) {
  const publicKey = createPublicKey({
    key: publicKeyDer,
    format: "der",
    type: "spki",
  });
  const verifier = createVerify("sha256");
  verifier.update(message);
  verifier.end();
  return verifier.verify(publicKey, signature);
}

export function hash(data) {
  return createHash("sha256").update(data).digest();
}

export function generateAESKeyIV() {
  return {
    key: randomBytes(32),
    iv: randomBytes(12),
  };
}
