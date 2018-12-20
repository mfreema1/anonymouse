const constants = require('./constants')
const v = require('jsonschema').validate
const schemas = require('./schemas')

//this really only needs to be a message and then some response objects.  We
//don't actually need to model the incoming requests, only the outgoing ones
class Message {

    //payload represents an object
    //type represents one of a predefined list of allowed types that
    //specifies the form of the payload
    constructor({type, payload}) {
        this.type = type
        this.payload = payload
    }

    //returns true if valid schema, false if invalid
    validate() {
        if(!(this.type in schemas)) throw "Unsupported message type"        
        return v(this.payload, schemas[this.type]).errors.length === 0
    }

    toString() {
        return JSON.stringify({
            type: this.type,
            payload: this.payload
        })
    }
}

class DisconnectResponse extends Message {

    constructor(reason) {
        super({ type: constants.DISCONNECT, payload: { reason }})
    }
}

class ErrorResponse extends Message {

    constructor(reason, data) {
        super({ type: constants.ERROR, payload: { reason, data }})
    }
}

class LoginResponse extends Message {

    constructor(approved = false) {
        super({ type: constants.LOGIN_RESPONSE, payload: { approved }})
    }
}

module.exports = {
    Message,
    DisconnectResponse,
    ErrorResponse,
    LoginResponse
}