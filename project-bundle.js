

// ===== FILE: address/index.js =====
import fs from "fs";
import Identity from "../identity/index.js";

export default class Addres {
  #pk = null;

  store(path = "") {
    fs.writeFileSync(
      path,
      JSON.stringify([Buffer.from(this.#pk, "utf-8")]),
      "utf-8"
    );
  }

  load(path) {
    try {
      this.#pk = Buffer.from(
        JSON.parse(fs.readFileSync(path, "utf-8"))[0],
        "utf-8"
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  set(addr) {
    this.#pk = addr;
  }

  get() {
    return this.#pk;
  }

  fromIdentity(identity = new Identity()) {
    this.#pk = identity.addr;
  }

  constructor(pk) {
    this.set(pk);
  }
}


// ===== FILE: broadcast-net/index.js =====
import WebSocket, { WebSocketServer } from "ws";
import { Buffer } from "buffer";
import crypto from "crypto";

export class Node {
  #port;
  #bootstrap;
  #onPocket;
  #peers;
  #knownMessages;
  #maxConnections = 10;
  #maxPeers = 100;
  #server;

  constructor({
    port = 8080,
    bootstrap = [],
    onPocket = (data = new Buffer()) => {},
  }) {
    this.#port = port;
    this.#bootstrap = bootstrap;
    this.#onPocket = onPocket;

    this.#peers = new Map();
    this.#knownMessages = new Set();

    this.#startServer();
    this.#connectToBootstrap();
  }

  #startServer() {
    this.#server = new WebSocketServer({ port: this.#port });
    this.#server.on("connection", (ws) => {
      this.#addPeer(ws);
      ws.on("message", (data) => this.#handleMessage(ws, data));
      ws.on("close", () => this.#removePeer(ws));
    });
  }

  #connectToBootstrap() {
    for (const url of this.#bootstrap) {
      if (this.#peers.size >= this.#maxConnections) break;
      this.#connectToPeer(url);
    }
  }

  #connectToPeer(url) {
    if (this.#peers.has(url)) return;
    const ws = new WebSocket(url);
    ws.on("open", () => {
      this.#addPeer(ws, url);
    });
    ws.on("message", (data) => this.#handleMessage(ws, data));
    ws.on("close", () => this.#removePeer(ws));
    ws.on("error", () => this.#removePeer(ws));
  }

  #addPeer(ws, id = crypto.randomUUID()) {
    if (this.#peers.size >= this.#maxPeers) {
      ws.close();
      return;
    }
    this.#peers.set(id, ws);
  }

  #removePeer(ws) {
    for (const [id, peer] of this.#peers.entries()) {
      if (peer === ws) {
        this.#peers.delete(id);
        break;
      }
    }
  }

  #handleMessage(sender, data) {
    if (!(data instanceof Buffer)) data = Buffer.from(data);
    const id = data.subarray(0, 16).toString("hex");
    if (this.#knownMessages.has(id)) return;
    this.#knownMessages.add(id);
    if (this.#knownMessages.size > 1000) {
      this.#knownMessages.delete(this.#knownMessages.values().next().value);
    }

    const payload = data.subarray(16);
    this.#onPocket(payload);

    for (const peer of this.#peers.values()) {
      if (peer !== sender && peer.readyState === WebSocket.OPEN) {
        peer.send(data);
      }
    }
  }

  send(buffer) {
    if (!(buffer instanceof Buffer)) throw new Error("Only Buffer supported");
    const id = crypto.randomBytes(16);
    const packet = Buffer.concat([id, buffer]);
    this.#handleMessage(null, packet);
  }
}


// ===== FILE: bundle-project.js =====
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC_DIR = path.resolve(__dirname); // project root
const OUTPUT_FILE = path.resolve(__dirname, "project-bundle.js");

function parseGitignore(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function shouldIgnore(relPath, ignoreRules) {
  return ignoreRules.some((pattern) => {
    if (pattern.endsWith("/")) {
      return relPath.startsWith(pattern.slice(0, -1) + "/");
    }
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\./g, "\\.") + "$"
      );
      return regex.test(relPath);
    }
    return relPath === pattern;
  });
}

function collectFiles(dir, base, ignoreRules, files = []) {
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const relPath = path.relative(base, fullPath).replace(/\\/g, "/");

    if (shouldIgnore(relPath, ignoreRules)) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, base, ignoreRules, files);
    } else {
      files.push({ path: fullPath, relPath });
    }
  }
  return files;
}

function bundleProject() {
  const ignoreRules = parseGitignore(path.join(SRC_DIR, ".gitignore"));
  const files = collectFiles(SRC_DIR, SRC_DIR, ignoreRules);

  let bundle = "";

  for (const file of files) {
    const ext = path.extname(file.path);
    if (![".js", ".json", ".html", ".css", ".txt", ".md"].includes(ext))
      continue;

    const content = fs.readFileSync(file.path, "utf-8");

    bundle += `\n\n// ===== FILE: ${file.relPath} =====\n`;
    bundle += content;
  }

  fs.writeFileSync(OUTPUT_FILE, bundle, "utf-8");
  console.log(`✅ Project bundled to ${OUTPUT_FILE}`);
}

bundleProject();


// ===== FILE: crypto/index.js =====
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

export function encSym(key, iv, data) {
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([enc, cipher.getAuthTag()]);
}

export function decSym(key, iv, encryptedDataWithTag) {
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


// ===== FILE: crypto/test.js =====
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

const message = Buffer.from("Top secret data!");

// --- RSA-OAEP Encrypt/Decrypt ---
console.log("🔐 RSA-OAEP Encrypt/Decrypt");
const { publicKey, privateKey } = generateKeyPair();

console.log(publicKey);

console.log(privateKey);

const rsaEncrypted = publicEncrypt(publicKey, message);

console.log(rsaEncrypted);

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


// ===== FILE: identity/index.js =====
import { buffer } from "stream/consumers";
import { generateKeyPair, hash } from "../crypto/index.js";
import fs from "fs";
import Addres from "../address/index.js";

export default class Identity {
  pk = null;
  sk = null;
  addr = null;

  generate() {
    const { publicKey, privateKey } = generateKeyPair();
    this.pk = publicKey;
    this.sk = privateKey;
    this.addr = hash(this.pk);
  }

  isValidate() {
    return pk && sk && addr;
  }

  toString() {
    return JSON.stringify([
      Buffer.from(this.pk).toString("utf-8"),
      Buffer.from(this.sk).toString("utf-8"),
    ]);
  }

  fromString(str = "") {
    const [pk, sk] = JSON.parse(str);
    this.pk = Buffer.from(pk, "utf-8");
    this.sk = Buffer.from(sk, "utf-8");
    this.addr = hash(pk);
  }

  store(path = "") {
    fs.writeFileSync(path, this.toString(), "utf-8");
  }

  load(path) {
    try {
      this.fromString(fs.readFileSync(path, "utf-8"));
      return true;
    } catch (error) {
      console.error(error);

      return false;
    }
  }

  set(identity = "") {
    this.fromString(identity);
  }

  get() {
    return this.toString();
  }

  toAddress() {
    return new Addres(this.pk);
  }
}


// ===== FILE: index.js =====
import Addres from "./address/index.js";
import NetNode from "./node/index.js";

const port = parseInt(process.env.PORT || "8082", 10);
const bootstrap = process.argv.slice(2) || []; // <- Neue Bootstrap-URLs aus Kommandozeile

const nn = new NetNode({
  port,
  bootstrap,
});

const identityPath = "./idenetys/" + port + ".txt";

if (!nn.identity.load(identityPath)) {
  console.log("gen");

  nn.identity.generate();
}
nn.identity.store(identityPath);

console.log(identityPath);

nn.start();

nn.onData = (addr, data) => {
  console.log(`${addr}, ${data}`);
};

if (port == 8082) {
  const address = new Addres();

  address.load("./idenetys/8081.txt");

  nn.send(address, Buffer.from("data"));
}


// ===== FILE: node/index.js =====
import { Node } from "../broadcast-net/index.js";
import { encSym, generateAESKeyIV, publicEncrypt } from "../crypto/index.js";
import Identity from "../identity/index.js";

export default class NetNode {
  identity = new Identity();
  #dataStack = [];

  constructor({ port = 11277, bootstrap = [] }) {
    this.node = new Node({
      port,
      bootstrap,
      onPocket: (data) => {
        console.log(`(${port}) Received:`, data.toString());
      },
    });
  }

  send(addr, data) {
    this.#dataStack.push([addr, data]);
  }

  onData(addr, data) {}

  update() {
    const msg = this.#dataStack.shift();

    if (!msg) {
      this.node.send(Buffer.from("Hi >> " + Math.random()));
      return;
    }

    const [addr, data] = [msg[0].get(), msg[1]];

    const key = generateAESKeyIV();

    const binaryKey = Buffer.concat([key.key, key.iv]);

    console.log("binaryKey", binaryKey);

    console.log("addr", addr);

    const decKey = publicEncrypt(addr, binaryKey);

    console.log("decKey", decKey);

    this.node.send(
      Buffer.from(
        `${Buffer.from(decKey, "base64")}\n${Buffer.from(
          encSym(key.key, key.iv, data),
          "base64"
        )}`,
        "utf-8"
      )
    );
  }

  start() {
    this.loop = setInterval(() => {
      this.update();
    }, 2000);
  }

  pause() {
    clearInterval(this.loop);
  }
}


// ===== FILE: package-lock.json =====
{
  "name": "undercover",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "undercover",
      "version": "1.0.0",
      "license": "ISC",
      "dependencies": {
        "ws": "^8.18.3"
      }
    },
    "node_modules/ws": {
      "version": "8.18.3",
      "resolved": "https://registry.npmjs.org/ws/-/ws-8.18.3.tgz",
      "integrity": "sha512-PEIGCY5tSlUt50cqyMXfCzX+oOPqN0vuGqWzbcJ2xvnkzkq46oOpz7dQaTDBdfICb4N14+GARUDw2XV2N4tvzg==",
      "engines": {
        "node": ">=10.0.0"
      },
      "peerDependencies": {
        "bufferutil": "^4.0.1",
        "utf-8-validate": ">=5.0.2"
      },
      "peerDependenciesMeta": {
        "bufferutil": {
          "optional": true
        },
        "utf-8-validate": {
          "optional": true
        }
      }
    }
  }
}


// ===== FILE: package.json =====
{
  "name": "undercover",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "ws": "^8.18.3"
  }
}


// ===== FILE: pocket/index.js =====
export default class Pocket {}


// ===== FILE: utils/index.js =====
