import {
    createUserService,
    deleteAllUsersService,
    getAllUsersService,
    getUserByUsernameService,
    getUserByUuidService,
    updateUserService,
    getUserImageService,
    getHashtagService,
    updateUserHashtagService,
    getUserHashtagService,
    getImageService,
    getUserByUsernamePrefixService,
} from '../services/userServices.ts'
import { dbConnection } from '../../utils/mysql.ts'

const registerUserController = async (req, res) => {
    const { username, email, password, full_name, affiliation, birthday } =
        req.body

    if (!username || !email || !password || !full_name) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    try {
        await createUserService(
            username,
            email,
            password,
            full_name,
            affiliation,
            birthday
        )
        const user = await getUserByUsernameService(username)
        delete user.hashed_password
        res.status(201).json(user)
    } catch (error) {
        res.status(500).json({ error: `${error.message}` })
    }
}

const updateSelfController = async (req, res) => {
    const oldUsername = req.user.username
    const { username, email, fullName, actorId, affiliation, birthday } =
        req.body

    try {
        await updateUserService(
            oldUsername,
            username,
            email,
            fullName,
            actorId,
            affiliation,
            birthday
        )

        const user = await getUserByUsernameService(username)
        res.status(200).json(user)
    } catch (error) {
        res.status(500).json({ error: `Error querying database: ${error}` })
    }
}

const deleteAllUsersController = async (_req, res) => {
    await deleteAllUsersService()

    res.status(200).json({ message: 'All users deleted' })
}

const getUserImageController = async (req, res) => {
    const uuid = req.user.uuid

    try {
        const response = await getUserImageService(uuid)
        return res.status(200).json({ imageUrl: response })
    } catch (error) {
        res.status(500).json({ error: `Error querying database: ${error}` })
    }
}

const getUserImageByUuidController = async (req, res) => {
    const uuid = req.params.uuid

    try {
        const response = await getUserImageService(uuid)
        return res.status(200).json({ imageUrl: response })
    } catch (error) {
        res.status(500).json({ error: `Error querying database: ${error}` })
    }
}

const updateImageController = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Missing image' })
    }

    return res.status(200).json({ imageUrl: req.file.location })
}

const getAllUsersController = async (_req, res) => {
    const users = await getAllUsersService()

    res.status(200).json(users)
}

const getHashtagController = async (req, res) => {
    const { prefix } = req.body

    try {
        const hashtags = await getHashtagService(prefix)

        res.status(200).json(hashtags)
    } catch (error) {
        res.status(500).json({ error: `Error querying database: ${error}` })
    }
}

const updateUserHashtagController = async (req, res) => {
    const { uuid, hashtag } = req.body

    try {
        await updateUserHashtagService(uuid, hashtag)

        const user = await getUserByUuidService(uuid)
        res.status(200).json(user)
    } catch (error) {
        res.status(500).json({ error: `Error querying database: ${error}` })
    }
}

const getUserHashtagController = async (req, res) => {
    const { uuid } = req.body

    try {
        const hashtags = await getUserHashtagService(uuid)
        res.status(200).json({ hashtags })
    } catch (error) {
        res.status(500).json({ error: `Error querying database: ${error}` })
    }
}

const getSelfController = async (req, res) => {
    const username = req.user.username

    try {
        const user = await getUserByUsernameService(username)

        const imageURL = await getImageService(username)

        res.status(200).json({ user: user, imageURL: imageURL })
    } catch (error) {
        res.status(500).json({ error: `Error querying database: ${error}` })
    }
}

const getUserByUuidController = async (req, res) => {
    const uuid = req.params.uuid

    try {
        const user = await getUserByUuidService(uuid)
        res.status(200).json(user)
    } catch (error) {
        res.status(500).json({ error: `Error querying database: ${error}` })
    }
}

const seedHashtagsController = async (req, res) => {
    const hashtags = ['UPenn', 'random', 'sports', 'news', 'travel']

    const query = `INSERT INTO hashtags (hashtag) VALUES ${hashtags.map((hashtag) => `("${hashtag}")`).join(', ')}`

    await dbConnection.execute(query)

    return res.status(200).json({ message: 'Hashtags seeded successfully.' })
}

const logoutController = async (req, res) => {
    req.logout((err) => {
        if (err) {
            res.status(500).json({ error: `Error logging out: ${err}` })
        }
    })
    res.status(200).json({ message: 'Logged out' })
}

const getUserByUsernamePrefixController = async (req, res) => {
    const { prefix } = req.params

    try {
        const users = await getUserByUsernamePrefixService(prefix)
        res.status(200).json({ users })
    } catch (error) {
        res.status(500).json({ error: `Error querying database: ${error}` })
    }
}

export {
    registerUserController,
    updateSelfController,
    updateImageController,
    getUserImageController,
    getUserImageByUuidController,
    getHashtagController,
    updateUserHashtagController,
    getUserHashtagController,
    getUserByUsernamePrefixController,
    deleteAllUsersController,
    getAllUsersController,
    getSelfController,
    getUserByUuidController,
    logoutController,
    seedHashtagsController,
}
