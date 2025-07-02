import Address from "./address/index.js"; // corrected import name
import NetNode from "./node/index.js";
import fs from "fs";

const port = parseInt(process.env.PORT || "8082", 10);
const bootstrap = process.argv.slice(2);

const nn = new NetNode({ port, bootstrap });

// ensure identity directory exists
if (!fs.existsSync("./identities")) fs.mkdirSync("./identities");

// persist/load identity
const identityPath = `./identities/${port}.txt`;
if (!nn.identity.load(identityPath)) {
  console.log("Generating new identity...");
  nn.identity.generate();
}
nn.identity.store(identityPath);

console.log(`Identity stored at ${identityPath}`);

nn.start();

nn.onData = (addr, data) => {
  console.log(`${addr}, ${data}`);
};

console.log(nn.identity.pk);

if (port === 8082) {
  const address = new Address();

  if (!address.load("./identities/8081.txt")) {
    throw new Error("Failed to load peer identity at port 8081");
  }

  console.log(address);

  // enqueue a message to port 8081
  nn.send(address, Buffer.from("Hello from 8082!!"));
}
