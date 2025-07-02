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
