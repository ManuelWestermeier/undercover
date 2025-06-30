import { Buffer } from 'buffer';
import { Node } from './broadcast-net';

const node = new Node({
    port: 8080,
    bootstrap: ['ws://127.0.0.1:8081'],
    onPocket: (data) => {
        console.log('Received:', data.toString());
    }
});

// Send a test packet after 2 seconds
setTimeout(() => {
    node.send(Buffer.from('Hello, peers!'));
}, 2000);
