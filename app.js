const express = require('express')
const bodyParser = require('body-parser')
const port = 3000 //wss on 8080, http on 3000
const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
require('./routes')(app)

app.listen(port, () => { console.log(`Server started on port ${port}`) })