import { randomBytes } from 'crypto'
import * as http from 'http'
import * as path from 'path'
import * as winston from 'winston'
import * as WebSocket from 'ws'
import { payloadType,serialize, deserialize, builder, WelcomeToServer, MessageToServer } from './protocol'

const PORT = parseInt(process.env.PORT) || 5005
interface WebSocketExtState {
  connectionAlive: boolean,
  uid: string,
  uname: string,
  ip: string,
  hbTimeout: number
}

type WebSocketExt = WebSocket & {
  WSServer: any
  state: WebSocketExtState
  LOGGER: winston.Logger
  getState():WebSocketExtState
  initState(wsserver: any, logger: winston.Logger, ip: string, hbTimeout: number):void
  setupHeartbeatHandler(): void
  checkHeartbeatReturn(): void
  onMessageWelcome(parsed:WelcomeToServer):void
  onMessageToServer(parsed: MessageToServer): void
  setupMessageHandlers():void
}

WebSocket.prototype['getState'] = function ():WebSocketExtState {
  return this.state
}
WebSocket.prototype['initState'] = function (wss: WSServer, logger: winston.Logger, ip: string, hbTimeout: number):void {
  this.state = {} as WebSocketExtState
  this.state.connectionAlive = true
  this.state.ip = ip
  this.state.hbTimeout = hbTimeout
  this.WSServer = wss
  this.LOGGER = logger
  this.setupHeartbeatHandler()
  this.setupMessageHandlers()
}
WebSocket.prototype['setupHeartbeatHandler'] = function(): void{
  this.on('pong', () => {
    this.LOGGER.info(`Received pong from ${this.state.ip}`)
    this.state.connectionAlive = true
  })
}
WebSocket.prototype['checkHeartbeatReturn'] = function(): void {
  if (this.state && this.state.connectionAlive === false) {
    this.LOGGER.info(`Sending terminate to ${this.state.ip}`)
    return this.terminate()
  }
  this.state.connectionAlive = false
  this.LOGGER.info(`Sending ping to ${this.state.ip}`)
  this.ping()
}
WebSocket.prototype['onMessageWelcome'] = function(parsed: WelcomeToServer):void {
  if (parsed.uname === '') {
    this.LOGGER.error('No Username set')
    return
  }
  this.state.uname = parsed.uname
  this.state.uid = randomBytes(16).toString('hex')
  this.send(serialize(builder.toClient.welcome({
    uname: this.state.uname,
    uid: this.state.uid,
    hbTimeout: this.state.hbTimeout
  })))
}

WebSocket.prototype['onMessageToServer'] = function(parsed: MessageToServer): void {
  const { uid, createdAt, text } = parsed
  if (uid === '') return
  const sendBody = builder.toClient.message({
    author: this.state.uname,
    createdAt,
    text: text.replace(/"/g, '')
  })
  this.WSServer.broadcast(sendBody)
}
WebSocket.prototype['setupMessageHandlers'] = function():void {
  this.on('message', ((data:string) => {
    this.LOGGER.verbose(`Received: ${data}`)
    const parsed: any = deserialize(data)
    
    switch (parsed.type) {
      case payloadType.WELCOME:
      this.onMessageWelcome(parsed)
      break
      case payloadType.TO_SERVER:
      this.onMessageToServer(parsed)
      break
    }
  }).bind(this))
}


class WSServer {
  private readonly WSS: WebSocket.Server
  public readonly LOGGER: winston.Logger
  public readonly HEARTBEAT_DELAY = 5 * 1000
  
  constructor(server: http.Server, port: number) {
    this.WSS = new WebSocket.Server({ server })
    this.LOGGER = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: `${path.resolve(__dirname, '../logs/')}server.error.log`, level: 'error' }),
        new winston.transports.File({ filename: `${path.resolve(__dirname, '../logs/')}server.combined.log` })
      ]
    })
    server.listen(port, () => {
      this.LOGGER.info(`Server listening at ${port}`)
    })    
  }
  
  private setupHeartbeats():void {
    let { clients } = this.WSS
    setInterval(() => {
      clients.forEach(function(ws: WebSocket ) {
        const wsExt :any = ws as WebSocketExt
        wsExt.checkHeartbeatReturn()
      })
    }, this.HEARTBEAT_DELAY)
  }
  
  public broadcast (sendBody: object):void {
    let { clients } = this.WSS
    clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialize(sendBody))
      }
    })
  }
  
  public run():void {
    this.setupHeartbeats()
    this.WSS.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const wsExt :any = ws as WebSocketExt
      wsExt.initState(this, this.LOGGER, req.connection.remoteAddress, this.HEARTBEAT_DELAY)
      this.LOGGER.info(`New Connection from. ${wsExt.getState().ip}`)
    })
  }
}

const server = http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.write(new Date(Date.now()).toLocaleString())
  res.end()
})

new WSServer(server, PORT).run()
