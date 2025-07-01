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
