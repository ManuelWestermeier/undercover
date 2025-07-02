import { Node } from "../broadcast-net/index.js";
import {
  encSym,
  decSym,
  generateAESKeyIV,
  hash,
  publicEncrypt,
  privateDecrypt,
} from "../crypto/index.js";
import Identity from "../identity/index.js";
import crypto from "crypto";

const FIXED_PAYLOAD_SIZE = 1024;
const PUBKEY_SIZE = 512;
const ADDR_HASH_SIZE = 32;
const ENC_KEY_SIZE = 256;

export default class NetNode {
  identity = new Identity();
  #dataStack = [];

  constructor({ port = 11277, bootstrap = [] }) {
    this.node = new Node({
      port,
      bootstrap,
      onPocket: (data) => this.#handleIncoming(data),
    });
  }

  send(addrObj, data, anonymous = false) {
    const paddedData = Buffer.alloc(FIXED_PAYLOAD_SIZE, 0);
    for (let i = 0; i < data.length && i < FIXED_PAYLOAD_SIZE; i++) {
      paddedData[i] = data[i];
    }
    this.#dataStack.push([addrObj, paddedData, anonymous]);
  }

  #handleIncoming(buf) {
    const expectedLength =
      ENC_KEY_SIZE + ADDR_HASH_SIZE + PUBKEY_SIZE + FIXED_PAYLOAD_SIZE;
    if (buf.length < expectedLength) return console.error("<<");

    try {
      const encryptedKey = buf.subarray(0, ENC_KEY_SIZE);
      const encryptedAddrHash = buf.subarray(
        ENC_KEY_SIZE,
        ENC_KEY_SIZE + ADDR_HASH_SIZE
      );
      const senderPubKeyBuf = buf.subarray(
        ENC_KEY_SIZE + ADDR_HASH_SIZE,
        ENC_KEY_SIZE + ADDR_HASH_SIZE + PUBKEY_SIZE
      );
      const encryptedPayload = buf.subarray(
        ENC_KEY_SIZE + ADDR_HASH_SIZE + PUBKEY_SIZE
      );

      try {
        const decryptedKeyIV = privateDecrypt(
          this.identity.privateKeyPem(),
          encryptedKey
        );
      } catch (error) {
        console.log(error);
      }

      const key = decryptedKeyIV.subarray(0, 32);
      const iv = decryptedKeyIV.subarray(32);

      const expectedHash = hash(this.identity.pk);
      const decryptedHash = decSym(key, iv, encryptedAddrHash);
      if (!decryptedHash.equals(expectedHash))
        return console.error("!decryptedHash.equals(expectedHash)");

      const decryptedPayload = decSym(key, iv, encryptedPayload);

      let senderPubKey = null;
      if (!senderPubKeyBuf.equals(Buffer.alloc(PUBKEY_SIZE, 0))) {
        const pemStr = senderPubKeyBuf.toString("utf-8").replace(/\0+$/, ""); // trim nulls
        senderPubKey = pemStr;
      }

      this.onData(senderPubKey, Buffer.from(decryptedPayload));
    } catch (err) {
      // console.error(err);
      // not for us or corrupted
    }
  }

  onData(senderPubKey, data) {
    console.log("✅ Message received");
    console.log(
      "Sender:",
      senderPubKey ? senderPubKey.slice(0, 50) + "..." : "(anonymous)"
    );
    console.log("Payload:", data.toString("utf-8"));
  }

  update() {
    const msg = this.#dataStack.shift();

    if (!msg) {
      // Send random packet (fake traffic)
      const randomPayload = crypto.randomBytes(FIXED_PAYLOAD_SIZE);
      const fakeEncryptedKey = crypto.randomBytes(ENC_KEY_SIZE);
      const fakeAddrHash = crypto.randomBytes(ADDR_HASH_SIZE);
      const fakeSender = crypto.randomBytes(PUBKEY_SIZE);

      const fakePacket = Buffer.concat([
        fakeEncryptedKey,
        fakeAddrHash,
        fakeSender,
        randomPayload,
      ]);

      this.node.send(fakePacket);
      return;
    }

    const [addrObj, data, anonymous] = msg;
    const { key, iv } = generateAESKeyIV();
    const binaryKey = Buffer.concat([key, iv]); // 48 bytes

    const recipientPem = addrObj.toPem();
    const encryptedKey = publicEncrypt(recipientPem, binaryKey);
    const encryptedAddrHash = encSym(key, iv, hash(addrObj.get()));
    const encryptedPayload = encSym(key, iv, data);

    let senderPubKeyBuf;
    if (anonymous) {
      senderPubKeyBuf = Buffer.alloc(PUBKEY_SIZE, 0);
    } else {
      const pem = this.#toPem(this.identity.pk);
      const pemBuf = Buffer.from(pem, "utf-8");
      senderPubKeyBuf = Buffer.alloc(PUBKEY_SIZE, 0);
      pemBuf.copy(senderPubKeyBuf);
    }

    const fullPacket = Buffer.concat([
      encryptedKey,
      encryptedAddrHash,
      senderPubKeyBuf,
      encryptedPayload,
    ]);

    this.node.send(fullPacket);
  }

  #toPem(rawBuf) {
    return [
      "-----BEGIN PUBLIC KEY-----",
      rawBuf
        .toString("base64")
        .match(/.{1,64}/g)
        .join("\n"),
      "-----END PUBLIC KEY-----",
    ].join("\n");
  }

  start() {
    this.loop = setInterval(() => this.update(), 2000);
  }

  pause() {
    clearInterval(this.loop);
  }
}
