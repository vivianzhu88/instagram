import { Strategy as LocalStrategy, IVerifyOptions } from 'passport-local'
import * as passportStrat from 'passport'
import { compare } from 'bcrypt'
import {
    getUserByUsernameService,
    getUserByUuidService,
} from '../profiles/services/userServices.ts'
import { IUser } from '../profiles/models/userModel.ts'

const verifyLocalUser = (
    username: string,
    password: string,
    done: (error, user?, options?: IVerifyOptions | undefined) => void
): void => {
    getUserByUsernameService(username)
        .then((user) => {
            if (!user) {
                return done('User not found', null, {
                    message: 'User not found',
                })
            }
            // Match user with password
            return compare(
                password,
                user.hashed_password!,
                (err, isMatch: boolean) => {
                    if (err) {
                        return done(err, null)
                    }
                    if (isMatch) {
                        const cleanUser = user
                        delete cleanUser.hashed_password
                        return done(null, cleanUser)
                    }
                    return done('Incorrect password', null, {
                        message: 'Incorrect password',
                    })
                }
            )
        })
        .catch((error) => {
            return done(error)
        })
}

const initializePassport = (passport: passportStrat.PassportStatic) => {
    // Set up middleware to use for each type of auth strategy
    passport.use(new LocalStrategy(verifyLocalUser))

    // Set up serialization and deserialization of user objects
    passport.serializeUser((user: IUser, done) => {
        done(null, user.uuid)
    })
    passport.deserializeUser((uuid: string, done) => {
        getUserByUuidService(uuid)
            .then((user) => done(null, user))
            .catch((err) => done(err, null))
    })
}

export { initializePassport }
