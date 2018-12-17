const WebSocket = require('ws')
const Promise = require('bluebird').Promise
const redis = Promise.promisifyAll(require('redis'))
const port = 8080;

function noop() {}

function heartbeat(ws) {
    ws.isAlive = true
}

//each websocket gets a redisClient.  We then wait for message
//events to that redis client.  Also, we use one redis client for
//the web socket server itself
const wss = new WebSocket.Server({ port })
const redisClient = redis.createClient()

//configure events on the server
//wss is the websocket server
//ws is the websocket client
wss.on('connection', async (ws, req) => {
    ws.isAlive = true
    const clientIP = req.connection.remoteAddress
    const isMember = await redisClient.sismemberAsync('clients', clientIP)
    if(isMember) {
        ws.send('Already connected, please stop')
        ws.close()
    }
    else {
        await redisClient.saddAsync('clients', clientIP)
        ws.send('Hey welcome!')
        ws.on('close', () => { //if the client disconnects, remove from client pool
            redisClient.sremAsync('clients', clientIP)
        })
        ws.on('pong', () => { heartbeat(ws) })
    }      
})

//every 5 seconds, ping all clients for broken connections,
//if we didn't hear back from the last ping in the time limit,
//drop them
setInterval(() => {
    wss.clients.forEach((ws) => {
        //set the flag to false, a response (pong) will set back to true
        if(!ws.isAlive) return ws.terminate()
        ws.isAlive = false
        ws.ping(noop)
    })
}, 5000)

//credentials for the professor have been validated, really all we need to do is generate a random
//room code and go check to see if that room is taken.  Keep doing this until we get one that isn't
//taken, then mark it as taken
async function createRoom() {

    function getRandomLetter() {
        const letters = 'abcdefghijklmnopqrstuvwxyz'
        return letters[Math.floor((Math.random() * letters.length))]
    }

    function getRandomString() {
        return Array(4).fill().map(getRandomLetter).join('')
    }

    //recursively spawn more calls until we get a room that is free
    async function getRoom(randomString) {
        const isTaken = await redisClient.sismemberAsync('rooms', randomString)
        if(isTaken) return getRoom(getRandomString())
        return randomString
    }

    const randomString = await getRoom(getRandomString())

    //we have a free room, now mark it as taken
    await redisClient.saddAsync('rooms', randomString)
    return randomString
}

module.exports = {
    createRoom
}

//TODO List
//1. If professor logs in from a new IP, terminate the old ws
//2. Allow a student to connect to a room, subscribe them to channel
//3. Allow professors to accept/reject questions as they come in
//4. Inform student of accept/reject
//5. If accepted, publish to room channel

//Proposed message formats

//Student to professor
/**
    {
        roomID: "",
        username: "",
        message: ""
    }
 */

//Once received, cache the message on the server until we get an
//approval or denial from the professor, max of 30 minutes

//Professor response to student
/**
    {
        roomID: "",
        messageID: "",
        approved: bool
    }
 */