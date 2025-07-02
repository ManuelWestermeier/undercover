import Addres from "./address/index.js";
import NetNode from "./node/index.js";

const port = parseInt(process.env.PORT || "8082", 10);
const bootstrap = process.argv.slice(2) || []; // <- Neue Bootstrap-URLs aus Kommandozeile

const nn = new NetNode({
  port,
  bootstrap,
});

const identityPath = "./idenetys/" + port + ".txt";

if (!nn.identity.load(identityPath)) {
  console.log("gen");

  nn.identity.generate();
}
nn.identity.store(identityPath);

console.log(identityPath);

nn.start();

nn.onData = (addr, data) => {
  console.log(`${addr}, ${data}`);
};

if (port == 8082) {
  const address = new Addres();

  address.load("./idenetys/8081.txt");

  nn.send(address, Buffer.from("data"));
}
