import * as path from 'path'
import * as WebSocket from 'ws'
import { payloadType, serialize, deserialize, builder, WelcomeServer, MessageServer } from './protocol'
import * as winston from 'winston'
import * as readline from 'readline'

interface ClientState {
  uid: string,
  uname: string,
  hbTimeout: number
}

class Client {
  private readonly SERVER_URL: string
  private readonly WS: WebSocket
  private readonly LOGGER: winston.Logger
  private readonly CLI: readline.Interface
  private state: ClientState
  private heartbeatTimeout: NodeJS.Timer

  constructor () {
    this.SERVER_URL = 'ws://' + process.env.WS_ADDR
    this.WS = new WebSocket(this.SERVER_URL)
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
  }

  private checkHeartbeat (): void {
    this.LOGGER.verbose('Sending ping')
    clearTimeout(this.heartbeatTimeout)
    this.heartbeatTimeout = setTimeout(() => {
      this.LOGGER.verbose(`Lost connection with server`)
      this.WS.terminate()
    }, this.state.hbTimeout)
  }
  private userRegister (): void {
    this.CLI.question(`What's your user name? `, (uname) => {
      this.state.uname = uname
      this.WS.send(serialize(builder.client.welcome({ uname })))
    })
  }

  run ():void {
    this.LOGGER.verbose(`Connecting to: ${this.SERVER_URL}`)
    this.WS.on('open', this.userRegister)

    this.WS.on('message', (data: string) => {
      const parsed: any = deserialize(data)
      switch (parsed.type) {
        case payloadType.WELCOME:
          const { uid, uname, hbTimeout }: WelcomeServer = parsed
          if (uname !== this.state.uname) {
            console.error('Server Parameters not set')
            return
          }
          this.state.hbTimeout = hbTimeout + 1000
          this.state.uid = uid
          this.LOGGER.verbose(`Connection with server successful`)

          this.checkHeartbeat()
          this.WS.on('ping', this.checkHeartbeat)

          console.log(`Connected!`)
          this.WS.on('line', (line: string) => {
            if (line.trim().length === 0) return
            this.WS.send(serialize(builder.client.message({
              uid: this.state.uid,
              createdAt: Date.now(),
              text: line
            })))
          })
          break
        case payloadType.TO_CLIENT:
          const { author, createdAt, text }: MessageServer = parsed
          console.log(`[${new Date(createdAt).toLocaleString()}] ${author}: ${text}`)
          break
      }
    })

    this.WS.on('close', () => {
      this.LOGGER.verbose(`Connection closed with server`)
      this.CLI.close()
      clearTimeout(this.state.hbTimeout)
    })
  }
}

new Client().run()
