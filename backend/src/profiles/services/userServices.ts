import { dbConnection } from '../../utils/mysql.ts'
import bcrypt from 'bcrypt'
import { IUserWithPassword } from '../models/userModel.ts'
import { v4 as uuidv4 } from 'uuid'
import { s3Client } from '../../utils/s3Middleware.ts'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const getAllUsersService = async () => {
    const query = `SELECT * FROM users`
    const rawRes = await dbConnection.query(query)
    const res = rawRes[0] as unknown[]
    return res as IUserWithPassword[]
}

const getUserByUuidService = async (
    uuid: string
): Promise<IUserWithPassword | null> => {
    const query = `SELECT * FROM users WHERE uuid = "${uuid}"`
    const rawRes = await dbConnection.query(query)
    const res = rawRes[0] as unknown[]
    const user = res.length > 0 ? (res[0] as IUserWithPassword) : null
    return user
}

const getUserByUsernameService = async (
    username: string
): Promise<IUserWithPassword | null> => {
    const query = `SELECT * FROM users WHERE username = "${username}"`
    const rawRes = await dbConnection.query(query)
    const res = rawRes[0] as unknown[]
    const user = res.length > 0 ? (res[0] as IUserWithPassword) : null
    return user
}

const getImageService = async (username) => {
    const query = `SELECT actor_id FROM users WHERE username = "${username}"`
    const res = await dbConnection.query(query)

    const actor_id = res[0] as unknown[]
    const key = actor_id[0]

    if (!key || !key['actor_id']) {
        return ''
    }

    const data = await s3Client.send(
        new GetObjectCommand({
            Bucket: 'user-images-plsfixautograder',
            Key: key['actor_id'],
        })
    )

    return data.Metadata.location
}

async function hashPassword(password) {
    const saltRounds = 10

    const hashedPassword = await new Promise((resolve, reject) => {
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) reject(err)
            resolve(hash)
        })
    })

    return hashedPassword
}

function validateBirthday(birthday) {
    const regex = /^\d{4}-\d{2}-\d{2}$/
    return regex.test(birthday)
}

const createUserService = async (
    username,
    email,
    password,
    fullName,
    affiliation,
    birthday
) => {
    if (!username || !email || !password || !fullName) {
        throw new Error('Missing required fields')
    }

    if (await getUserByUsernameService(username)) {
        throw new Error('User already exists')
    }

    if (birthday && !validateBirthday(birthday)) {
        throw new Error('Birthday must be in the format YYYY-MM-DD')
    }

    const uuid = uuidv4()
    const hash = await hashPassword(password)

    let query
    if (!affiliation && !birthday) {
        query = `INSERT INTO users (uuid, username, email, hashed_password, full_name, actor_id, affiliation, birthday) VALUES ("${uuid}", "${username}", "${email}", "${hash}", "${fullName}", NULL, NULL, NULL)`
    } else if (!affiliation) {
        query = `INSERT INTO users (uuid, username, email, hashed_password, full_name, actor_id, affiliation, birthday) VALUES ("${uuid}", "${username}", "${email}", "${hash}", "${fullName}", NULL, NULL, "${birthday}")`
    } else if (!birthday) {
        query = `INSERT INTO users (uuid, username, email, hashed_password, full_name, actor_id, affiliation, birthday) VALUES ("${uuid}", "${username}", "${email}", "${hash}", "${fullName}", NULL, "${affiliation}", NULL)`
    } else {
        query = `INSERT INTO users (uuid, username, email, hashed_password, full_name, actor_id, affiliation, birthday) VALUES ("${uuid}", "${username}", "${email}", "${hash}", "${fullName}", NULL, "${affiliation}", "${birthday}")`
    }

    await dbConnection.execute(query)
}

const updateUserService = async (
    oldUsername: string,
    username: string,
    email: string,
    fullName: string,
    actorId: string,
    affiliation: string,
    birthday: string
): Promise<void> => {
    if (
        oldUsername !== username &&
        (await getUserByUsernameService(username))
    ) {
        throw new Error('Username already exists')
    }

    if (username || email || fullName || affiliation || birthday || actorId) {
        const query = `UPDATE users SET ${Object.entries({
            username,
            email,
            full_name: fullName,
            affiliation,
            birthday,
            actor_id: actorId,
        })
            .filter(([_, value]) => value)
            .map(([key, value]) => `${key} = "${value}"`)
            .join(', ')} WHERE username = "${oldUsername}"`

        await dbConnection.execute(query)
    }
}

const deleteAllUsersService = async () => {
    const query = `DELETE FROM users WHERE 1`
    await dbConnection.execute(query)
}

const getUserImageService = async (uuid) => {
    const command = new GetObjectCommand({
        Bucket: `${process.env.S3_BUCKET_NAME}` || 'images-plsfixautograder',
        Key: `${uuid}`,
    })

    try {
        await s3Client.send(command)
        return `https://${process.env.S3_BUCKET_NAME}.s3.us-east-1.amazonaws.com/${uuid}`
    } catch (err) {
        return ''
    }
}

const updateUserImageService = async (username, image) => {
    if (!username || !image) {
        throw new Error('Missing required fields')
    }

    if (!(await getUserByUsernameService(username))) {
        throw new Error('User does not exist')
    }

    const params = {
        Bucket: 'user-images',
        Key: username,
        Body: image,
    }

    const data = await s3Client.send(new PutObjectCommand(params))

    console.log('File uploaded successfully. File location:', data.ETag)
}

function parseSQL(data) {
    const parsedJSON = {}
    const results = []

    for (const hashtag of data) {
        results.push(hashtag['hashtag'])
    }

    parsedJSON['hashtags'] = results.sort()
    return parsedJSON
}

const getHashtagService = async (prefix) => {
    if (!prefix) {
        throw new Error('Missing required fields')
    }

    const query = `SELECT hashtag FROM user_hashtags WHERE hashtag LIKE "${prefix}%" GROUP BY hashtag ORDER BY COUNT(hashtag) DESC LIMIT 10`

    const hashtags = await dbConnection.query(query)
    return parseSQL(hashtags)
}

const updateUserHashtagService = async (uuid, hashtag) => {
    if (!uuid || !hashtag) {
        throw new Error('Missing required fields')
    }

    const put = `INSERT IGNORE INTO hashtags (hashtag) VALUES ("${hashtag}")`
    await dbConnection.query(put)

    const query = `INSERT IGNORE INTO user_hashtags (user_uuid, hashtag) VALUES ("${uuid}", "${hashtag}")`
    await dbConnection.query(query)
}

const getUserHashtagService = async (uuid) => {
    if (!uuid) {
        throw new Error('Missing required fields')
    }

    const query = `SELECT hashtag FROM user_hashtags WHERE user_uuid = "${uuid}"`

    const hashtags = await dbConnection.query(query)
    return parseSQL(hashtags)
}

const getUserByUsernamePrefixService = async (prefix) => {
    const query = `SELECT * FROM users WHERE username LIKE "${prefix}%"`
    const rawRes = await dbConnection.query(query)
    const users = rawRes[0] as IUserWithPassword[]
    users.forEach((user) => {
        delete user.hashed_password
    })
    return users
}

export {
    getUserByUsernameService,
    getUserByUuidService,
    createUserService,
    updateUserService,
    getUserImageService,
    updateUserImageService,
    getHashtagService,
    updateUserHashtagService,
    deleteAllUsersService,
    getUserHashtagService,
    getImageService,
    getAllUsersService,
    getUserByUsernamePrefixService,
}
