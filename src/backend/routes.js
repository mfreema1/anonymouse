const wss = require('./wss')
wss.createServer();

module.exports = (app) => {
    app.get('/professor', (req, res) => {
        //provide form page to create room
    })

    app.get('/student', (req, res) => {
        //provide form page to join room
    })

    app.post('/professor', async (req, res) => {
        //examine credentials in body
        const usn = req.body.username
        const pwd = req.body.password

        //if the credentials are correct, spawn a room, give the id back to the professor
        const roomCode = await wss.createRoom()
        res.send(roomCode)
    })
}