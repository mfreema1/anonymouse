const WebSocket = require('ws')
const express = require('express')
const app = express() //setup routes on top of this
const ports = {
    'http': 3000,
    'ws': 8080
}
//we put a websocket server on 8080
//and an http server on 3000

const wss = new WebSocket.Server({ port: ports.ws, server: app })

let clients = new Set()
const noop = () => {}
const heartbeat = (ws) => {
    ws.isAlive = true
}

//wss is the websocket server
//ws is the websocket client
wss.on('connection', (ws, req) => {
    ws.isAlive = true
    const clientIP = req.connection.remoteAddress
    if(clients.has(clientIP)) {
        ws.send('Already connected, please stop')
        ws.close()
    }
    else {
        clients.add(clientIP)
        ws.send('Hey, welcome!')
    }

    //if the client disconnects, remove from client pool
    ws.on('close', () => {
        clients.delete(clientIP)
    })

    ws.on('pong', () => { heartbeat(ws) })
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

app.listen(ports.http, () => { console.log('Server started...')})