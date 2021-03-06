const dbConfig = require('../../secret').dbConfig
const mariadb = require('mariadb')
const crypto = require('crypto')

function _sha256(secret) {
    return crypto.createHmac('sha256', secret)
}

async function validate(usn, pwd) {

    const conn = await mariadb.createConnection(dbConfig)
    const usnHash = _sha256(usn).digest('hex')
    
    let isValid, isProfessor = false
    const res = await conn.query(`SELECT password, isProfessor FROM users WHERE (username = "${usnHash}")`)
    if(res.length === 1) {
        const pwdHash = _sha256(pwd).digest() //need buffer
        isValid = crypto.timingSafeEqual(pwdHash, Buffer.from(res[0].password, 'hex'))
        if(isValid) isProfessor = res[0].isProfessor
    }

    await conn.end()
    return { isValid, isProfessor }
}

module.exports = {
    validate
}