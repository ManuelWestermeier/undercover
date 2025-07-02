import fs from "fs";
import Identity from "../identity/index.js";

export default class Address {
  #pk = null;

  store(path = "") {
    fs.writeFileSync(
      path,
      JSON.stringify([Buffer.from(this.#pk).toString("base64")]),
      "utf-8"
    );
  }

  load(path) {
    try {
      const encoded = JSON.parse(fs.readFileSync(path, "utf-8"))[0];
      this.#pk = Buffer.from(encoded, "base64");
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

  toPem() {
    return `-----BEGIN PUBLIC KEY-----\n${this.#pk.toString(
      "base64"
    )}\n-----END PUBLIC KEY-----`;
  }
}
