const TYPES = {
    WELCOME: 'WELCOME',
    TO_SERVER: 'TO_SERVER',
    TO_CLIENT: 'TO_CLIENT'
}
const serialize = x => {
    try{
        return JSON.stringify(x)
    }
    catch(e) {
        console.error(e)
    }
}
const deserialize = x => {
    try{
        return JSON.parse(x)
    }
    catch(e) {
        console.error(e)
    }
}
const builder = {
    client: {
        welcome: ({uname = ''}) => {
            return {
                type: TYPES.WELCOME,
                uname
            }
        },
        message: ({uid, text = ''}) => {
            return {
                type: TYPES.TO_SERVER,
                uid,
                text
            }
        }
    },
    server: {
        welcome: ({uname, uid, hb_timeout}) => {
            return {
                type: TYPES.WELCOME,
                uname,
                uid,
                hb_timeout
            }
        },
        message: ({text = ''}) => {
            return {
                type: TYPES.TO_CLIENT,
                text
            }
        },
    }
    
}
module.exports = {
    TYPES,
    builder,
    serialize,
    deserialize
}