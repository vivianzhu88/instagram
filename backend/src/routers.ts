import { Router } from 'express'
import feedRouter from './feed/feedRouter.ts'
import profilesRouter from './profiles/profilesRouter.ts'

const prefixToRouterMap: { prefix: string; router: Router }[] = [
    {
        prefix: '/api/feed',
        router: feedRouter,
    },
    {
        prefix: '/api/profiles',
        router: profilesRouter,
    },
]

export default prefixToRouterMap
