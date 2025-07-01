import { Node } from "../broadcast-net/index.js";

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
    this.node.send(Buffer.from("Hi >> " + Math.random()));
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
