import { Node } from './broadcast-net/index.js';
import { Buffer } from 'buffer';

const port = parseInt(process.env.PORT || '8080', 10);
const bootstrap = process.argv.slice(2); // <- Neue Bootstrap-URLs aus Kommandozeile

const node = new Node({
    port,
    bootstrap,
    onPocket: (data) => {
        console.log(`(${port}) Received:`, data.toString());
    }
});

setTimeout(() => {
    node.send(Buffer.from(`Hello from ${port}`));
}, 2000);
