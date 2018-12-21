const constants = require('./constants')
const uuid = require('uuid/v4')
const credentials = require('../credentials')
const messages = require('./messages')
const Promise = require('bluebird').Promise
const redis = Promise.promisifyAll(require('redis'))

const rootRedis = redis.createClient() //each ws gets a redisClient, keep one redis client for the server
const sockets = {}

async function _createRoom() {

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

    //return the free room
    return randomString
}

//process any message which could come *INTO* the server
module.exports = async (msg, ws) => {

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
            case constants.QUESTION_PROPOSAL: {
                //generate and attach a uuid to the incoming object
                //it does not have a message ID coming in, but it does going out
                const id = uuid()
                const message = msg.payload.message

                await rootRedis.hsetAsync(id, 'message', message, 'student', ws.username) //correlate the message id to the message content and the student who sent

                //get the student's room
                const roomID = await rootRedis.hgetAsync('students', ws.username)

                //get the professor's username using the roomID
                const profUsn = await rootRedis.hgetAsync('rooms', roomID)

                //once you have the prof, get his web socket
                const profWs = sockets[profUsn]
                
                //once you have his websocket, send him the question, render in React
                profWs.send(new messages.QuestionForward(message, id).toString())
                break
            }
            //the professor has accepted or rejected the question
            case constants.QUESTION_RESPONSE: {
                //professor approved the question, publish to the channel, TODO: wipe out the message id in the hash
                if(msg.payload.approved) {
                    let [studentUsn, message] = await rootRedis.hmgetAsync(msg.payload.messageID, 'student', 'message')
                    const roomID = await rootRedis.hgetAsync('students', studentUsn)
                    rootRedis.publish(roomID, message)
                }
                else { //rejected, go inform the student of rejection
                    //recall that here, ws represents the professor's socket
                    //use the message ID to get the student
                    let [studentUsn, message] = await rootRedis.hmgetAsync(msg.payload.messageID, 'student', 'message')
                    //from there, get the student's socket
                    const studentWs = sockets[studentUsn]
                    studentWs.send(new messages.QuestionRejection(message, msg.payload.messageID).toString())
                }
            }
            //allow a person to get into a room
            case constants.ROOM_JOIN: {
                const roomID = msg.payload.roomID //recall that const and let are block-scoped, need to use braces with switch to prevent it jumping up
                //first make sure that it is a valid room channel
                if(await rootRedis.hgetAsync('rooms', roomID)) {
                    //subscribe their redis to the room channel
                    await ws.redis.subscribeAsync(roomID)
                    //assign them to the room in the redis hash
                    await rootRedis.hsetAsync('students', ws.username, roomID)
                    ws.send(new messages.RoomJoinResponse(true, roomID).toString())
                }
                else {
                    //send error
                    ws.send(new messages.RoomJoinResponse(false, roomID).toString())
                }
                break
            }
            //allow a professor to create a new room
            case constants.ROOM_GET: {
                //first check to make sure they are a professor
                if(ws.isProfessor) {

                    const roomID = await _createRoom()
                    await rootRedis.hset('rooms', roomID, ws.username)
                    ws.send(new messages.RoomGetResponse(roomID).toString())
                }
                else {
                    //send error
                    ws.send(new messages.DisconnectResponse("Not a professor, cannot open a room").toString())
                    ws.close()
                }
                break
            }
            //response from the prof, either reject or accept
            case constants.RESPONSE: {
                //we have taken the response, look up the message ID, find the student and room

                //get the student's websocket, send him the notification
                break
            }
            //error, was not understood by client, log it in mongo capped collection
            case constants.ERROR: {
                //take error payload, just log into mongo capped collection
                break
            }
            case constants.LOGIN: {
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

                    //configure their redis to send them a message when their
                    //channel gets published
                    ws.redis.on('message', (channel, msg) => {
                        ws.send(new messages.QuestionAcceptance(msg).toString())
                    })

                    ws.send(new messages.LoginResponse(true).toString()) //send login success
                }
                else {
                    ws.send(new messages.LoginResponse().toString())
                    ws.send(new messages.DisconnectResponse("Invalid credentials supplied").toString())
                    ws.close()
                }
                break
            }
        }
    }
}