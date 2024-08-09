import { getUserByUuidService } from '../profiles/services/userServices.ts'
import { dbConnection } from '../utils/mysql.ts'
import {
    IChatInvite,
    IChatMember,
    IChatWithMembersAndInvites,
    IMessage,
} from './chatModels.ts'

const createChatService = async (
    chat_uuid: string,
    group_chat: boolean,
    name: string
) => {
    if (group_chat && name !== undefined) {
        await dbConnection.execute(
            `INSERT INTO chat_sessions (uuid, group_chat, name) VALUES (?, ?, ?)`,
            [chat_uuid, group_chat, name]
        )
        return
    }

    await dbConnection.execute(
        `INSERT INTO chat_sessions (uuid, group_chat) VALUES (?, ?)`,
        [chat_uuid, group_chat]
    )
}

const addUserToChat = async (chat_uuid: string, user_uuid: string) => {
    await dbConnection.execute(
        `INSERT INTO chat_members (chat_uuid, user_uuid) VALUES (?, ?)`,
        [chat_uuid, user_uuid]
    )
}

const getChatService = async (chat_uuid: string) => {
    const res = await dbConnection.execute(
        `SELECT * FROM chat_sessions WHERE uuid = ?`,
        [chat_uuid]
    )

    const chats = res[0] as IChatWithMembersAndInvites[]

    if (chats.length === 0) {
        return null
    }

    const chat = chats[0]

    const members = await getChatMembersService(chat_uuid)
    const invites = await getChatInvitesService(chat_uuid)

    chat.members = members
    chat.invites = invites

    return chat
}

const getChatMembersService = async (chat_uuid: string) => {
    const res = await dbConnection.execute(
        `SELECT * FROM chat_members WHERE chat_uuid = ?`,
        [chat_uuid]
    )

    const members = res[0] as IChatMember[]

    await Promise.all(
        members.map(async (member) => {
            const user = await getUserByUuidService(member.user_uuid)
            member.user = user
        })
    )

    return members
}

const getChatInvitesService = async (chat_uuid: string) => {
    const res = await dbConnection.execute(
        `SELECT * FROM chat_invites WHERE chat_uuid = ?`,
        [chat_uuid]
    )

    const invites = res[0] as IChatInvite[]

    await Promise.all(
        invites.map(async (invite) => {
            const sender = await getUserByUuidService(invite.sender_uuid)
            const recipient = await getUserByUuidService(invite.recipient_uuid)

            invite.sender = sender
            invite.recipient = recipient
        })
    )

    return invites
}

const getUserInvitesService = async (user_uuid: string) => {
    const res = await dbConnection.execute(
        `SELECT * FROM chat_invites WHERE recipient_uuid = ?`,
        [user_uuid]
    )

    const invites = res[0] as IChatInvite[]

    await Promise.all(
        invites.map(async (invite) => {
            const chat = await getChatService(invite.chat_uuid)
            const sender = await getUserByUuidService(invite.sender_uuid)
            const recipient = await getUserByUuidService(invite.recipient_uuid)

            invite.chat = chat
            invite.sender = sender
            invite.recipient = recipient
        })
    )

    return invites
}

const getUserChatsService = async (user_uuid: string) => {
    const res = await dbConnection.execute(
        `SELECT * FROM chat_sessions JOIN chat_members on chat_sessions.uuid = chat_members.chat_uuid WHERE chat_members.user_uuid = ?`,
        [user_uuid]
    )

    const chats = res[0] as unknown[] as IChatWithMembersAndInvites[]

    await Promise.all(
        chats.map(async (chat) => {
            const members = await getChatMembersService(chat.uuid)
            const invites = await getChatInvitesService(chat.uuid)

            chat.members = members
            chat.invites = invites
        })
    )

    return chats
}

const checkInviteExists = async (
    chat_uuid: string,
    sender_uuid: string,
    recipient_uuid: string
) => {
    const [invites] = await dbConnection.execute(
        `SELECT * FROM chat_invites WHERE chat_uuid = ? AND sender_uuid = ? AND recipient_uuid = ?`,
        [chat_uuid, sender_uuid, recipient_uuid]
    )
    return (invites as unknown[]).length > 0
}

const checkUsersAlreadyHaveAPrivateChat = async (
    user1_uuid: string,
    user2_uuid: string
) => {
    const [chats] = await dbConnection.execute(
        `SELECT chat_uuid FROM chat_members INNER JOIN chat_sessions ON chat_members.chat_uuid = chat_sessions.uuid WHERE chat_sessions.group_chat = FALSE AND (user_uuid = ? OR user_uuid = ?) GROUP BY chat_uuid HAVING COUNT(*) = 2`,
        [user1_uuid, user2_uuid]
    )
    return (chats as unknown[]).length > 0
}

const createChatInviteService = async (
    chat_uuid: string,
    sender_uuid: string,
    recipient_uuid: string
) => {
    await dbConnection.execute(
        `INSERT INTO chat_invites (chat_uuid, sender_uuid, recipient_uuid) VALUES (?, ?, ?)`,
        [chat_uuid, sender_uuid, recipient_uuid]
    )
}

const getChatInviteService = async (
    chat_uuid: string,
    sender_uuid: string,
    recipient_uuid: string
) => {
    const [invites] = await dbConnection.execute(
        `SELECT * FROM chat_invites WHERE chat_uuid = ? AND sender_uuid = ? AND recipient_uuid = ?`,
        [chat_uuid, sender_uuid, recipient_uuid]
    )
    const invite = invites[0] as IChatInvite

    const chat = await getChatService(invite.chat_uuid)
    const sender = await getUserByUuidService(invite.sender_uuid)
    const recipient = await getUserByUuidService(invite.recipient_uuid)

    invite.chat = chat
    invite.sender = sender
    invite.recipient = recipient

    return invite
}

const deleteChatInviteService = async (
    chat_uuid: string,
    sender_uuid: string,
    recipient_uuid: string
) => {
    await dbConnection.execute(
        `DELETE FROM chat_invites WHERE chat_uuid = ? AND sender_uuid = ? AND recipient_uuid = ?`,
        [chat_uuid, sender_uuid, recipient_uuid]
    )
}

const addTextService = async (
    uuid: string,
    chat_uuid: string,
    user_uuid: string,
    message: string,
    timestamp: string
) => {
    await dbConnection.execute(
        `INSERT INTO messages (uuid, chat_uuid, sender_uuid, message, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [uuid, chat_uuid, user_uuid, message, timestamp]
    )
}

const getChatHistoryService = async (chat_uuid: string) => {
    const query = `SELECT * FROM messages WHERE chat_uuid = "${chat_uuid}"`
    const rawRes = await dbConnection.query(query)
    const res = rawRes[0] as unknown[] as IMessage[]
    return res
}

const deleteChatService = async (chat_uuid: string) => {
    await dbConnection.execute(`DELETE FROM chat_members WHERE chat_uuid = ?`, [
        chat_uuid,
    ])

    await dbConnection.execute(`DELETE FROM chat_invites WHERE chat_uuid = ?`, [
        chat_uuid,
    ])

    await dbConnection.execute(`DELETE FROM messages WHERE chat_uuid = ?`, [
        chat_uuid,
    ])

    await dbConnection.execute(`DELETE FROM chat_sessions WHERE uuid = ?`, [
        chat_uuid,
    ])
}

const getTextService = async (uuid: string) => {
    const [messages] = await dbConnection.execute(
        `SELECT * FROM messages WHERE uuid = ? ORDER BY timestamp ASC`,
        [uuid]
    )
    return messages[0] as IMessage
}

const removeMemberFromChatService = async (
    chat_uuid: string,
    user_uuid: string
) => {
    await dbConnection.execute(
        `DELETE FROM chat_members WHERE chat_uuid = ? AND user_uuid = ?`,
        [chat_uuid, user_uuid]
    )
}

export {
    createChatService,
    addUserToChat,
    getChatService,
    getChatInvitesService,
    getUserInvitesService,
    checkInviteExists,
    checkUsersAlreadyHaveAPrivateChat,
    createChatInviteService,
    getUserChatsService,
    deleteChatInviteService,
    addTextService,
    getChatHistoryService,
    deleteChatService,
    getTextService,
    removeMemberFromChatService,
    getChatInviteService,
}
