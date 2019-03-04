
export enum payloadType {
  WELCOME = 'welcome',
  TO_SERVER = 'to_server',
  TO_CLIENT = 'to_client',
}

export const serialize = (x: object):string => {
  try {
    return JSON.stringify(x)
  } catch (e) {
    console.error(e)
  }
}
export const deserialize = (x: string):object => {
  try {
    return JSON.parse(x)
  } catch (e) {
    console.error(e)
  }
}


/* Message structure sent during initial handsahking */
export interface WelcomeToServer {
  uname: string
}

export interface WelcomeToClient extends WelcomeToServer {
  uid: string,
  hbTimeout: number
}

/* Message structure sent in normal operating */
interface Message {
  createdAt: number,
  text: string
}

export interface MessageToClient extends Message {
  author: string
}

export interface MessageToServer extends Message {
  uid: string
}


interface Payload {
  type: payloadType
}
interface WelcomeToServerPayload extends Payload, WelcomeToServer {}
interface WelcomeToClientPayload extends Payload, WelcomeToClient {}
interface MessageToServerPayload extends Payload, MessageToServer {}
interface MessageToClientPayload extends Payload, MessageToClient {}




export const builder = {
  toServer: {
    welcome: ({ uname }: WelcomeToServer ): WelcomeToServerPayload => ({
      type: payloadType.WELCOME,
      uname
    }),
    message: ({ uid, createdAt, text = '' }: MessageToServer ): MessageToServerPayload => ({
      type: payloadType.TO_SERVER,
      uid,
      createdAt,
      text
    })
  },
  toClient: {
    welcome: ({ uname, uid, hbTimeout }: WelcomeToClient): WelcomeToClientPayload => ({
      type: payloadType.WELCOME,
      uname,
      uid,
      hbTimeout
    }),
    message: ({ author, createdAt, text = '' }: MessageToClient ): MessageToClientPayload => ({
      type: payloadType.TO_CLIENT,
      author,
      createdAt,
      text
    })
  }
}