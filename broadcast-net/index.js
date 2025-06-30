// decentralized-broadcast-node.mjs
import WebSocket from 'ws';
import crypto from 'crypto';

export class Node {
    #port;
    #bootstrap;
    #onPocket;
    #peers;
    #knownMessages;
    #maxConnections = 10;
    #maxPeers = 100;
    #server;

    constructor({ port = 443, bootstrap = [], onPocket = () => { } }) {
        this.#port = port;
        this.#bootstrap = bootstrap;
        this.#onPocket = onPocket;

        this.#peers = new Map();
        this.#knownMessages = new Set();

        this.#startServer();
        this.#connectToBootstrap();
    }

    #startServer() {
        this.#server = new WebSocket.Server({ port: this.#port });
        this.#server.on('connection', (ws) => {
            this.#addPeer(ws);
            ws.on('message', (data) => this.#handleMessage(ws, data));
            ws.on('close', () => this.#removePeer(ws));
        });
    }

    #connectToBootstrap() {
        for (const url of this.#bootstrap) {
            if (this.#peers.size >= this.#maxConnections) break;
            this.#connectToPeer(url);
        }
    }

    #connectToPeer(url) {
        if (this.#peers.has(url)) return;
        const ws = new WebSocket(url);
        ws.on('open', () => {
            this.#addPeer(ws, url);
        });
        ws.on('message', (data) => this.#handleMessage(ws, data));
        ws.on('close', () => this.#removePeer(ws));
        ws.on('error', () => this.#removePeer(ws));
    }

    #addPeer(ws, id = crypto.randomUUID()) {
        if (this.#peers.size >= this.#maxPeers) {
            ws.close();
            return;
        }
        this.#peers.set(id, ws);
    }

    #removePeer(ws) {
        for (const [id, peer] of this.#peers.entries()) {
            if (peer === ws) {
                this.#peers.delete(id);
                break;
            }
        }
    }

    #handleMessage(sender, data) {
        if (!(data instanceof Buffer)) data = Buffer.from(data);
        const id = data.subarray(0, 16).toString('hex');
        if (this.#knownMessages.has(id)) return;
        this.#knownMessages.add(id);
        if (this.#knownMessages.size > 1000) {
            this.#knownMessages.delete(this.#knownMessages.values().next().value);
        }

        const payload = data.subarray(16);
        this.#onPocket(payload);

        for (const peer of this.#peers.values()) {
            if (peer !== sender && peer.readyState === WebSocket.OPEN) {
                peer.send(data);
            }
        }
    }

    send(buffer) {
        if (!(buffer instanceof Buffer)) throw new Error('Only Buffer supported');
        const id = crypto.randomBytes(16);
        const packet = Buffer.concat([id, buffer]);
        this.#handleMessage(null, packet);
    }
}
