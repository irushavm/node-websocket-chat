'use strict'
exports.__esModule = true
var payloadType;
(function (payloadType) {
  payloadType['WELCOME'] = 'welcome'
  payloadType['TO_SERVER'] = 'to_server'
  payloadType['TO_CLIENT'] = 'to_client'
})(payloadType = exports.payloadType || (exports.payloadType = {}))
exports.serialize = function (x) {
  try {
    return JSON.stringify(x)
  } catch (e) {
    console.error(e)
  }
}
exports.deserialize = function (x) {
  try {
    return JSON.parse(x)
  } catch (e) {
    console.error(e)
  }
}
exports.builder = {
  toServer: {
    welcome: function (_a) {
      var uname = _a.uname
      return ({
        type: payloadType.WELCOME,
        uname: uname
      })
    },
    message: function (_a) {
      var uid = _a.uid; var createdAt = _a.createdAt; var _b = _a.text; var text = _b === void 0 ? '' : _b
      return ({
        type: payloadType.TO_SERVER,
        uid: uid,
        createdAt: createdAt,
        text: text
      })
    }
  },
  toClient: {
    welcome: function (_a) {
      var uname = _a.uname; var uid = _a.uid; var hbTimeout = _a.hbTimeout
      return ({
        type: payloadType.WELCOME,
        uname: uname,
        uid: uid,
        hbTimeout: hbTimeout
      })
    },
    message: function (_a) {
      var author = _a.author; var createdAt = _a.createdAt; var _b = _a.text; var text = _b === void 0 ? '' : _b
      return ({
        type: payloadType.TO_CLIENT,
        author: author,
        createdAt: createdAt,
        text: text
      })
    }
  }
}
