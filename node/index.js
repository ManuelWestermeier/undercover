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
      this.node.send(Buffer.from("Hi >> " + Math.random()));
      return;
    }

    const [addr, data] = msg;

    const key = generateAESKeyIV();

    const decKey = publicEncrypt(addr, Buffer.from(JSON.stringify(key)));

    this.node.send(
      Buffer.from(
        `${Buffer.from(decKey, "base64")}\n${Buffer.from(
          encSym(key.key, key.iv, data),
          "base64"
        )}`,
        "utf-8"
      )
    );
  }

  start() {
    this.loop = setInterval(() => {
      this.update();
    }, 2000);
  }

  pause() {
    clearInterval(this.loop);
  }
}
