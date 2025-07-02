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
    return this.pk && this.sk && this.addr;
  }

  toString() {
    return JSON.stringify([
      this.pk.toString("base64"),
      this.sk.toString("base64"),
    ]);
  }

  fromString(str = "") {
    const [pk, sk] = JSON.parse(str);
    this.pk = Buffer.from(pk, "base64");
    this.sk = Buffer.from(sk, "base64");
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
    return new Address(this.pk);
  }

  getPublicKeyPem() {
    return `-----BEGIN PUBLIC KEY-----\n${this.pk.toString(
      "base64"
    )}\n-----END PUBLIC KEY-----`;
  }
}
