import { chromaPostsCollection } from '../../utils/chroma.ts'
import { dbConnection } from '../../utils/mysql.ts'
import { openai } from '../../utils/openai.ts'
import { getPostService } from '../services/postServices.ts'

const schema = `
CREATE TABLE IF NOT EXISTS actors ( \
    nconst VARCHAR(10), \
    PRIMARY KEY (nconst) \
);

CREATE TABLE IF NOT EXISTS users (
    uuid VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255), \
    hashed_password VARCHAR(255), \
    full_name VARCHAR(255), \
    actor_id VARCHAR(10), \
    FOREIGN KEY (actor_id) REFERENCES actors(nconst) \
)

CREATE TABLE IF NOT EXISTS friends ( \
    followed VARCHAR(255), \
    follower VARCHAR(255), \
    FOREIGN KEY (follower) REFERENCES users(uuid), \
    FOREIGN KEY (followed) REFERENCES users(uuid) \
);

CREATE TABLE IF NOT EXISTS posts (
    uuid VARCHAR(255) PRIMARY KEY,
    user_uuid VARCHAR(255),
    text TEXT,
    content_type VARCHAR(255),
    FOREIGN KEY (user_uuid) REFERENCES users(uuid)
);

CREATE TABLE IF NOT EXISTS likes (
    post_uuid VARCHAR(255),
    user_uuid VARCHAR(255),
    PRIMARY KEY (post_uuid, user_uuid),
    FOREIGN KEY (post_uuid) REFERENCES posts(uuid),
    FOREIGN KEY (user_uuid) REFERENCES users(uuid)
);

CREATE TABLE IF NOT EXISTS comments (
    uuid VARCHAR(255) PRIMARY KEY,
    post_uuid VARCHAR(255),
    user_uuid VARCHAR(255),
    text TEXT,
    FOREIGN KEY (post_uuid) REFERENCES posts(uuid),
    FOREIGN KEY (user_uuid) REFERENCES users(uuid)
);

CREATE TABLE IF NOT EXISTS hashtags (
    hashtag VARCHAR(255) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS post_hashtags (
    post_uuid VARCHAR(255),
    hashtag VARCHAR(255),
    PRIMARY KEY (post_uuid, hashtag),
    FOREIGN KEY (post_uuid) REFERENCES posts(uuid),
    FOREIGN KEY (hashtag) REFERENCES hashtags(hashtag)
);

CREATE TABLE IF NOT EXISTS user_hashtags (
    user_uuid VARCHAR(255),
    hashtag VARCHAR(255),
    PRIMARY KEY (user_uuid, hashtag),
    FOREIGN KEY (user_uuid) REFERENCES users(uuid),
    FOREIGN KEY (hashtag) REFERENCES hashtags(hashtag)
);

CREATE TABLE IF NOT EXISTS rankings (
    source VARCHAR(255),
    destination VARCHAR(255),
    score DOUBLE,
    PRIMARY KEY (source, destination)
);
`

const ragController = async (req, res) => {
    const { message } = req.body

    if (!message) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    console.log("Got RAG request: ", message)

    const user = req.user

    const openAiMessage1 = `You are an expert and are trying to help a user answer questions about their social media profile. Deduce whether the following question can be answered by querying the database schema, searching through relevant posts, or if it cannot be answered. Respond with either DATABASE or SEARCH.
    
    The question you received is: ${message}`

    const completion1 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [{ role: 'user', content: openAiMessage1 }],
    })

    if (completion1.choices[0].message.content === 'DATABASE') {
        console.log('Chose to use database query.')

        const openAiMessage2 = `You are an expert at MySQL and are trying to help a user answer questions about their social media profile. Write a SQL query that would answer the user's question based on the following database schema and examples.

    Database schema:

    ${schema}

    The current user has the following information:

    const user = {
        uuid: ${user.uuid},
        username: ${user.username},
        email: ${user.email}',
    }

    Example questions and expected queries:
    {
        Question: "How many users are there?"
        Expected query: "SELECT COUNT(*) FROM users"
    },
    {
        Question: "Who are the user's top friends?"
        Expected query: "SELECT followed FROM friends LEFT JOIN rankings ON friends.followed = rankings.destination WHERE follower = '${user.uuid}' ORDER BY rankings.score DESC"
    },
    {
        Question: "How many comments has the user made?"
        Expected query: "SELECT COUNT(*) FROM comments WHERE user_uuid = '${user.uuid}'"
    }

    If the question cannot be answered, respond with "Unable to respond to message." Otherwise, respond with the SQL query without the enclosing double quotation marks. Do not provide any addiitonal text, introduction or information aside from the exact SQL query.

    The question you received is: ${message}
    `

        const completion2 = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-1106',
            messages: [{ role: 'user', content: openAiMessage2 }],
        })

        if (
            !completion2.choices[0].message.content ||
            completion2.choices[0].message.content ===
            'Unable to respond to message.'
        ) {
            return res
                .status(400)
                .json({ error: 'Unable to respond to message.' })
        }

        const query = completion2.choices[0].message.content

        const rawRes = await dbConnection.execute(query)

        const openAiMessage3 = `You are an expert at MySQL and are trying to help a user answer questions about their social media profile. Answer their question given the following database schema, query, query response and examples.

    Database schema:

    ${schema}

    The current user has the following information:

    const user = {
        uuid: ${user.uuid},
        username: ${user.username},
        email: ${user.email}',
    }

    Example questions and expected queries:
    {
        Question: "How many users are there?"
        SQL query: "SELECT COUNT(*) FROM users"
        SQL response: [
            {
                "COUNT(*)": 32
            }
        ]
        Expected answer: "There are 32 users"
    },
    {
        Question: "Who are my top friends?"
        SQL query: "SELECT username FROM users LEFT JOIN friends ON users.uuid = friends.followed LEFT JOIN rankings ON friends.followed = rankings.destination WHERE follower = '${user.uuid}' ORDER BY rankings.score DESC"
        SQL response: [
            {
                "username": "Steven"
            },
            {
                "username": "Vivian"
            },
            {
                "username": "Kimberly"
            }
        ]
        Expected answer: "Your top friends are Steven, Vivian and Kimberly"
    },
    {
        Question: "How many comments have I made?"
        SQL query: "SELECT COUNT(*) FROM comments WHERE user_uuid = '${user.uuid}'"
        SQL response: [
            {
                "COUNT(*)": 26
            }
        ]
        Expected answer: "You have made 26 comments"
    }

    SQL query:

    ${query}

    Base your answer off of the following response to the above query:

    ${(rawRes[0] as unknown[]).length !== 0 ? JSON.stringify(rawRes[0]) : 'No results found'}

    Answer the user's question using the SQL response without the enclosing double quotation marks. Do not provide any additonal text or information aside from the answer. Use proper english, like using singular or plural forms of words when appropriate.

    The question you received is: ${message}
    `

        const completion3 = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-1106',
            messages: [{ role: 'user', content: openAiMessage3 }],
        })

        if (
            !completion3.choices[0].message.content ||
            completion3.choices[0].message.content ===
            'Unable to respond to message.'
        ) {
            return res
                .status(400)
                .json({ error: 'Unable to respond to message.' })
        }

        console.log(query, rawRes[0], completion3.choices[0].message.content)

        res.status(200).json(completion3.choices[0].message.content)
        return
    }

    if (completion1.choices[0].message.content === 'SEARCH') {
        console.log('Chose to use search query.')

        const embedding = await openai.embeddings.create({
            model: 'text-embedding-3-large',
            input: message,
        })

        const searchRes = await chromaPostsCollection.query({
            queryEmbeddings: [embedding.data[0].embedding],
            nResults: 10,
        })

        const ids = searchRes.ids[0]

        if (ids.length === 0) {
            return res
                .status(400)
                .json({ error: 'Unable to respond to message.' })
        }

        const posts = await Promise.all(ids.map((id) => getPostService(id)))

        console.log('Retrieved posts:', posts)

        const openAiMessage4 = `You are an expert at ChromaDB and are trying to help a user answer questions about their social media profile. Answer their question given the following posts and examples.
        
        The current user has the following information:

        {
            uuid: ${user.uuid},
            username: ${user.username},
            email: ${user.email}',
        }

        These are some example questions, posts and responses. Do not use information from these posts in the actual output.
        {
            Question: "What are some good basketball shoes?"
            User UUID: ${user.uuid}
            Post: {
                "uuid": "db0e6e8c-5180-4c81-b1cd-0a21edb0ac64",
                "user_uuid": ${user.uuid},
                "text": "The Lebron 16s are the newest shoes on the block! Get them at your local store today.",
                "content_type": "none",
                "comments": [],
                "likes": []
            },
            Expected response: "The Lebron 16s are highly recommended basketball shoes."
        },
        {
            Question: "How do I feel today?"
            User UUID: ${user.uuid}
            Post: {
                "uuid": "db0e6e8c-5180-4c81-b1cd-0a21edb0ac64",
                "user_uuid": ${user.uuid},
                "text": "I feel amazing today!",
                "content_type": "none",
                "comments": [],
                "likes": []
            },
            Expected response: "You feel amazing today."
        },
        {
            Question: "What do people think about the new movie?"
            User UUID: ${user.uuid}
            Post: {
                "uuid": "db0e6e8c-5180-4c81-b1cd-0a21edb0ac64",
                "user_uuid": "000019cb-c394-4882-b010-f77b806c8f2b",
                "text": "I hate this new movie!",
                "content_type": "none",
                "comments": [],
                "likes": []
            },
            Expected response: "People hate the new movie."
        }

        These are some actual posts from the user's feed. Only use content in these posts to answer their question.
        ${JSON.stringify(posts)}

        Do not provide any additonal text or information aside from the answer. Use proper english, like using singular or plural forms of words when appropriate.

        The question you received is: ${message}`

        const completion4 = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-1106',
            messages: [{ role: 'user', content: openAiMessage4 }],
        })

        if (
            !completion4.choices[0].message.content ||
            completion4.choices[0].message.content ===
                'Unable to respond to message.'
        ) {
            return res
                .status(400)
                .json({ error: 'Unable to respond to message.' })
        }

        res.status(200).json({
            message: completion4.choices[0].message.content,
            posts,
        })

        return
    }

    res.status(400).json({ error: 'Unable to respond to message.' })
}

export { ragController }
