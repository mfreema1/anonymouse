const WebSocket = require('ws')
const Promise = require('bluebird').Promise
const redis = Promise.promisifyAll(require('redis'))
const port = 8080;

let wss; //turn into a class? is it necessary?
let redisClient;

//app represents the http server with which the wss will speak
function createServer(app) {

    function noop(){}

    function heartbeat(ws) {
        ws.isAlive = true
    }

    //singleton
    if(wss) return wss
    wss = new WebSocket.Server({ port, server: app })
    redisClient = redis.createClient()

    //configure events on the server
    //wss is the websocket server
    //ws is the websocket client
    wss.on('connection', async (ws, req) => {
        ws.isAlive = true
        const clientIP = req.connection.remoteAddress
        redisClient.sismemberAsync('clients', clientIP)
            .then((isMember) => {
                if(isMember) {
                    ws.send('Already connected, please stop')
                    ws.close()
                }
                else {
                    redisClient.saddAsync('clients', clientIP)
                        .then(() => {
                            ws.send('Hey welcome!')
                            ws.on('close', () => { //if the client disconnects, remove from client pool
                                redisClient.sremAsync('clients', clientIP)
                            })
                            ws.on('pong', () => { heartbeat(ws) })
                        })
                }
            })        
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
}

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
    function getRoom(randomString) {
        return redisClient.sismemberAsync('rooms', randomString)
            .then((isTaken) => {
                if(isTaken) return getRoom(getRandomString())
                else return randomString
            })
    }

    const randomString = await getRoom(getRandomString())

    //we have a free room, now mark it as taken
    await redisClient.saddAsync('rooms', randomString)
    return randomString
}

module.exports = {
    createServer,
    createRoom
}