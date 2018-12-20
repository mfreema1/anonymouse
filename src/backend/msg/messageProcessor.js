//so HTTP gives you the option to specify a path/method with requests,
//which gives you control flow off the bat
const constants = require('./constants')
const uuid = require('uuid/v4')
const credentials = require('../credentials')
const messages = require('./messages') //could also use import {} from './messages'
//here is where we handle the specific actions associated with each form of message
//this will probably be long
//this processes any message which could come *INTO* the server
//those are questions, responses, and errors
module.exports = async (msg, ws, rootRedis) => {

    try {
        msg = new messages.Message(JSON.parse(msg))
    }
    catch(err) {
        ws.send(new messages.ErrorResponse("Could not parse as JSON", msg)) //does this work? will it get reassigned if fails? I think not
        console.log(err)
    }

    if(!ws.authenticated) {
        if(!(msg.type === constants.LOGIN)) {
            ws.send(new messages.DisconnectResponse("Your first message must authenticate").toString())
            return ws.close()
        }
    }
    
    if(msg.validate()) {
        switch(msg.type) {
            //new question, form a uuid, store on redis, notify prof
            case constants.QUESTION:
                //generate and attach a uuid to the incoming object
                //it does not have a message ID coming in, but it does going outs
                msg.messageID = uuid()
                //look up the professor using the room code, using root redis connection
                const prof = await rootRedis.getAsync(msg.roomID)
                //once you have the prof, get his web socket
                
                //once you have his websocket, send him the question, render in React
                break
            //response from the prof, either reject or accept
            case constants.RESPONSE:
                //we have taken the response, look up the message ID, find the student and room

                //get the student's websocket, send him the notification
                break
            //error, was not understood by client, log it in mongo capped collection
            case constants.ERROR:
                //take error payload, just log into mongo capped collection
                break

            case constants.LOGIN:
                //extract the username and password from the message
                //authenticate
                const usn = msg.payload.username
                const pwd = msg.payload.password

                const isValid = await credentials.validate(usn, pwd)
                if(isValid) {
                    ws.authenticated = true
                    ws.send(new messages.LoginResponse(true).toString()) //send login success
                }
                else ws.send(new messages.LoginResponse().toString())
                break
        }
    }
}