"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const WebSocket = require("ws");
const protocol_1 = require("./protocol");
const winston = require("winston");
const readline = require("readline");
const PROMPT = '> ';
class WSClient {
    constructor() {
        this.SERVER_URL = 'ws://' + process.env.WS_ADDR;
        this.WS = new WebSocket(this.SERVER_URL);
        this.state = {};
        this.CLI = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.LOGGER = winston.createLogger({
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: `${path.resolve(__dirname, '../logs/')}client.error.log`, level: 'error' }),
                new winston.transports.File({ filename: `${path.resolve(__dirname, '../logs/')}client.combined.log` })
            ]
        });
        this.onOpen = this.onOpen.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onMessageToClient = this.onMessageToClient.bind(this);
        this.onMessageWelcome = this.onMessageWelcome.bind(this);
        this.checkHeartbeat = this.checkHeartbeat.bind(this);
    }
    checkHeartbeat() {
        this.LOGGER.verbose(`${new Date()}: Sending ping`);
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = setTimeout(() => {
            this.LOGGER.verbose(`${new Date()}: Lost connection with server`);
            this.WS.terminate();
        }, this.state.hbTimeout);
    }
    onOpen() {
        this.LOGGER.verbose(`${new Date()}: Connected to: ${this.SERVER_URL}`);
        this.CLI.question(`What's your user name? `, (uname) => {
            this.state.uname = uname;
            this.WS.send(protocol_1.serialize(protocol_1.builder.toServer.welcome({ uname })));
        });
    }
    onMessageToClient(parsed) {
        const { author, createdAt, text } = parsed;
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        console.log(`[${new Date(createdAt).toLocaleString()}] ${author}: ${text}\n`);
        process.stdout.write(PROMPT);
    }
    onMessageWelcome(parsed) {
        const { uid, uname, hbTimeout } = parsed;
        if (uname !== this.state.uname) {
            console.error('Server Parameters not set');
            return;
        }
        this.state.hbTimeout = hbTimeout + 1000;
        this.state.uid = uid;
        this.LOGGER.verbose(`${new Date()}: Connection with server successful`);
        this.checkHeartbeat();
        this.WS.on('ping', this.checkHeartbeat);
        console.log(`Connected @ ${new Date()}!\n${PROMPT}`);
        this.CLI.on('line', (line) => {
            if (line.trim().length === 0)
                return;
            this.WS.send(protocol_1.serialize(protocol_1.builder.toServer.message({
                uid: this.state.uid,
                createdAt: Date.now(),
                text: line
            })));
        });
    }
    onClose() {
        this.LOGGER.verbose(`${new Date()}: Connection closed with server`);
        this.CLI.close();
        clearTimeout(this.state.hbTimeout);
    }
    run() {
        this.WS.on('open', this.onOpen);
        this.WS.on('message', (data) => {
            const parsed = protocol_1.deserialize(data);
            switch (parsed.type) {
                case protocol_1.payloadType.WELCOME:
                    this.onMessageWelcome(parsed);
                    break;
                case protocol_1.payloadType.TO_CLIENT:
                    this.onMessageToClient(parsed);
                    break;
            }
        });
        this.WS.on('close', this.onClose.bind(this));
    }
}
new WSClient().run();
