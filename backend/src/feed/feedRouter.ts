import { Router } from 'express'
import { isAuthenticated } from '../utils/authMiddleware.ts'
import {
    createCommentController,
    createPostController,
    deleteAllPostsController,
    deleteCommentController,
    deletePostController,
    getAllPostsController,
    getPostController,
    getRankedPostsController,
    toggleLikeController,
} from './controllers/postControllers.ts'
import { ragController } from './controllers/rag.ts'
import { s3Upload, s3UploadImg } from '../utils/s3Middleware.ts'
import { updateImageController } from '../profiles/controllers/userControllers.ts'

const feedRouter = Router()

feedRouter.get('/post/all', isAuthenticated, getAllPostsController)

feedRouter.get('/post/ranked', isAuthenticated, getRankedPostsController)

feedRouter.delete('/post/all', isAuthenticated, deleteAllPostsController)

feedRouter.post(
    '/post/:post_uuid/comment',
    isAuthenticated,
    createCommentController
)

feedRouter.delete(
    '/comment/:comment_uuid',
    isAuthenticated,
    deleteCommentController
)

feedRouter.post('/post/:post_uuid/like', isAuthenticated, toggleLikeController)

feedRouter.get('/post/:uuid', isAuthenticated, getPostController)

feedRouter.delete('/post/:uuid', isAuthenticated, deletePostController)

feedRouter.post(
    '/post/:uuid/image',
    isAuthenticated,
    s3UploadImg.single('image'),
    updateImageController
)

feedRouter.post('/post', isAuthenticated, createPostController)

feedRouter.post('/rag', isAuthenticated, ragController)

export default feedRouter
