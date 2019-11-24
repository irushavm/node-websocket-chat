"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const http = require("http");
const path = require("path");
const winston = require("winston");
const WebSocket = require("ws");
const protocol_1 = require("./protocol");
const PORT = parseInt(process.env.PORT) || 5005;
WebSocket.prototype['getState'] = function () {
    return this.state;
};
WebSocket.prototype['initState'] = function (wss, logger, ip, hbTimeout) {
    this.state = {};
    this.state.connectionAlive = true;
    this.state.ip = ip;
    this.state.hbTimeout = hbTimeout;
    this.WSServer = wss;
    this.LOGGER = logger;
    this.setupHeartbeatHandler();
    this.setupMessageHandlers();
};
WebSocket.prototype['setupHeartbeatHandler'] = function () {
    this.on('pong', () => {
        this.LOGGER.info(`${new Date()}: Received pong from ${this.state.ip}`);
        this.state.connectionAlive = true;
    });
};
WebSocket.prototype['checkHeartbeatReturn'] = function () {
    if (this.state && this.state.connectionAlive === false) {
        this.LOGGER.info(`${new Date()}: Sending terminate to ${this.state.ip}`);
        return this.terminate();
    }
    this.state.connectionAlive = false;
    this.LOGGER.info(`${new Date()}: Sending ping to ${this.state.ip}`);
    this.ping();
};
WebSocket.prototype['onMessageWelcome'] = function (parsed) {
    if (parsed.uname === '') {
        this.LOGGER.error(`${new Date()}: No Username set`);
        return;
    }
    this.state.uname = parsed.uname;
    this.state.uid = crypto_1.randomBytes(16).toString('hex');
    this.send(protocol_1.serialize(protocol_1.builder.toClient.welcome({
        uname: this.state.uname,
        uid: this.state.uid,
        hbTimeout: this.state.hbTimeout
    })));
};
WebSocket.prototype['onMessageToServer'] = function (parsed) {
    const { uid, createdAt, text } = parsed;
    if (uid === '')
        return;
    const sendBody = protocol_1.builder.toClient.message({
        author: this.state.uname,
        createdAt,
        text: text.replace(/"/g, '')
    });
    this.WSServer.broadcast(sendBody);
};
WebSocket.prototype['setupMessageHandlers'] = function () {
    this.on('message', ((data) => {
        this.LOGGER.verbose(`${new Date()}: Received: ${data}`);
        const parsed = protocol_1.deserialize(data);
        switch (parsed.type) {
            case protocol_1.payloadType.WELCOME:
                this.onMessageWelcome(parsed);
                break;
            case protocol_1.payloadType.TO_SERVER:
                this.onMessageToServer(parsed);
                break;
        }
    }).bind(this));
};
class WSServer {
    constructor(server, port) {
        this.HEARTBEAT_DELAY = 5 * 1000;
        this.WSS = new WebSocket.Server({ server });
        this.LOGGER = winston.createLogger({
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: `${path.resolve(__dirname, '../logs/')}server.error.log`, level: 'error' }),
                new winston.transports.File({ filename: `${path.resolve(__dirname, '../logs/')}server.combined.log` })
            ]
        });
        server.listen(port, () => {
            this.LOGGER.info(`${new Date()}: Server listening at ${port}`);
        });
    }
    setupHeartbeats() {
        let { clients } = this.WSS;
        setInterval(() => {
            clients.forEach(function (ws) {
                const wsExt = ws;
                wsExt.checkHeartbeatReturn();
            });
        }, this.HEARTBEAT_DELAY);
    }
    broadcast(sendBody) {
        let { clients } = this.WSS;
        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(protocol_1.serialize(sendBody));
            }
        });
    }
    run() {
        this.setupHeartbeats();
        this.WSS.on('connection', (ws, req) => {
            const wsExt = ws;
            wsExt.initState(this, this.LOGGER, req.connection.remoteAddress, this.HEARTBEAT_DELAY);
            this.LOGGER.info(`${new Date()}: New Connection from ${wsExt.getState().ip}`);
        });
    }
}
const server = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write(new Date(Date.now()).toLocaleString());
    res.end();
});
new WSServer(server, PORT).run();
