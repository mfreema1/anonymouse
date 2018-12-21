const constants = require('./constants')
const v = require('jsonschema').validate
const schemas = require('./schemas')

//all incoming messages are simply modeled as a message
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

//all outgoing messages are modeled like this for convenience
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

class QuestionConfirmation extends Message {

    constructor(message, messageID) {
        super({ type: constants.CONFIRMATION, payload: { message, messageID }})
    }
}

class QuestionForward extends Message {

    constructor(question, messageID) {
        question.messageID = messageID
        super({ type: constants.QUESTION_FORWARD, payload: question })
    }
}

class QuestionResponse extends Message {
    
    constructor(messageID, approved) {

    }
}

class RoomGetResponse extends Message {

    constructor(roomID) {
        super({ type: constants.ROOM_RESPONSE, payload: { roomID }})
    }
}

class RoomJoinResponse extends Message {
    
    constructor(approved, roomID) {
        super({ type: constants.ROOM_JOIN_RESPONSE, payload: { approved, roomID }})
    }
}

module.exports = {
    Message,
    DisconnectResponse,
    ErrorResponse,
    LoginResponse,
    QuestionConfirmation,
    QuestionForward,
    QuestionResponse,
    RoomGetResponse,
    RoomJoinResponse
}