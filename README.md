# node-websocket-chat
This project was to create a simple Web socket based chat application to learn more about web sockets.

This application requires running a server and clients that connect to the server to broadcast messages to everyone connected.


# Usage

1. Run the server (run on port 5005 by default)

    `<PORT=xxxx> node dist/server.js`


2. Run any number of clients

    `WS_ADDR=host:port node dist/client.js`

# Development

1. Install dependencies

    `npm install`

2. Make any changes in src/


3. Build the TS into JS

    `npm run tsc`
