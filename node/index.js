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
      // no queued messages — send a heartbeat
      this.node.send(Buffer.from("Hi >> " + Math.random()));
      return;
    }

    const [addrObj, data] = msg;
    const addrPem = addrObj.toPem(); // <-- use PEM form
    const { key, iv } = generateAESKeyIV();
    const binaryKey = Buffer.concat([key, iv]);

    // encrypt the symmetric key with the recipient's public key
    const encryptedKey = publicEncrypt(addrPem, binaryKey);

    // symmetrically encrypt the payload
    const encryptedData = encSym(key, iv, data);

    // combine into a single message (key\npayload)
    const combined =
      encryptedKey.toString("base64") + "\n" + encryptedData.toString("base64");

    this.node.send(Buffer.from(combined, "utf-8"));
  }

  start() {
    this.loop = setInterval(() => this.update(), 2000);
  }

  pause() {
    clearInterval(this.loop);
  }
}
