import { Router } from 'express'
import {
    deleteAllUsersController,
    getAllUsersController,
    getSelfController,
    registerUserController,
    updateImageController,
    getHashtagController,
    getUserHashtagController,
    updateUserHashtagController as updateHashtagController,
    getUserByUuidController,
    getUserImageController,
    getUserImageByUuidController,
    updateUserHashtagController,
    logoutController,
    seedHashtagsController,
    updateSelfController,
    getUserByUsernamePrefixController,
} from './controllers/userControllers.ts'
import { isAuthenticated, isNotAuthenticated } from '../utils/authMiddleware.ts'
import {
    addFriendController,
    getAllFriendsController,
    getRecommendedFriendsController,
    removeFriendController,
} from './controllers/friendControllers.ts'
import {
    nearestActorController,
    seedActorsController,
} from './controllers/actorControllers.ts'
import passport from 'passport'
import { s3Upload } from '../utils/s3Middleware.ts'
import multer from 'multer'

const profilesRouter = Router()

const upload = multer({
    limits: {
        fileSize: 1000000,
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload a valid image file'))
        }
        cb(undefined, true)
    },
})

profilesRouter.post(
    '/actors/nearest',
    isAuthenticated,
    upload.single('image'),
    nearestActorController
)

profilesRouter.post('/actors/seed', seedActorsController)

profilesRouter.get('/friends/all', isAuthenticated, getAllFriendsController)

profilesRouter.get(
    '/friends/recommended',
    isAuthenticated,
    getRecommendedFriendsController
)

profilesRouter.get(
    '/user/username/:prefix',
    isAuthenticated,
    getUserByUsernamePrefixController
)

profilesRouter.post(
    '/friends/add/:friend_uuid',
    isAuthenticated,
    addFriendController
)

profilesRouter.delete(
    '/friends/remove/:friend_uuid',
    isAuthenticated,
    removeFriendController
)

profilesRouter.get('/hashtag', getHashtagController)

profilesRouter.post('/hashtags/seed', seedHashtagsController)

profilesRouter.get('/user', isAuthenticated, getSelfController)
profilesRouter.put('/user', isAuthenticated, updateSelfController)

profilesRouter.get('/user/all', isAuthenticated, getAllUsersController)

profilesRouter.delete('/user/all', deleteAllUsersController)

profilesRouter.put('/user/hashtag', isAuthenticated, updateHashtagController)
profilesRouter.get('/user/hashtags', isAuthenticated, getUserHashtagController)

profilesRouter.get('/user/image', isAuthenticated, getUserImageController)
profilesRouter.put(
    '/user/image',
    isAuthenticated,
    s3Upload.single('image'),
    updateImageController
)

profilesRouter.post(
    '/user/login',
    isNotAuthenticated,
    passport.authenticate('local', {
        failureMessage: true,
    })
)

profilesRouter.post('/user/logout', isAuthenticated, logoutController)

profilesRouter.post('/user/register', registerUserController)

profilesRouter.put(
    '/user/updateHashtag',
    isAuthenticated,
    updateUserHashtagController
)

profilesRouter.get('/user/:uuid', isAuthenticated, getUserByUuidController)
profilesRouter.get(
    '/user/:uuid/image',
    isAuthenticated,
    getUserImageByUuidController
)

export default profilesRouter
