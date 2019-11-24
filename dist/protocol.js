"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var payloadType;
(function (payloadType) {
    payloadType["WELCOME"] = "welcome";
    payloadType["TO_SERVER"] = "to_server";
    payloadType["TO_CLIENT"] = "to_client";
})(payloadType = exports.payloadType || (exports.payloadType = {}));
exports.serialize = (x) => {
    try {
        return JSON.stringify(x);
    }
    catch (e) {
        console.error(e);
    }
};
exports.deserialize = (x) => {
    try {
        return JSON.parse(x);
    }
    catch (e) {
        console.error(e);
    }
};
exports.builder = {
    toServer: {
        welcome: ({ uname }) => ({
            type: payloadType.WELCOME,
            uname
        }),
        message: ({ uid, createdAt, text = '' }) => ({
            type: payloadType.TO_SERVER,
            uid,
            createdAt,
            text
        })
    },
    toClient: {
        welcome: ({ uname, uid, hbTimeout }) => ({
            type: payloadType.WELCOME,
            uname,
            uid,
            hbTimeout
        }),
        message: ({ author, createdAt, text = '' }) => ({
            type: payloadType.TO_CLIENT,
            author,
            createdAt,
            text
        })
    }
};
