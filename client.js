const WebSocket = require('ws')
const interface = require('./interface')
const winston = require('winston')
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})
const logger = winston.createLogger({
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'client-error.log', level: 'error' }),
      new winston.transports.File({ filename: 'client-combined.log' }),
    ]
  });
  

const SERVER = 'ws://' + process.env.WS_ADDR

const process_heartbeat = (hb_timeout) => {
    logger.verbose('Sending ping')
    clearTimeout(this.heartbeatTimeout)
    this.heartbeatTimeout = setTimeout(() => {
        logger.verbose(`Lost connection with server`)
        this.terminate()
    }, hb_timeout)
}

const init = () => {
    logger.verbose(`Connecting to: ${SERVER}`)
    const client = new WebSocket(SERVER)
    let state = {
        uname:'',
        uid: '',
        heartbeatTimeout: 0
    }
    
    
    client.on('open', () => {
        readline.question(`What's your user name? `, (uname) => {
            state.uname = uname;
            client.send(interface.serialize(interface.builder.client.welcome({uname})));
        })
    })
    
    client.on('message', (data) => {
        const parsed = interface.deserialize(data)
        // console.error(`New message ${JSON.stringify(parsed)}`);
        switch(parsed.type) {
            case interface.TYPES.WELCOME:
            if(parsed.uname !== state.uname) {
                console.error("Server Parameters not set");
                return;
            }
            state.heartbeatTimeout = parsed.hb_timeout + 1000;
            state.uid = parsed.uid;
            logger.verbose(`Connection with server successful`)

            client.process_heartbeat = process_heartbeat.bind(client)
            client.process_heartbeat(state.heartbeatTimeout);
            client.on('ping', () => {
                client.process_heartbeat(state.heartbeatTimeout)
            })
            
            readline.on('line', line => {
                if(line.trim().length === 0) return;
                client.send(interface.serialize(interface.builder.client.message({ uid:state.uid, text: interface.serialize(line)})))
            })
            break;
            case interface.TYPES.TO_CLIENT:
            console.log(parsed.text);
            break;
        }
    })
    
    client.on('close', () =>  {
        logger.verbose(`Connection closed with server`)
        readline.close()
        clearTimeout(this.heartbeatTimeout)
    })
    
}

init()