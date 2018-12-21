module.exports = {
    "QUESTION_PROPOSAL": "question proposal",
    "QUESTION_FORWARD": "question forward",
    "QUESTION_ACCEPTANCE": "question acceptance",
    "QUESTION_CONFIRMATION": "question confirmation",
    "QUESTION_RESPONSE": "question response",
    "QUESTION_REJECTION": "question rejection",
    "EXPIRY": "expiry",
    "DISCONNECT": "disconnect",
    "ERROR": "error",
    "LOGIN": "login",
    "LOGIN_RESPONSE": "login response",
    "ROOM_JOIN": "room join",
    "ROOM_JOIN_RESPONSE": "room join response",
    "ROOM_GET": "room get",
    "ROOM_GET_RESPONSE": "room get response"
}

//Inform the professor that a question has expired, remove
//from client
/**
    {
        type: "expiry",
        payload: {
            messageID: "" //uuidv4
        }
    }
*/

//Inform the user that they have been disconnected from the room,
//perhaps by signing in from a different IP
/**
    {
        type: "disconnect",
        payload: {
            roomID: "",
            reason: ""
        }
    }
*/

//Notify the server that a message was not understood, store this
//for logging purposes
/**
    {
        type: "error",
        payload: { //payload that caused error

        }
    }
*/