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
export interface WelcomeClient {
  uname: string
}

export interface WelcomeServer extends WelcomeClient {
  uid: string,
  hbTimeout: number
}

/* Message structure sent in normal operating */
interface Message {
  createdAt: number,
  text: string
}

export interface MessageServer extends Message {
  author: string
}

export interface MessageClient extends Message {
  uid: string
}


interface Payload {
  type: payloadType
}
interface WelcomeClientPayload extends Payload, WelcomeClient {}
interface WelcomeServerPayload extends Payload, WelcomeServer {}
interface MessageClientPayload extends Payload, MessageClient {}
interface MessageServerPayload extends Payload, MessageServer {}




export const builder = {
  client: {
    welcome: ({ uname }: WelcomeClient ): WelcomeClientPayload => {
      return {
        type: payloadType.WELCOME,
        uname
      }
    },
    message: ({ uid, createdAt, text = '' }: MessageClient ): MessageClientPayload => {
      return {
        type: payloadType.TO_SERVER,
        uid,
        createdAt,
        text
      }
    }
  },
  server: {
    welcome: ({ uname, uid, hbTimeout }: WelcomeServer): WelcomeServerPayload => {
      return {
        type: payloadType.WELCOME,
        uname,
        uid,
        hbTimeout
      }
    },
    message: ({ author, createdAt, text = '' }: MessageServer ): MessageServerPayload => {
      return {
        type: payloadType.TO_CLIENT,
        author,
        createdAt,
        text
      }
    }
  }
}