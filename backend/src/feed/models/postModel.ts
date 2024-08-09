interface IPost {
    uuid: string
    user_uuid: string
    text: string
    content_type: string
}

interface ILike {
    post_uuid: string
    user_uuid: string
}

interface IComment {
    uuid: string
    post_uuid: string
    user_uuid: string
    text: string
}

interface IPostWithLikesAndComments extends IPost {
    comments: IComment[]
    likes: ILike[]
}

export { IPost, ILike, IComment, IPostWithLikesAndComments }
