import express from 'express'
import cors from 'cors'
import routers from './routers.ts'
import { setUpMysql } from './utils/mysql.ts'
import { setUpKafka } from './utils/kafka.ts'
import passport from 'passport'
import session from 'express-session'
import { initializePassport } from './utils/passport.ts'
import cookieParser from 'cookie-parser'
import http from 'http'
import { setupSocketIo } from './chat/websockets.ts'
import { setUpChroma } from './utils/chroma.ts'
import { initializeFaceApi } from './utils/faceApi.ts'

console.error('hello world!')

const app = express()
const port = process.env.SERVER_PORT || 4000

app.set('port', port)

app.use(express.json())

app.use(express.urlencoded({ extended: true }))

app.use(cors({ credentials: true, origin: 'http://localhost:3000' }))

app.use(cookieParser(process.env.SECRET || 'secret'))

app.use(
    session({
        name: 'session',
        secret: process.env.SECRET || 'secret',
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
    })
)

app.use(passport.initialize())
app.use(passport.session())

initializePassport(passport)

routers.forEach((entry) => app.use(entry.prefix, entry.router))

app.get('/health', (_req, res) => {
    res.status(200).json({ message: 'Healthy' })
})

app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint unavailable' })
})

const run = async () => {
    await setUpMysql()
    await setUpKafka()
    await setUpChroma()
    await initializeFaceApi()

    const server = http.createServer(app)

    await setupSocketIo(server)

    server.listen(app.get('port'), () => {
        console.log(
            `[server]: Server is running at http://localhost:${app.get('port')}`
        )
    })
}

run().catch(console.error)

console.error('goodbye world!')
