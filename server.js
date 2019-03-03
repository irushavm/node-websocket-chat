const http = require('http')
const crypto = require("crypto");
const WebSocket = require('ws')
const interface = require('./interface')
const winston = require('winston')
const PORT = process.env.PORT || 5005
const HEARTBEAT_DELAY = 30 * 1000

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/server-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/server-combined.log' }),
  ]
});

const server = http.createServer((_, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'})
    res.write(new Date(Date.now()).toLocaleString())
    res.end()
})

const heartbeat_pong_handler = () => {
  logger.info(`Received pong from ${this.ip}`)
  this.isAlive = true
}

const wss = new WebSocket.Server({ server })

setInterval(() => wss.clients.forEach( ws => {
  if (ws.isAlive === false) {
    logger.info(`Sending terminate to ${ws.ip}`)
    return ws.terminate()
  }
  ws.isAlive = false
  logger.info(`Sending ping to ${ws.ip}`)
  ws.ping()
}), HEARTBEAT_DELAY)
 
wss.on('connection', (ws, req) => {
  ws.isAlive = true
  ws.on('pong', heartbeat_pong_handler.bind(ws))

  ws.ip = req.connection.remoteAddress
  logger.info(`New Connection from. ${ws.ip}`)
  ws.on('message', data => {
    logger.verbose(`Received: ${data}`)
    const parsed = interface.deserialize(data)
    
    switch(parsed.type) {
      case interface.TYPES.WELCOME:
      if(parsed.uname === '') {
          console.error("No Username set");
          return;
      }
      ws.uname = parsed.uname
      ws.uid = crypto.randomBytes(16).toString("hex");
      ws.send(interface.serialize(interface.builder.server.welcome({
        uname: ws.uname,
        uid: ws.uid,
        hb_timeout: HEARTBEAT_DELAY
      })))
      break;
      case interface.TYPES.TO_SERVER:
      if(parsed.uid === '') return;
      wss.clients.forEach( client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(interface.serialize(interface.builder.server.message({
            text: `[${new Date(Date.now()).toLocaleString()}] ${ws.uname}: ${parsed.text.replace(/\"/g, '')}`
          })))
        }
      })
      break;
    }
  })
})


 
server.listen(PORT, () => {
  logger.info(`Server listening at ${PORT}`)
})