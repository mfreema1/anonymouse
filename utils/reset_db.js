const mariadb = require('mariadb')
const dbConfig = require('../secret').dbConfig

const drop_users = "DROP TABLE IF EXISTS users"
//using SHA256 means that it is 256 bits -- 64 hex characters
const make_users = "CREATE TABLE users (username CHAR(64), password CHAR(64), isProfessor BOOLEAN)"
//"profDummy", "profDummyPass"
const dummy_prof_creds = 'INSERT INTO users VALUES ("ea412a4dbccd6c5dfaba59a0030c19d3b37b76cfff1e7d0947a7c75872403275", "9a1b999b010e599c50d4205414d2c128e9d6b741ab06c4b1c9f981dfaadf01cf", true)'

//"studentDummy", "studentDummyPass"
const dummy_student_creds = 'INSERT INTO users VALUES ("b0559f7d7f2b32b717524102f156c4a256af38c4f1b2fba7c5bf1da44a64f0e9", "18fcccc0211813747ee2d8da3d0f8d6462a00a6fee72f7cc793291a6906d1f72", false)'

async function reset(){
    const conn = await mariadb.createConnection(dbConfig)
    await conn.query(drop_users)
    await conn.query(make_users)
    await conn.query(dummy_prof_creds)
    await conn.query(dummy_student_creds)
    conn.end()
}

reset()