interface IUser {
    uuid: string
    username: string
    email: string
    fullName: string
    actorId: string
    affiliation: string
    birthday: string
}

interface IFriend {
    followed: string
    follower: string
}

interface IUserWithPassword extends IUser {
    hashed_password: string
}

export { IUser, IFriend, IUserWithPassword }
