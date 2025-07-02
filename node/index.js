import { Node } from "../broadcast-net/index.js";
import {
  encSym,
  generateAESKeyIV,
  hash,
  publicEncrypt,
} from "../crypto/index.js";
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

  send(addr = new Buffer(), ct = new Buffer()) {
    const data = Buffer.alloc(2 ** 5, 0);

    for (let i = 0; i < ct.length || i < 2 ** 16 - 1; i++) {
      data[i] = ct[i];
    }

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

    // symmetrically encrypt the addres
    const encryptedAddres = encSym(key, iv, hash(addrObj.get()));

    // combine into a single message (key\npayload)
    const combined =
      encryptedKey.toString("base64") +
      "\n" +
      encryptedAddres +
      "\n" +
      encryptedData.toString("base64");

    console.log("combined.length", combined.length);

    this.node.send(Buffer.from(combined, "utf-8"));
  }

  start() {
    this.loop = setInterval(() => this.update(), 2000);
  }

  pause() {
    clearInterval(this.loop);
  }
}
