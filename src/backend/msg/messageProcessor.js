const constants = require('./constants')
const uuid = require('uuid/v4')
const credentials = require('../credentials')
const messages = require('./messages')
const Promise = require('bluebird').Promise
const redis = Promise.promisifyAll(require('redis'))
//this will probably be long
//this processes any message which could come *INTO* the server
//those are questions, responses, and errors
//generae a new room for users to populate
module.exports = async (msg, ws, rootRedis, sockets) => {

    async function createRoom(usn) {

        function getRandomLetter() {
            const letters = 'abcdefghijklmnopqrstuvwxyz'
            return letters[Math.floor((Math.random() * letters.length))]
        }
    
        function getRandomString() {
            return Array(4).fill().map(getRandomLetter).join('')
        }
    
        //recursively spawn more calls until we get a room that is free
        async function getRoom(randomString) {
            const isTaken = await rootRedis.hgetAsync('rooms', randomString)
            if(isTaken) return getRoom(getRandomString())
            return randomString
        }
    
        const randomString = await getRoom(getRandomString())
    
        //we have a free room, now mark it as taken
        await rootRedis.hsetAsync('rooms', usn, randomString)
        return randomString
    }

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
    
    //seems like any persistent stuff relevent to the connection that will not change should go on the ws
    //anything else that is constantly changin (messages, rooms, etc.) and that is not intrinsic to the connection
    //should go into a key value store like redis
    if(msg.validate()) {
        switch(msg.type) {
            //new question, form a uuid, store on redis, notify prof
            case constants.QUESTION:
                //generate and attach a uuid to the incoming object
                //it does not have a message ID coming in, but it does going out
                const id = uuid()
                rootRedis.hsetAsync(id, 'msessage', msg.payload.message, 'student', ws.username) //correlate the message id to the message content and the student who sent

                //get the professor's username using the roomID
                const profUsn = await rootRedis.hgetAsync('rooms', msg.roomID)

                //once you have the prof, get his web socket
                const profWs = sockets[profUsn]
                
                //once you have his websocket, send him the question, render in React
                profWs.send(new messages.QuestionForward(msg, id))
                break

            //allow a person to get into a room
            case constants.ROOM_JOIN:
    
                //first make sure that it is a valid room channel
                const roomID = msg.payload.roomID
                if(await rootRedis.hget('rooms', roomID)) {
                    //subscribe their redis to the room channel
                    ws.redis.subscribeAsync(roomID)
                }
                else {
                    //send error
                }
                break

            //allow a professor to create a new room
            case constants.ROOM_GET:
                //first check to make sure they are a professor
                if(ws.isProfessor) {

                    const roomID = await createRoom(ws.username)
                    const response = new messages.RoomGetResponse(roomID).toString()
                    console.log(response)
                    ws.send(response)
                }
                else {
                    //send error
                    ws.send(new messages.DisconnectResponse("Not a professor").toString())
                }
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

                const validationResponse = await credentials.validate(usn, pwd)

                if(validationResponse.isValid) {
                    sockets[usn] = ws //add to the map of logged in users
                    ws.username = usn
                    ws.authenticated = true
                    ws.redis = redis.createClient()
                    ws.isProfessor = validationResponse.isProfessor

                    ws.send(new messages.LoginResponse(true).toString()) //send login success
                }
                else ws.send(new messages.LoginResponse().toString())
                break
        }
    }
}