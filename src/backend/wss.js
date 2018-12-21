const WebSocket = require('ws')
const processMessage = require('./msg/messageProcessor')
const port = 8080;

function noop() {}

function heartbeat(ws) {
    ws.isAlive = true
}

const wss = new WebSocket.Server({ port })

wss.on('connection', async (ws, req) => {
    ws.isAlive = true
    ws.authenticated = false //wait until authed to give them a redis client

    ws.on('message', (msg) => { processMessage(msg, ws) })

    ws.on('pong', () => { heartbeat(ws) })
})

//every 5 seconds, ping all clients for broken connections
setInterval(() => {
    wss.clients.forEach((ws) => {
        //set the flag to false, a response (pong) will set back to true
        if(!ws.isAlive) return ws.terminate()
        ws.isAlive = false
        ws.ping(noop)
    })
}, 5000)

//TODO List
//1. If professor logs in from a new IP, terminate the old ws
//3. Allow professors to accept/reject questions as they come in
//4. Inform student of accept/reject
//5. If accepted, publish to room channel