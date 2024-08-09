import mysql from 'mysql2/promise'

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost'
const MYSQL_USER = process.env.MYSQL || 'user'
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || 'password'
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'nets2120'

let dbConnection: mysql.Connection

const MYSQL_RESET_TABLES = process.env.MYSQL_RESET_TABLES === 'true'

const setUpMysql = async () => {
    dbConnection = await mysql.createConnection({
        host: MYSQL_HOST,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: MYSQL_DATABASE,
    })

    await dbConnection.connect()

    if (MYSQL_RESET_TABLES) {
        console.warn('Resetting MySQL tables')
        await dbConnection.execute(
            'DROP TABLE IF EXISTS actors, users, friends, posts, likes, comments, hashtags, post_hashtags, user_hashtags, rankings, chat_members, chat_sessions, chat_invites, messages;'
        )
    }

    // Profiles
    await dbConnection.execute(
        'CREATE TABLE IF NOT EXISTS actors ( \
            nconst VARCHAR(10), \
            PRIMARY KEY (nconst) \
        );'
    )

    await dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS users (
            uuid VARCHAR(255) PRIMARY KEY,
            username VARCHAR(255),
            email VARCHAR(255), \
            hashed_password VARCHAR(255), \
            full_name VARCHAR(255), \
            actor_id VARCHAR(10), \
            affiliation VARCHAR(255), \
            birthday VARCHAR(10), \
            FOREIGN KEY (actor_id) REFERENCES actors(nconst) \
        )`
    )

    await dbConnection.execute(
        'CREATE TABLE IF NOT EXISTS friends ( \
            followed VARCHAR(255), \
            follower VARCHAR(255), \
            FOREIGN KEY (follower) REFERENCES users(uuid), \
            FOREIGN KEY (followed) REFERENCES users(uuid) \
        );'
    )

    // Feed
    await dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS posts (
            uuid VARCHAR(255) PRIMARY KEY,
            user_uuid VARCHAR(255),
            text TEXT,
            content_type VARCHAR(255),
            FOREIGN KEY (user_uuid) REFERENCES users(uuid)
        );`
    )

    await dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS likes (
            post_uuid VARCHAR(255),
            user_uuid VARCHAR(255),
            PRIMARY KEY (post_uuid, user_uuid),
            FOREIGN KEY (post_uuid) REFERENCES posts(uuid),
            FOREIGN KEY (user_uuid) REFERENCES users(uuid)
        );`
    )

    await dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS comments (
            uuid VARCHAR(255) PRIMARY KEY,
            post_uuid VARCHAR(255),
            user_uuid VARCHAR(255),
            text TEXT,
            FOREIGN KEY (post_uuid) REFERENCES posts(uuid),
            FOREIGN KEY (user_uuid) REFERENCES users(uuid)
        );`
    )

    await dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS hashtags (
            hashtag VARCHAR(255) PRIMARY KEY
        );`
    )

    await dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS post_hashtags (
            post_uuid VARCHAR(255),
            hashtag VARCHAR(255),
            PRIMARY KEY (post_uuid, hashtag),
            FOREIGN KEY (post_uuid) REFERENCES posts(uuid),
            FOREIGN KEY (hashtag) REFERENCES hashtags(hashtag)
        );`
    )

    await dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS user_hashtags (
            user_uuid VARCHAR(255),
            hashtag VARCHAR(255),
            PRIMARY KEY (user_uuid, hashtag),
            FOREIGN KEY (user_uuid) REFERENCES users(uuid),
            FOREIGN KEY (hashtag) REFERENCES hashtags(hashtag)
        );`
    )

    await dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS rankings (
            source VARCHAR(255),
            destination VARCHAR(255),
            score DOUBLE,
            PRIMARY KEY (source, destination)
        );`
    )

    dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS chat_sessions (
            uuid VARCHAR(255) PRIMARY KEY,
            group_chat BOOLEAN NOT NULL,
            name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    )

    dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS chat_members (
            chat_uuid VARCHAR(255) NOT NULL,
            user_uuid VARCHAR(255) NOT NULL,
            PRIMARY KEY (chat_uuid, user_uuid),
            FOREIGN KEY (chat_uuid) REFERENCES chat_sessions(uuid),
            FOREIGN KEY (user_uuid) REFERENCES users(uuid)
        )`
    )

    dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS chat_invites (
            chat_uuid VARCHAR(255) NOT NULL,
            sender_uuid VARCHAR(255) NOT NULL,
            recipient_uuid VARCHAR(255) NOT NULL,
            PRIMARY KEY (chat_uuid, recipient_uuid),
            FOREIGN KEY (chat_uuid) REFERENCES chat_sessions(uuid),
            FOREIGN KEY (sender_uuid) REFERENCES users(uuid),
            FOREIGN KEY (recipient_uuid) REFERENCES users(uuid)
        )`
    )

    dbConnection.execute(
        `CREATE TABLE IF NOT EXISTS messages (
            uuid VARCHAR(255) PRIMARY KEY,
            sender_uuid VARCHAR(255) NOT NULL,
            chat_uuid VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_uuid) REFERENCES users(uuid),
            FOREIGN KEY (chat_uuid) REFERENCES chat_sessions(uuid)
        )`
    )

    console.log('MySQL connected')
}

export { dbConnection, setUpMysql }
