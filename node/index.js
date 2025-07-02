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
        const str = data.toString();
        const parts = str.split("\n");
        if (parts.length === 2) {
          const [keyBuf, encBuf] = parts.map((p) => Buffer.from(p, "base64"));
          // TODO: decrypt keyBuf with private key and then decrypt encBuf
          this.onData("?", encBuf);
        } else {
          console.log(`(${port}) Received:`, data.toString());
        }
      },
    });
  }

  send(addr, data) {
    this.#dataStack.push([addr, data]);
  }

  onData(addr, data) {}

  update() {
    const msg = this.#dataStack.shift();
    if (!msg) return;

    const [addr, data] = msg;
    const { key, iv } = generateAESKeyIV();
    const binaryKey = Buffer.concat([key, iv]);

    const encryptedKey = publicEncrypt(addr.toPem(), binaryKey);
    const encryptedData = encSym(key, iv, data);

    const combined = `${encryptedKey.toString(
      "base64"
    )}\n${encryptedData.toString("base64")}`;

    this.node.send(Buffer.from(combined, "utf-8"));
  }

  start() {
    this.loop = setInterval(() => this.update(), 2000);
  }

  pause() {
    clearInterval(this.loop);
  }
}
