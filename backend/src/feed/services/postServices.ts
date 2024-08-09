import { dbConnection } from '../../utils/mysql.ts'
import { v4 as uuidv4 } from 'uuid'
import {
    IComment,
    ILike,
    IPostWithLikesAndComments,
} from '../models/postModel.ts'

const getAllPostsService = async () => {
    const res = await dbConnection.query(`
        SELECT * FROM posts
    `)

    const posts = res[0] as IPostWithLikesAndComments[]
    await Promise.all(
        posts.map(async (post) => {
            const res2 = await getCommentsOnPostService(post.uuid)
            post.comments = res2

            const res3 = await getLikesOnPostService(post.uuid)
            post.likes = res3
        })
    )

    return posts
}

const getRankedPostsService = async (user_uuid: string) => {
    const res = await dbConnection.query(`
        SELECT * FROM posts
        LEFT JOIN rankings ON posts.uuid = rankings.destination
        WHERE source = "${user_uuid}"
        ORDER BY rankings.score DESC
    `)

    const posts = res[0] as IPostWithLikesAndComments[]
    await Promise.all(
        posts.map(async (post) => {
            const res2 = await getCommentsOnPostService(post.uuid)
            post.comments = res2

            const res3 = await getLikesOnPostService(post.uuid)
            post.likes = res3
        })
    )

    return posts
}

const getPostService = async (uuid) => {
    const res = await dbConnection.query(`
        SELECT * FROM posts WHERE uuid = "${uuid}"
    `)

    const post = res[0][0] as IPostWithLikesAndComments
    if (!post) {
        return null
    }

    post.comments = await getCommentsOnPostService(uuid)
    post.likes = await getLikesOnPostService(uuid)

    return post
}

const deleteAllPostsService = async () => {
    await dbConnection.query(`
        DELETE FROM posts
        WHERE 1
    `)
}

const deletePostService = async (uuid) => {
    await dbConnection.query(`
        DELETE FROM comments
        WHERE post_uuid = "${uuid}"
    `)

    await dbConnection.query(`
        DELETE FROM likes
        WHERE post_uuid = "${uuid}"
    `)

    await dbConnection.query(`
        DELETE FROM posts
        WHERE uuid = "${uuid}"
    `)
}

const createCommentService = async (post_uuid, user_uuid, comment) => {
    if (!post_uuid || !user_uuid || !comment) {
        throw new Error('Missing required fields')
    }

    const query = `INSERT INTO comments (uuid, post_uuid, user_uuid, text) VALUES ("${uuidv4()}", "${post_uuid}", "${user_uuid}", "${comment}")`
    await dbConnection.execute(query)
}

const getCommentsOnPostService = async (post_uuid) => {
    if (!post_uuid) {
        throw new Error('Missing required fields')
    }

    const query = `SELECT * FROM comments WHERE post_uuid = "${post_uuid}"`
    const res = await dbConnection.query(query)
    return (res[0] as IComment[]) || []
}

const getCommentService = async (comment_uuid) => {
    if (!comment_uuid) {
        throw new Error('Missing required fields')
    }

    const query = `SELECT * FROM comments WHERE uuid = "${comment_uuid}"`
    const res = await dbConnection.query(query)
    return res[0][0] as IComment
}

const deleteCommentService = async (comment_uuid) => {
    if (!comment_uuid) {
        throw new Error('Missing required fields')
    }

    const query = `DELETE FROM comments WHERE uuid = "${comment_uuid}"`
    await dbConnection.execute(query)
}

const getLikesOnPostService = async (post_uuid) => {
    if (!post_uuid) {
        throw new Error('Missing required fields')
    }

    const query = `SELECT * FROM likes WHERE post_uuid = "${post_uuid}"`
    const res = await dbConnection.query(query)
    return (res[0] as ILike[]) || []
}

const toggleLikeService = async (post_uuid, user_uuid) => {
    if (!post_uuid || !user_uuid) {
        throw new Error('Missing required fields')
    }

    const query = `SELECT * FROM likes WHERE post_uuid = "${post_uuid}" AND user_uuid = "${user_uuid}"`
    const res = await dbConnection.query(query)

    if ((res[0] as ILike[]).length > 0) {
        await dbConnection.execute(`
            DELETE FROM likes
            WHERE post_uuid = "${post_uuid}" AND user_uuid = "${user_uuid}"
        `)
    } else {
        await dbConnection.execute(`
            INSERT INTO likes (post_uuid, user_uuid) VALUES ("${post_uuid}", "${user_uuid}")
        `)
    }
}

export {
    getAllPostsService,
    getRankedPostsService,
    getCommentService,
    getPostService,
    deletePostService,
    deleteAllPostsService,
    createCommentService,
    getCommentsOnPostService,
    toggleLikeService,
    getLikesOnPostService,
    deleteCommentService,
}
