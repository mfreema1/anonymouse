const WebSocket = require('ws')

const ws = new WebSocket('ws://localhost:8080')
ws.on('open', () => {
    console.log('Connected to server')
})

ws.on('message', (data) => {
    console.log('Received: ' + data)
})

ws.on('close', () => {
    console.log('Disconnected')
})

ws.on('ping', () => {
    console.log('Ping received')
})