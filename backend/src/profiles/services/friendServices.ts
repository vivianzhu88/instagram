import { dbConnection } from '../../utils/mysql.ts'
import { IFriend } from '../models/userModel.ts'
import { getUserByUuidService } from './userServices.ts'

const getAllFriendsService = async (uuid: string) => {
    if (!uuid) {
        throw new Error('Missing required fields')
    }

    const query = `SELECT followed FROM friends WHERE follower = "${uuid}"`
    const rawRes = await dbConnection.query(query)
    const res = rawRes[0] as IFriend[]

    // for every friend, retrieve their user details
    return Promise.all(
        res.map(async (friend) => {
            const user = await getUserByUuidService(friend.followed)
            delete user.hashed_password
            return user
        })
    )
}

const getFriendService = async (uuid: string, friend: string) => {
    if (!uuid || !friend) {
        throw new Error('Missing required fields')
    }

    if (uuid === friend) {
        return false
    }

    const query = `SELECT * FROM friends WHERE followed = "${uuid}" AND follower = "${friend}"`
    const rawRes = await dbConnection.query(query)
    const res = rawRes[0] as unknown[]
    return res.length > 0
}

const addFriendService = async (uuid: string, friend_uuid: string) => {
    if (!uuid || !friend_uuid) {
        throw new Error('Missing required fields')
    }

    if (uuid === friend_uuid) {
        throw new Error('Cannot add self as friend')
    }

    if (await getFriendService(uuid, friend_uuid)) {
        throw new Error('Friend already exists')
    }

    const query = `INSERT INTO friends (followed, follower) VALUES ("${uuid}", "${friend_uuid}"), ("${friend_uuid}", "${uuid}")`
    await dbConnection.execute(query)
}

const removeFriendService = async (uuid: string, friend_uuid: string) => {
    if (!uuid || !friend_uuid) {
        throw new Error('Missing required fields')
    }

    if (uuid === friend_uuid) {
        throw new Error('Cannot remove self as friend')
    }

    const query = `DELETE FROM friends WHERE followed = "${uuid}" AND follower = "${friend_uuid}"`
    await dbConnection.execute(query)

    const query2 = `DELETE FROM friends WHERE followed = "${friend_uuid}" AND follower = "${uuid}"`
    await dbConnection.execute(query2)
}

const getRecommendedFriendsService = async (uuid: string) => {
    if (!uuid) {
        throw new Error('Missing required fields')
    }

    const query = `SELECT followed FROM friends WHERE follower = "${uuid}"`
    const rawRes = await dbConnection.query(query)
    const res = rawRes[0] as IFriend[]

    // for every friend, retrieve their user details
    const friends = res.map((friend) => friend.followed)

    const query2 = `SELECT * FROM users LEFT JOIN rankings ON users.uuid = rankings.destination WHERE uuid != "${uuid}" AND "${uuid}" = rankings.source ORDER BY rankings.score`
    const rawRes2 = await dbConnection.query(query2)
    const res2 = rawRes2[0] as IUserWithPassword[]

    const nonFriends = res2.filter((user) => {
        return !friends.some((friend) => friend === user.uuid)
    })

    return nonFriends
}

export {
    getAllFriendsService,
    getFriendService,
    addFriendService,
    removeFriendService,
    getRecommendedFriendsService,
}
