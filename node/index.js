import { Node } from "../broadcast-net/index.js";
import { Buffer } from "buffer";

export default class NetNode {
  constructor({ port = 11277, bootstrap = [] }) {
    this.node = new Node({
      port,
      bootstrap,
      onPocket: (data) => {
        console.log(`(${port}) Received:`, data.toString());
      },
    });
  }

  update() {
    node.send(Buffer.from(`Hello from ${port}`));
  }

  start() {
    this.loop = setInterval(() => {
      update();
    }, 2000);
  }

  pause() {
    clearInterval(this.loop);
  }
}
