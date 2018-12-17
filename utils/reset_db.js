const mariadb = require('mariadb')
const dbConfig = require('../secret').dbConfig

const drop_users = "DROP TABLE IF EXISTS users"
//using SHA256 means that it is 256 bits -- 64 hex characters
const make_users = "CREATE TABLE users (username CHAR(64), password CHAR(64))"
//"oh", "hi"
const dummy_creds = 'INSERT INTO users VALUES ("e3e710fdf45f3f8a0cae5c3f520d767abdff0f417892bb49a220e4962ccb643d", "d5c41f3af7fec8eed2ff49eab74c54751bc596a20bac0b8b78a9945666feaa83")'

async function reset(){
    const conn = await mariadb.createConnection(dbConfig)
    await conn.query(drop_users)
    await conn.query(make_users)
    await conn.query(dummy_creds)
    conn.end()
}

reset()