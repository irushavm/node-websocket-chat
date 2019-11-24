import * as path from 'path'
import * as WebSocket from 'ws'
import { payloadType, serialize, deserialize, builder, WelcomeToClient, MessageToClient } from './protocol'
import * as winston from 'winston'
import * as readline from 'readline'

const PROMPT = '> '

interface ClientState {
  uid: string,
  uname: string,
  hbTimeout: any
}

class WSClient {
  private readonly SERVER_URL: string
  private readonly WS: WebSocket
  private readonly LOGGER: winston.Logger
  private readonly CLI: readline.Interface
  private state: ClientState
  private heartbeatTimeout: any

  constructor () {
    this.SERVER_URL = 'ws://' + process.env.WS_ADDR
    this.WS = new WebSocket(this.SERVER_URL)
    this.state = {} as ClientState
    this.CLI = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    this.LOGGER = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: `${path.resolve(__dirname, '../logs/')}client.error.log`, level: 'error' }),
        new winston.transports.File({ filename: `${path.resolve(__dirname, '../logs/')}client.combined.log` })
      ]
    })
    this.onOpen = this.onOpen.bind(this)
    this.onClose = this.onClose.bind(this)
    this.onMessageToClient = this.onMessageToClient.bind(this)
    this.onMessageWelcome = this.onMessageWelcome.bind(this)
    this.checkHeartbeat = this.checkHeartbeat.bind(this)
  }

  private checkHeartbeat (): void {
    this.LOGGER.verbose(`${new Date()}: Sending ping`)
    clearTimeout(this.heartbeatTimeout)
    this.heartbeatTimeout = setTimeout(() => {
      this.LOGGER.verbose(`${new Date()}: Lost connection with server`)
      this.WS.terminate()
    }, this.state.hbTimeout)
  }
  private onOpen (): void {
    this.LOGGER.verbose(`${new Date()}: Connected to: ${this.SERVER_URL}`)
    this.CLI.question(`What's your user name? `, (uname) => {
      this.state.uname = uname
      this.WS.send(serialize(builder.toServer.welcome({ uname })))
    })
  }
  private onMessageToClient(parsed: any): void {
    const { author, createdAt, text }: MessageToClient = parsed
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    console.log(`[${new Date(createdAt).toLocaleString()}] ${author}: ${text}\n`)
    process.stdout.write(PROMPT)
  }
  private onMessageWelcome(parsed: any): void {
    const { uid, uname, hbTimeout }: WelcomeToClient = parsed
    if (uname !== this.state.uname) {
      console.error('Server Parameters not set')
      return
    }
    this.state.hbTimeout = hbTimeout + 1000
    this.state.uid = uid
    this.LOGGER.verbose(`${new Date()}: Connection with server successful`)

    this.checkHeartbeat()
    this.WS.on('ping', this.checkHeartbeat)

    console.log(`Connected @ ${new Date()}!\n${PROMPT}`)
    this.CLI.on('line', (line: string) => {
      if (line.trim().length === 0) return
      this.WS.send(serialize(builder.toServer.message({
        uid: this.state.uid,
        createdAt: Date.now(),
        text: line
      })))
    })
  }
  onClose():void {
    this.LOGGER.verbose(`${new Date()}: Connection closed with server`)
    this.CLI.close()
    clearTimeout(this.state.hbTimeout)
  }
  run ():void {
    this.WS.on('open', this.onOpen)

    this.WS.on('message', (data: string) => {
      const parsed: any = deserialize(data)
      switch (parsed.type) {
        case payloadType.WELCOME:
        this.onMessageWelcome(parsed)
        break
        case payloadType.TO_CLIENT:
        this.onMessageToClient(parsed)
        break
      }
    })

    this.WS.on('close', this.onClose.bind(this))
  }
}

new WSClient().run()
