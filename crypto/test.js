import {
  generateKeyPair,
  publicEncrypt,
  privateDecrypt,
  privateEncrypt,
  publicDecrypt,
  encSym,
  decSym,
  sign,
  verify,
  hash,
  generateAESKeyIV,
} from "./index.js";

const message = Buffer.from("Top secret data");

// --- RSA-OAEP Encrypt/Decrypt ---
console.log("🔐 RSA-OAEP Encrypt/Decrypt");
const { publicKey, privateKey } = generateKeyPair();

const rsaEncrypted = publicEncrypt(publicKey, message);
const rsaDecrypted = privateDecrypt(privateKey, rsaEncrypted);
console.log("Decrypted:", rsaDecrypted.toString());
console.log();

// --- RSA Sign/Verify ---
console.log("✍️ RSA Sign/Verify");
const signature = sign(privateKey, message);
const valid = verify(publicKey, message, signature);
console.log("Signature valid:", valid);
console.log();

// --- RSA Private Encrypt / Public Decrypt (rare use case) ---
console.log("🔏 RSA Private Encrypt / Public Decrypt (manual signature-like)");
const privEnc = privateEncrypt(privateKey, message);
const pubDec = publicDecrypt(publicKey, privEnc);
console.log("Private-encrypted / Public-decrypted:", pubDec.toString());
console.log();

// --- AES-GCM Symmetric Encryption ---
console.log("🧪 AES-GCM Symmetric Encryption");
const { key, iv } = generateAESKeyIV();
const aesEncrypted = encSym(key, iv, message);
const aesDecrypted = decSym(key, iv, aesEncrypted);
console.log("AES Decrypted:", aesDecrypted.toString());
console.log();

// --- SHA-256 Hash ---
console.log("🔁 SHA-256 Hash");
const digest = hash(message);
console.log("Hash:", digest.toString("hex"));
console.log();
