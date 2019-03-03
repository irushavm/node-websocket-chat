const path = require('path')
const WebSocket = require('ws')
const protocol = require('./protocol')
const winston = require('winston')
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: `${path.resolve(__dirname, '../logs/')}client.error.log`, level: 'error' }),
    new winston.transports.File({ filename: `${path.resolve(__dirname, '../logs/')}client.combined.log` })
  ]
})

const SERVER = 'ws://' + process.env.WS_ADDR

const hbPingHandler = (hbTimeout) => {
  logger.verbose('Sending ping')
  clearTimeout(this.hbTimeout)
  this.hbTimeout = setTimeout(() => {
    logger.verbose(`Lost connection with server`)
    this.terminate()
  }, hbTimeout)
}

const init = () => {
  logger.verbose(`Connecting to: ${SERVER}`)
  const client = new WebSocket(SERVER)
  let state = {
    uname: '',
    uid: '',
    hbTimeout: 0
  }

  client.on('open', () => {
    readline.question(`What's your user name? `, (uname) => {
      state.uname = uname
      client.send(protocol.serialize(protocol.builder.client.welcome({ uname })))
    })
  })

  client.on('message', (data) => {
    const parsed = protocol.deserialize(data)
    switch (parsed.type) {
      case protocol.TYPES.WELCOME:
        const { uid, uname, hbTimeout } = parsed
        if (uname !== state.uname) {
          console.error('Server Parameters not set')
          return
        }
        state.hbTimeout = hbTimeout + 1000
        state.uid = uid
        logger.verbose(`Connection with server successful`)

        client.hbPingHandler = hbPingHandler.bind(client)
        client.hbPingHandler(state.hbTimeout)
        client.on('ping', () => {
          client.hbPingHandler(state.hbTimeout)
        })

        console.log(`Connected!`)
        readline.on('line', line => {
          if (line.trim().length === 0) return
          client.send(protocol.serialize(protocol.builder.client.message({
            uid: state.uid,
            createdAt: Date.now(),
            text: protocol.serialize(line)
          })))
        })
        break
      case protocol.TYPES.TO_CLIENT:
        const { author, createdAt, text } = parsed
        console.log(`[${new Date(createdAt).toLocaleString()}] ${author}: ${text}`)
        break
    }
  })

  client.on('close', () => {
    logger.verbose(`Connection closed with server`)
    readline.close()
    clearTimeout(this.hbTimeout)
  })
}

init()
