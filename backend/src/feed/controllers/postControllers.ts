import { producer, tunnelProducer } from '../../utils/kafka.ts'
import {
    createCommentService,
    deleteAllPostsService,
    deleteCommentService,
    deletePostService,
    getAllPostsService,
    getCommentService,
    getPostService,
    getRankedPostsService,
    toggleLikeService,
} from '../services/postServices.ts'
import { v4 as uuidv4 } from 'uuid'

const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'posts'
const TUNNEL_FEDERATED_POSTS_TOPIC = process.env.TUNNEL_FEDERATED_POSTS_TOPIC || 'FederatedPosts'

const createPostController = async (req, res) => {
    if (!req.body.text && !req.body.content_type) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    const post = {
        uuid: uuidv4(),
        user_uuid: req.user.uuid,
        post_text: req.body.text || '',
        content_type: req.body.content_type || 'none',
    }

    await producer.send({
        topic: KAFKA_TOPIC,
        messages: [
            {
                value: JSON.stringify(post),
            },
        ],
    })

    try {
        await tunnelProducer.send({
            topic: TUNNEL_FEDERATED_POSTS_TOPIC,
            messages: [
                {
                    value: JSON.stringify({
                        username: req.user.username,
                        post_text: post.post_text,
                        content_type: post.content_type,
                        source_site: 'g47',
                        post_uuid_within_site: uuidv4(),
                    }),
                },
            ],
        })
    } catch (error) {
        console.error('Error sending to tunnel', error)
    }

    res.status(200).json(post)
}

const getAllPostsController = async (req, res) => {
    const posts = await getAllPostsService()

    res.status(200).json(posts)
}

const getRankedPostsController = async (req, res) => {
    const posts = await getRankedPostsService(req.user.uuid)

    res.status(200).json(posts)
}

const getPostController = async (req, res) => {
    const post = await getPostService(req.params.uuid)

    if (!post) {
        return res.status(404).json({ error: 'Post not found' })
    }

    res.status(200).json(post)
}

const deleteAllPostsController = async (_req, res) => {
    await deleteAllPostsService()

    res.status(200).json({ message: 'All posts deleted' })
}

const deletePostController = async (req, res) => {
    const post = await getPostService(req.params.uuid)

    if (!post) {
        return res.status(404).json({ error: 'Post not found' })
    }

    if (!req.user.uuid.includes(post.user_uuid)) {
        return res.status(403).json({ error: 'Unauthorized' })
    }

    await deletePostService(req.params.uuid)

    res.status(200).json({ message: 'Post deleted successfully' })
}

const createCommentController = async (req, res) => {
    const { post_uuid } = req.params
    const { comment } = req.body

    if (!post_uuid || !comment) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    const oldPost = await getPostService(post_uuid)
    if (!oldPost) {
        return res.status(404).json({ error: 'Post not found' })
    }

    await createCommentService(post_uuid, req.user.uuid, comment)

    const post = await getPostService(post_uuid)

    res.status(200).json(post)
}

const deleteCommentController = async (req, res) => {
    const { comment_uuid } = req.params

    if (!comment_uuid) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    const comment = await getCommentService(comment_uuid)

    if (!comment) {
        return res.status(404).json({ error: 'Comment not found' })
    }

    if (!req.user.uuid.includes(comment.user_uuid)) {
        return res.status(403).json({ error: 'Unauthorized' })
    }

    await deleteCommentService(comment_uuid)

    const post = await getPostService(comment.post_uuid)

    res.status(200).json(post)
}

const toggleLikeController = async (req, res) => {
    const { post_uuid } = req.params

    if (!post_uuid) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    const oldPost = await getPostService(post_uuid)
    if (!oldPost) {
        return res.status(404).json({ error: 'Post not found' })
    }

    await toggleLikeService(post_uuid, req.user.uuid)

    const post = await getPostService(post_uuid)

    res.status(200).json(post)
}

export {
    createPostController,
    getAllPostsController,
    getRankedPostsController,
    getPostController,
    deleteAllPostsController,
    deletePostController,
    createCommentController,
    deleteCommentController,
    toggleLikeController,
}
