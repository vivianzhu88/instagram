import {
    addFriendService,
    getAllFriendsService,
    getRecommendedFriendsService,
    removeFriendService,
} from '../services/friendServices.ts'

const getAllFriendsController = async (req, res) => {
    const uuid = req.user.uuid

    try {
        const friends = await getAllFriendsService(uuid)
        res.status(200).json({ friends })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const addFriendController = async (req, res) => {
    const uuid = req.user.uuid
    const friend_uuid = req.params.friend_uuid

    try {
        await addFriendService(uuid, friend_uuid)
        res.status(200).json({ message: 'Friend added successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const removeFriendController = async (req, res) => {
    const uuid = req.user.uuid
    const friend_uuid = req.params.friend_uuid

    try {
        await removeFriendService(uuid, friend_uuid)
        res.status(200).json({ message: 'Friend removed successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const getRecommendedFriendsController = async (req, res) => {
    const uuid = req.user.uuid

    try {
        const friends = await getRecommendedFriendsService(uuid)
        res.status(200).json(friends)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

export {
    getAllFriendsController,
    addFriendController,
    removeFriendController,
    getRecommendedFriendsController,
}
