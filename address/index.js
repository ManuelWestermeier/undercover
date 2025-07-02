import fs from "fs";

export default class Address {
  #pk = null;

  constructor(pk = null) {
    this.#pk = pk;
  }

  set(addr) {
    this.#pk = addr;
  }

  get() {
    return this.#pk;
  }

  store(path = "") {
    // serialize as base64
    fs.writeFileSync(
      path,
      JSON.stringify([this.#pk.toString("base64")]),
      "utf-8"
    );
  }

  load(path) {
    try {
      const encoded = JSON.parse(fs.readFileSync(path, "utf-8"))[0];
      this.#pk = Buffer.from(encoded, "base64");
      return true;
    } catch {
      return false;
    }
  }

  toPem() {
    // wrap the DER bytes in a PEM header/footer
    return [
      "-----BEGIN PUBLIC KEY-----",
      this.#pk
        .toString("base64")
        .match(/.{1,64}/g)
        .join("\n"),
      "-----END PUBLIC KEY-----",
    ].join("\n");
  }
}
