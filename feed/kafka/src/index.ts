import { Kafka } from 'kafkajs'
import mysql from 'mysql2/promise'
import { v4 as uuidv4 } from 'uuid'
import { ChromaClient, Collection } from 'chromadb'
import OpenAI from 'openai'

const CHROMA_PATH = process.env.CHROMA_PATH || 'localhost:8000'

const chromaClient = new ChromaClient({
    path: CHROMA_PATH,
})

let chromaCollection: Collection

const openai = new OpenAI({
    apiKey:
        process.env.OPENAI_API_KEY ||
        'sk-proj-4NVarOvVhmR49eQKetDUT3BlbkFJtp7CAREikT7sAUlWkmBu',
})

const KAFKA_URL = process.env.KAFKA_URL || 'localhost:29092'
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'posts'

const kafka = new Kafka({
    clientId: 'consumer',
    brokers: [KAFKA_URL],
})

const consumer = kafka.consumer({ groupId: 'nets-2120' })

const TUNNEL_URL = process.env.TUNNEL_URL || 'localhost:9092'
const TUNNEL_FEDERATED_POSTS_TOPIC =
    process.env.TUNNEL_FEDERATED_POSTS_TOPIC || 'FederatedPosts'
const TUNNEL_TWITTER_TOPIC = process.env.TUNNEL_TWITTER_TOPIC || 'Twitter-Kafka'

const tunnelKafka = new Kafka({
    clientId: 'tunnel',
    brokers: [TUNNEL_URL],
})

const tunnelConsumer = tunnelKafka.consumer({
    groupId: 'nets-2120-group-42',
})

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost'
const MYSQL_USER = process.env.MYSQL_USER || 'user'
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || 'password'
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'nets2120'

let dbConnection: mysql.Connection

const setUpMysql = async () => {
    console.log(
        'Setting up MySQL',
        MYSQL_HOST,
        MYSQL_USER,
        MYSQL_PASSWORD,
        MYSQL_DATABASE
    )

    dbConnection = await mysql.createConnection({
        host: MYSQL_HOST,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: MYSQL_DATABASE,
    })

    await dbConnection.connect()
}

function findHashtags(text) {
    const regex = /#\w+/g
    return text.match(regex) || []
}

const addTextToChroma = async (post_uuid, text) => {
    console.log('Generating and storing embeddings for post:', post_uuid, text)
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
    })

    await chromaCollection.add({
        ids: [post_uuid],
        embeddings: [embedding.data[0].embedding],
    })
}

const processPost = async (post) => {
    console.log('Processing post', post)

    if (!post.post_text || !post.user_uuid) {
        console.log('Invalid post')
        return
    }

    if (!post.content_type) {
        post.content_type = 'none'
    }

    console.log('Inserting post')
    await dbConnection.execute(
        `INSERT INTO posts (uuid, user_uuid, text, content_type) VALUES (?, ?, ?, ?)`,
        [post.uuid, post.user_uuid, post.post_text, post.content_type]
    )

    console.log('Finding hashtags')
    const hashtags = findHashtags(post.post_text)

    if (hashtags.length !== 0) {
        console.log('Inserting hashtags')
        await dbConnection.execute(
            `INSERT IGNORE INTO hashtags (hashtag) VALUES ${hashtags.map(() => '(?)').join(', ')}`,
            hashtags
        )

        console.log('Inserting post hashtags')
        await dbConnection.execute(
            `INSERT INTO post_hashtags (uuid, hashtag) VALUES ${hashtags.map(() => '(?, ?)').join(', ')}`,
            hashtags.flatMap((hashtag) => [post.uuid, hashtag])
        )
    }

    await addTextToChroma(post.uuid, post.post_text)

    console.log(`Processed post ${post.uuid}`)
}

const processFederatedPost = async (post) => {
    console.log('Processing federated post', post)

    if (!post.post_text || !post.username || !post.source_site) {
        console.log('Invalid post')
        return
    }

    if (post.source_site === 'g47') {
        console.log('Ignoring federated post from us')
        return
    }

    if (!post.content_type) {
        post.content_type = 'none'
    }

    const res = await dbConnection.execute(
        `SELECT uuid FROM users WHERE username = ?`,
        [post.username + '@' + post.source_site]
    )

    const users = res[0] as { uuid: string }[]

    let user_uuid = null
    if (users.length > 0) {
        console.log('User already exists')
        user_uuid = users[0].uuid
        return
    } else {
        console.log('User does not exist')
        user_uuid = uuidv4()

        await dbConnection.execute(
            `INSERT INTO users (uuid, username, email, hashed_password, full_name, actor_id, affiliation, birthday) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)`,
            [
                user_uuid,
                post.username + '@' + post.source_site,
                post.username + '@example.com',
                'password',
                post.username,
            ]
        )
    }

    const post_uuid = uuidv4()

    await dbConnection.execute(
        `INSERT INTO posts (uuid, user_uuid, text, content_type) VALUES (?, ?, ?, ?)`,
        [post_uuid, user_uuid, post.post_text, post.content_type]
    )

    const hashtags = findHashtags(post.post_text)

    if (hashtags.length !== 0) {
        await dbConnection.execute(
            `INSERT IGNORE INTO hashtags (hashtag) VALUES ${hashtags.map(() => '(?)').join(', ')}`,
            hashtags
        )

        await dbConnection.execute(
            `INSERT INTO post_hashtags (uuid, hashtag) VALUES ${hashtags.map(() => '(?, ?)').join(', ')}`,
            hashtags.flatMap((hashtag) => [post_uuid, hashtag])
        )
    }

    await addTextToChroma(post_uuid, post.post_text)

    console.log(`Processed federated post ${post_uuid}`)
}

const processTwitterPost = async (post) => {
    console.log('Processing twitter post', post)

    const res = await dbConnection.execute(
        `SELECT uuid FROM users WHERE username = ?`,
        [post.username + '@twitter']
    )

    const users = res[0] as { uuid: string }[]

    let user_uuid = null
    if (users.length > 0) {
        console.log('User already exists')
        user_uuid = users[0].uuid
        return
    } else {
        console.log('User does not exist')
        user_uuid = uuidv4()

        await dbConnection.execute(
            `INSERT INTO users (uuid, username, email, hashed_password, full_name, actor_id, affiliation, birthday) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)`,
            [
                user_uuid,
                post.username + '@twitter',
                post.username + '@example.com',
                'password',
                post.username,
            ]
        )
    }

    const post_uuid = uuidv4()

    await dbConnection.execute(
        `INSERT INTO posts (uuid, user_uuid, text, content_type) VALUES (?, ?, ?, ?)`,
        [post_uuid, user_uuid, post.text, 'text/plain']
    )

    const hashtags = findHashtags(post.text)

    if (hashtags.length !== 0) {
        await dbConnection.execute(
            `INSERT IGNORE INTO hashtags (hashtag) VALUES ${hashtags.map(() => '(?)').join(', ')}`,
            hashtags
        )

        await dbConnection.execute(
            `INSERT INTO post_hashtags (uuid, hashtag) VALUES ${hashtags.map(() => '(?, ?)').join(', ')}`,
            hashtags.flatMap((hashtag) => [post_uuid, hashtag])
        )
    }

    await addTextToChroma(post_uuid, post.text)

    console.log(`Processed twitter post ${post_uuid}`)
}

const processMessage = async ({ topic, message }) => {
    console.log('Received message', topic, message.value.toString())
    try {
        const post = JSON.parse(message.value.toString())

        if (topic === KAFKA_TOPIC) {
            await processPost(post)
        } else if (topic === TUNNEL_FEDERATED_POSTS_TOPIC) {
            await processFederatedPost(post)
        } else if (topic === TUNNEL_TWITTER_TOPIC) {
            await processTwitterPost(post)
        }
    } catch (e) {
        console.error('Error parsing message', e)
        return
    }
}

const run = async () => {
    await setUpMysql()

    chromaCollection = await chromaClient.getOrCreateCollection({
        name: 'posts',
    })

    console.log(chromaCollection.id)

    await consumer.connect()
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true })

    await consumer.run({
        eachMessage: processMessage,
    })

    console.log('Consumer running')

    await tunnelConsumer.connect()
    await tunnelConsumer.subscribe({
        topic: TUNNEL_FEDERATED_POSTS_TOPIC,
        fromBeginning: true,
    })

    await tunnelConsumer.run({
        eachMessage: processMessage,
    })
}

run().catch(console.error)
