const wss = require('./wss')
const credentials = require('./credentials')

module.exports = (app) => {

    app.get('/professor', (req, res) => {
        //provide form page to create room

        //just serve a dummy file for now to test client side API
        res.sendFile(`${__dirname}/dummyclient.html`)
    })

    app.get('/student', (req, res) => {
        //provide form page to join room
    })

    app.post('/professor', async (req, res) => {
        //examine credentials in body
        const usn = req.body.username
        const pwd = req.body.password

        //authenticate
        const isValid = await credentials.validate(usn, pwd)

        if(isValid) {
            //if the credentials are correct, spawn a room, give the id back to the professor
            const roomCode = await wss.createRoom()
            res.send(roomCode)
        }
        else res.send('Credentials invalid')
    })
}