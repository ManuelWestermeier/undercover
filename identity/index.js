import { generateKeyPair, hash } from "../crypto/index.js";
import fs from "fs";
import Address from "../address/index.js";

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
    return Boolean(this.pk && this.sk && this.addr);
  }

  toString() {
    // store both keys as base64 strings
    return JSON.stringify([
      this.pk.toString("base64"),
      this.sk.toString("base64"),
    ]);
  }

  fromString(str = "") {
    const [pkB64, skB64] = JSON.parse(str);
    this.pk = Buffer.from(pkB64, "base64");
    this.sk = Buffer.from(skB64, "base64");
    this.addr = hash(this.pk);
  }

  store(path = "") {
    fs.writeFileSync(path, this.toString(), "utf-8");
  }

  load(path) {
    try {
      this.fromString(fs.readFileSync(path, "utf-8"));
      return true;
    } catch (error) {
      console.error("Identity.load error:", error);
      return false;
    }
  }

  set(serialized = "") {
    this.fromString(serialized);
  }

  get() {
    return this.toString();
  }

  toAddress() {
    return new Address(this.pk);
  }

  getPublicKeyPem() {
    return this.toAddress().toPem();
  }

  privateKeyPem() {
    // wrap the DER bytes in a PEM header/footer
    return [
      "-----BEGIN PRIVATE KEY-----",
      this.sk
        .toString("base64")
        .match(/.{1,64}/g)
        .join("\n"),
      "-----END PRIVATE KEY-----",
    ].join("\n");
  }
}
