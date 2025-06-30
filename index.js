import NetNode from "./node/index.js";

const port = parseInt(process.env.PORT || "8080", 10);
const bootstrap = process.argv.slice(2); // <- Neue Bootstrap-URLs aus Kommandozeile

const nn = new NetNode({
  port,
  bootstrap,
});

nn.start();
