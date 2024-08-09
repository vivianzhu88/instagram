import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import {
    addUserToChat as addUserToChatService,
    checkInviteExists,
    createChatInviteService,
    createChatService,
    checkUsersAlreadyHaveAPrivateChat,
    getChatService,
    getUserChatsService,
    getUserInvitesService,
    deleteChatInviteService,
    addTextService,
    getChatHistoryService,
    deleteChatService,
    getTextService,
    removeMemberFromChatService,
    getChatInviteService,
} from './chatServices.ts'
import { getAllFriendsService } from '../profiles/services/friendServices.ts'
import { getUserByUuidService } from '../profiles/services/userServices.ts'
const onlineUsers = {}

let io

const onConnectHandler = async (socket, data) => {
    const { user_uuid } = data

    // get the user's chat sessions
    const chats = await getUserChatsService(user_uuid)

    // get the user's chat invites
    const invites = await getUserInvitesService(user_uuid)

    const user = await getUserByUuidService(user_uuid)

    const friends = await getAllFriendsService(user_uuid)

    const onlineFriends = friends.filter((friend) => {
        return onlineUsers[friend.uuid]
    })

    // notify other friends that the user is now online
    onlineFriends.forEach((friend) => {
        const friendSocket = onlineUsers[friend.uuid]
        console.log('friendOnline', friend, user)
        friendSocket.emit('friendOnline', user)
    })

    socket.emit('connectResponse', { chats, invites, friends, onlineFriends })
}

const createChatHandler = async (socket, data) => {
    const { user_uuid, members, name } = data

    const chat_uuid = uuidv4()

    if (members.length == 1) {
        // check if a private chat already exists
        if (await checkUsersAlreadyHaveAPrivateChat(user_uuid, members[0])) {
            throw new Error('Users already have a private chat')
        }
    }

    await createChatService(chat_uuid, members.length > 1, name)

    await addUserToChatService(chat_uuid, user_uuid)

    await Promise.all(
        members.map(async (member) => {
            if (member == user_uuid) {
                return
            }

            await sendInviteRaw(chat_uuid, user_uuid, member)
        })
    )

    const chat = await getChatService(chat_uuid)

    socket.emit('createChatResponse', chat)
}

const sendInviteRaw = async (chat_uuid, sender_uuid, recipient_uuid) => {
    // check if chat exists
    const chat = await getChatService(chat_uuid)
    if (!chat) {
        throw new Error('Chat does not exist')
    }

    if (chat.members.includes(recipient_uuid)) {
        throw new Error('Recipient is already in the chat')
    }

    // check if recipient is online
    if (!onlineUsers[recipient_uuid]) {
        throw new Error('Recipient is not online')
    }

    // check if groupchat is private, and if it's already full
    const isGroupChat = chat.group_chat
    if (!isGroupChat) {
        // for private chat, check if two members are in the chat
        if (
            await checkUsersAlreadyHaveAPrivateChat(sender_uuid, recipient_uuid)
        ) {
            throw new Error('Users already have a private chat')
        }

        if (chat.members.length >= 2) {
            throw new Error('Private chat is already full')
        }
    }

    // check if duplicate invites
    if (await checkInviteExists(chat_uuid, sender_uuid, recipient_uuid)) {
        throw new Error('Invite already exists')
    }

    // send the invite
    await createChatInviteService(chat_uuid, sender_uuid, recipient_uuid)

    // get the invite
    const invite = await getChatInviteService(
        chat_uuid,
        sender_uuid,
        recipient_uuid
    )

    // notify the invited user about the invitation
    const recipientSocket = onlineUsers[recipient_uuid]
    if (recipientSocket) {
        recipientSocket.emit('invite', invite)
    }
}

const sendInviteHandler = async (socket, data) => {
    const { sender_uuid, recipient_uuid, chat_uuid } = data

    sendInviteRaw(chat_uuid, sender_uuid, recipient_uuid)
}

const acceptInviteHandler = async (socket, data) => {
    const { sender_uuid, user_uuid, chat_uuid } = data

    // can't accept invite to duplicate private chat
    const chat = await getChatService(chat_uuid)

    if (!chat) {
        throw new Error('Chat does not exist')
    }

    if (chat.members.includes(user_uuid)) {
        throw new Error('User is already in the chat')
    }

    if (
        chat.invites.filter((invite) => invite.recipient_uuid === user_uuid)
            .length === 0
    ) {
        throw new Error('User is not invited to the chat')
    }

    if (!chat.group_chat) {
        if (
            await checkUsersAlreadyHaveAPrivateChat(
                chat.members[0].user_uuid,
                user_uuid
            )
        ) {
            throw new Error('Users already have a private chat')
        }
    }

    // add the user to the chat
    await addUserToChatService(chat_uuid, user_uuid)

    // delete the invite
    await deleteChatInviteService(chat_uuid, sender_uuid, user_uuid)

    const user = await getUserByUuidService(user_uuid)

    // notify all other users in the chat
    chat.members.forEach((member) => {
        if (member.user_uuid == user_uuid) {
            return
        }

        const recipientSocket = onlineUsers[member.user_uuid]

        if (!recipientSocket) {
            return
        }

        recipientSocket.emit('newMember', {
            chat_uuid,
            user_uuid,
            user,
        })
    })

    chat.invites.filter((invite) => invite.recipient_uuid !== user_uuid)
    chat.members.push({ user_uuid, user, chat_uuid })

    socket.emit('acceptInviteResponse', {
        chat,
        invite: data,
    })
}

const deleteInviteHandler = async (socket, data) => {
    const { sender_uuid, user_uuid, chat_uuid } = data

    await deleteChatInviteService(chat_uuid, sender_uuid, user_uuid)

    socket.emit('deleteInviteResponse', data)
}

const textHandler = async (socket, data) => {
    const { user_uuid, chat_uuid, text, timestamp } = data

    // check if chat exists
    const chat = await getChatService(chat_uuid)

    if (!chat) {
        throw new Error('Chat does not exist')
    }

    // check if user is a member of the chat
    if (
        chat.members.filter((member) => member.user_uuid === user_uuid)
            .length === 0
    ) {
        throw new Error('User is not a member of the chat')
    }

    const uuid = uuidv4()

    // insert message into the database
    await addTextService(uuid, chat_uuid, user_uuid, text, timestamp)

    const dbText = await getTextService(uuid)

    // emit event for new message
    chat.members.forEach((member) => {
        const recipientSocket = onlineUsers[member.user_uuid]

        if (!recipientSocket) {
            return
        }
        recipientSocket.emit('textResponse', dbText)
    })
}

const getTextsHandler = async (socket, data) => {
    const { chat_uuid, user_uuid } = data

    // check if chat exists
    const chat = await getChatService(chat_uuid)
    if (!chat) {
        throw new Error('Chat does not exist')
    }

    // check if user is a member of the chat
    if (
        chat.members.filter((member) => member.user_uuid === user_uuid)
            .length === 0
    ) {
        throw new Error('User is not a member of the chat')
    }

    // get chat history
    const texts = await getChatHistoryService(chat_uuid)
    socket.emit('getTextsResponse', texts)
}

const getChatsHandler = async (socket, data) => {
    const { user_uuid } = data

    // get the user's chat sessions
    const chats = await getUserChatsService(user_uuid)
    socket.emit('getChatsResponse', chats)
}

const leaveChatHandler = async (socket, data) => {
    const { user_uuid, chat_uuid } = data

    // check if chat exists
    const chat = await getChatService(chat_uuid)
    if (!chat) {
        throw new Error('Chat does not exist')
    }

    // check the user is part of the chat
    if (
        chat.members.filter((member) => member.user_uuid == user_uuid)
            .length === 0
    ) {
        throw new Error('User is not a member of the chat')
    }

    if (chat.group_chat) {
        if (chat.members.length > 2) {
            await removeMemberFromChatService(chat_uuid, user_uuid)

            chat.members.forEach((member) => {
                if (member == user_uuid) {
                    return
                }

                const recipientSocket = onlineUsers[member.user_uuid]

                if (!recipientSocket) {
                    return
                }
                recipientSocket.emit('leftChat', user_uuid)
            })

            socket.emit('leaveChatResponse', chat)
            return
        }
    }

    // if it's a private chat, delete the chat session
    await deleteChatService(chat_uuid)

    chat.members.forEach((member) => {
        if (member == user_uuid) {
            return
        }

        const recipientSocket = onlineUsers[member.user_uuid]

        if (!recipientSocket) {
            return
        }
        recipientSocket.emit('deletedChat', chat.uuid)
    })

    chat.invites.forEach((invite) => {
        const recipientSocket = onlineUsers[invite.recipient_uuid]

        if (!recipientSocket) {
            return
        }
        recipientSocket.emit('deletedChat', chat.uuid)
    })

    socket.emit('leaveChatResponse', chat)
}

const connectHandler = (socket) => {
    let user_uuid

    console.log('Client connected')

    // listen for messages
    socket.on('message', async (message) => {
        console.log('Received message:', message)
        const { query, data } = message

        try {
            switch (query) {
                case 'connect':
                    await onConnectHandler(socket, data)
                    onlineUsers[data.user_uuid] = socket
                    user_uuid = data.user_uuid
                    console.log('connected user', user_uuid)
                    break
                case 'createChat':
                    await createChatHandler(socket, data)
                    break
                case 'sendInvite':
                    await sendInviteHandler(socket, data)
                    break
                case 'acceptInvite':
                    await acceptInviteHandler(socket, data)
                    break
                case 'deleteInvite':
                    await deleteInviteHandler(socket, data)
                    break
                case 'text':
                    await textHandler(socket, data)
                    break
                case 'getTexts':
                    await getTextsHandler(socket, data)
                    break
                case 'getChats':
                    await getChatsHandler(socket, data)
                    break
                case 'leaveChat':
                    await leaveChatHandler(socket, data)
                    break
                default:
                    throw new Error('Invalid query')
            }
        } catch (e) {
            console.error('Error processing message:', e)
            socket.emit('error', { message: e.message })
        }
    })

    // listen for disconnect
    socket.on('disconnect', async () => {
        if (!user_uuid) {
            return
        }

        console.log('disconnected user', user_uuid)
        delete onlineUsers[user_uuid]

        const friends = await getAllFriendsService(user_uuid)

        const onlineFriends = friends.filter((friend) => {
            return onlineUsers[friend.uuid]
        })

        // notify other friends that the user is no longer online
        onlineFriends.forEach((friend) => {
            const friendSocket = onlineUsers[friend.uuid]
            friendSocket.emit('friendOffline', user_uuid)
        })
    })
}

const setupSocketIo = async (server) => {
    io = new Server(server, {})

    io.on('connection', connectHandler)
}

export { connectHandler as socketHandler, setupSocketIo }
