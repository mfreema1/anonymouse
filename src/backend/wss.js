const WebSocket = require('ws')
const Promise = require('bluebird').Promise
const redis = Promise.promisifyAll(require('redis'))
const processMessage = require('./msg/messageProcessor')
const port = 8080;

function noop() {}

function heartbeat(ws) {
    ws.isAlive = true
}

//each websocket gets a redis client.  We then wait for message
//events to that redis client.  Also, we use one redis client for
//the web socket server itself
//can set { clientTracking: false } to remove wss.clients
const wss = new WebSocket.Server({ port }) //don't collect clients, we don't intend to broadcast like this
const rootRedis = redis.createClient()
 //keep track of the connected sockets

//configure events on the server
//wss is the websocket server
//ws is the websocket client
wss.on('connection', async (ws, req) => {
    ws.isAlive = true
    //get unique identifier of connection

    //when the connection is open, ask for a set of credentials (start login handshake)
    //will need to include this in our message schemas as well

    //this is because our application is not the only one that can act as a websocket client to this
    //server.  Anyone knowing the username of a user could impersonate them by simply launching a websocket
    //request to this server.  Must begin the interaction with a login.  What we can do is for the first message of a socket,
    //check to see if it is a login attempt.  If it isn't drop them immediately.  If it 
    
    //firstly, make sure that this IP is not already connected
    const clientIP = req.connection.remoteAddress
    const isMember = await rootRedis.sismemberAsync('clients', clientIP)
    if(isMember) {
        ws.send('Already connected, please stop')
        ws.close()
    }
    else {
        await rootRedis.saddAsync('clients', clientIP)
        ws.authenticated = false //we wait until they are authed to check for anything but a login
        ws.redis = redis.createClient()
        //CONCLUSION: we need to give everyone a redis client, otherwise there is no real difference
        //between simply storing a set on redis and using that to push updates via iteration

        //if the client disconnects, remove from client pool
        ws.on('close', () => { 
            //looks like we may need to use function() to keep 'this' reference
            //this.identifier remove from sockets
            rootRedis.sremAsync('clients', clientIP)
        })

        //listen for messages from a particular client
        ws.on('message', (msg) => { processMessage(msg, ws, rootRedis) })

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
        const isTaken = await rootRedis.sismemberAsync('rooms', randomString)
        if(isTaken) return getRoom(getRandomString())
        return randomString
    }

    const randomString = await getRoom(getRandomString())

    //we have a free room, now mark it as taken
    await rootRedis.saddAsync('rooms', randomString)
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