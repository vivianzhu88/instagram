interface IChat {
    uuid: string
    group_chat: number
    created_at: string
}

interface IChatMember {
    chat_uuid: string
    user_uuid: string
    username: string
}

interface IChatInvite {
    chat_uuid: string
    user_uuid: string
    username: string
}

interface IMessage {
    uuid: string
    chat_uuid: string
    user_uuid: string
    message: string
    timestamp: string
}

interface IChatWithMembersAndInvites extends IChat {
    members: IChatMember[]
    invites: IChatInvite[]
}

export type { IChat, IChatMember, IChatInvite, IMessage, IChatWithMembersAndInvites }
