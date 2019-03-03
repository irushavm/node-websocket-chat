const TYPES = {
  WELCOME: 'WELCOME',
  TO_SERVER: 'TO_SERVER',
  TO_CLIENT: 'TO_CLIENT'
}
const serialize = x => {
  try {
    return JSON.stringify(x)
  } catch (e) {
    console.error(e)
  }
}
const deserialize = x => {
  try {
    return JSON.parse(x)
  } catch (e) {
    console.error(e)
  }
}
const builder = {
  client: {
    welcome: ({ uname = '' }) => {
      return {
        type: TYPES.WELCOME,
        uname
      }
    },
    message: ({ author, createdAt, text = '' }) => {
      return {
        type: TYPES.TO_SERVER,
        author,
        createdAt,
        text
      }
    }
  },
  server: {
    welcome: ({ uname, uid, hbTimeout }) => {
      return {
        type: TYPES.WELCOME,
        uname,
        uid,
        hbTimeout
      }
    },
    message: ({ author, createdAt, text = '' }) => {
      return {
        type: TYPES.TO_CLIENT,
        author,
        createdAt,
        text
      }
    }
  }

}
module.exports = {
  TYPES,
  builder,
  serialize,
  deserialize
}
