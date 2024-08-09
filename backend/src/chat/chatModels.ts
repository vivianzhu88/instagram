import { IUser } from '../profiles/models/userModel.ts'

interface IChat {
    uuid: string
    group_chat: number
    name: string
    created_at: string
}

interface IChatMember {
    chat_uuid: string
    user_uuid: string
    user: IUser
}

interface IChatInvite {
    chat_uuid: string
    sender_uuid: string
    recipient_uuid: string
    chat: IChat
    sender: IUser
    recipient: IUser
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

export { IChat, IChatMember, IChatInvite, IMessage, IChatWithMembersAndInvites }
