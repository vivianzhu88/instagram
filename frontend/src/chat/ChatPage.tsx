import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bot, Check, DoorOpen, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const CreateChatModal = ({ onlineFriends, onCreate, setIsOpen }) => {
  const [selectedFriends, setSelectedFriends] = useState({})

  const handleClick = async (friend) => {
    const newSelectedFriends = {
      ...selectedFriends,
      [friend.uuid]: !selectedFriends[friend.uuid],
    }
    setSelectedFriends(newSelectedFriends)
  }

  const handleSubmit = async (e) => {
    e.stopPropagation()

    const selected = Object.keys(selectedFriends).filter(
      (key) => selectedFriends[key]
    )

    if (selected.length === 0) {
      return
    }

    onCreate(selected)
    setIsOpen(false)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Chat</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Chat</DialogTitle>
          <DialogDescription>Let's send a message to...</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {onlineFriends.map((friend) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={friend.uuid}
                  checked={selectedFriends[friend.uuid]}
                  onCheckedChange={() => handleClick(friend)}
                />
                <Label htmlFor={friend.uuid}>{friend.username}</Label>
              </div>
            ))}
          </div>
          <DialogClose asChild>
            <Button onClick={handleSubmit}>Create Chat</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ChatPage() {
  const socketRef = useRef<any>()

  const [isConnected, setIsConnected] = useState(socketRef.current?.connected)
  const [user, setUser] = useState({
    uuid: '',
    username: '',
  })
  const [chats, setChats] = useState([])
  const [texts, setTexts] = useState([])
  const [friends, setFriends] = useState([])
  const [onlineFriends, setOnlineFriends] = useState([])

  const [createChatDialogIsOpen, setCreateChatDialogIsOpen] = useState(false)
  const [invites, setInvites] = useState([])
  const [tab, setTab] = useState('chats')

  const [selectedChat, setSelectedChat] = useState<string | null>(null)

  const [newText, setNewText] = useState('')

  const navigate = useNavigate()

  const pad = (num, size) => {
    num = num.toString()
    while (num.length < size) num = '0' + num
    return num
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-us', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getCurrentTime = () => {
    const date = new Date()
    return (
      date.toISOString().split('T')[0] + ' ' + date.toTimeString().split(' ')[0]
    )
  }

  useEffect(() => {
    if (!user.uuid) {
      const updateUser = async () => {
        try {
          const resp = await axios.get('/api/profiles/user')
          const data = resp.data
          setUser(data.user)
        } catch (e) {
          if (e.response.data.error === undefined) {
            return
          }

          if (e.response.data.error === 'Must be logged in.') {
            navigate('/')
            return
          }
          alert(e.response.data.error)
        }
      }
      updateUser()
      return
    }

    const onConnect = () => {
      setIsConnected(true)
      socketRef.current.emit('message', {
        query: 'connect',
        data: {
          user_uuid: user.uuid,
        },
      })
    }

    const onDisconnect = () => {
      setIsConnected(false)
    }

    const onConnectResponse = (message) => {
      console.log('connectResponse', message)
      setChats(message.chats)
      setInvites(message.invites)
      setFriends(message.friends)
      setOnlineFriends(message.onlineFriends)
    }

    socketRef.current = io('http://localhost:3000/', {
      autoConnect: false,
    })

    const getTextsResponse = (message) => {
      console.log(message)
      setTexts(message)
    }

    socketRef.current.on('connect', onConnect)
    socketRef.current.on('disconnect', onDisconnect)
    socketRef.current.on('connectResponse', onConnectResponse)
    socketRef.current.on('getTextsResponse', getTextsResponse)

    socketRef.current.connect()

    return () => {
      socketRef.current.off('connect', onConnect)
      socketRef.current.off('disconnect', onDisconnect)
      socketRef.current.off('connectResponse', onConnectResponse)
      socketRef.current.off('getTextsResponse', getTextsResponse)
      socketRef.current.disconnect()
    }
  }, [user])

  useEffect(() => {
    if (!socketRef.current) {
      return
    }

    const onCreateChat = (message) => {
      const newChats = [...chats, message]
      setChats(newChats)
    }

    socketRef.current.on('createChatResponse', onCreateChat)

    return () => {
      socketRef.current.off('createChatResponse', onCreateChat)
    }
  }, [chats, socketRef])

  useEffect(() => {
    if (!socketRef.current) {
      return
    }

    const onLeaveChat = (message) => {
      const newChats = chats.filter((chat) => chat.uuid !== message.uuid)
      setChats(newChats)
    }

    socketRef.current.on('leaveChatResponse', onLeaveChat)

    return () => {
      socketRef.current.off('leaveChatResponse', onLeaveChat)
    }
  }, [chats, socketRef])

  useEffect(() => {
    if (!socketRef.current) {
      return
    }

    const onNewMember = (message) => {
      console.log('new member', message)
      const newChats = chats.map((chat) => {
        if (chat.uuid === message.chat_uuid) {
          return {
            ...chat,
            members: [...chat.members, message],
            invites: chat.invites.filter(
              (invite) => invite.recipient_uuid !== message.user_uuid
            ),
          }
        }
        return chat
      })
      setChats(newChats)
      if (selectedChat && selectedChat.uuid === message.chat_uuid) {
        setSelectedChat({
          ...selectedChat,
          members: [...selectedChat.members, message],
          invites: selectedChat.invites.filter(
            (invite) => invite.recipient_uuid !== message.user_uuid
          ),
        })
      }
    }

    socketRef.current.on('newMember', onNewMember)

    return () => {
      socketRef.current.off('newMember', onNewMember)
    }
  }, [chats, selectedChat, socketRef])

  useEffect(() => {
    if (!socketRef.current) {
      return
    }

    const onDeletedChat = (message) => {
      const newChats = chats.filter((chat) => chat.uuid !== message)
      setChats(newChats)

      const newInvites = invites.filter(
        (invite) => invite.chat_uuid !== message
      )
      setInvites(newInvites)
    }

    socketRef.current.on('deletedChat', onDeletedChat)

    return () => {
      socketRef.current.off('deletedChat', onDeletedChat)
    }
  }, [chats, invites, socketRef])

  useEffect(() => {
    if (!socketRef.current) {
      return
    }

    const onInvite = (message) => {
      const newInvites = [...invites, message]
      setInvites(newInvites)
    }

    const onDeclineInvite = (message) => {
      const newInvites = invites.filter(
        (invite) =>
          invite.sender_uuid !== message.sender_uuid ||
          invite.recipient_uuid !== message.recipient_uuid ||
          invite.chat_uuid !== message.chat_uuid
      )
      setInvites(newInvites)
    }

    socketRef.current.on('invite', onInvite)
    socketRef.current.on('deleteInviteResponse', onDeclineInvite)

    return () => {
      socketRef.current.off('invite', onInvite)
      socketRef.current.off('deleteInviteResponse', onDeclineInvite)
    }
  }, [invites, socketRef])

  useEffect(() => {
    if (!socketRef.current) {
      return
    }

    const onFriendOnline = (message) => {
      console.log('friend online', message)
      const newOnlineFriends = [...onlineFriends, message]
      setOnlineFriends(newOnlineFriends)
    }

    const onFriendOffline = (message) => {
      console.log('friend offline', message)
      const newOnlineFriends = onlineFriends.filter(
        (friend) => friend.uuid !== message
      )
      setOnlineFriends(newOnlineFriends)
    }

    socketRef.current.on('friendOnline', onFriendOnline)
    socketRef.current.on('friendOffline', onFriendOffline)

    return () => {
      socketRef.current.off('friendOnline', onFriendOnline)
      socketRef.current.off('friendOffline', onFriendOffline)
    }
  }, [onlineFriends, socketRef])

  useEffect(() => {
    if (!socketRef.current) {
      return
    }

    const onAcceptInviteResponse = (message) => {
      console.log(message)
      const newChats = [...chats, message.chat]
      setChats(newChats)

      const newInvites = invites.filter(
        (invite) => invite.uuid !== message.invite.uuid
      )
      setInvites(newInvites)

      setSelectedChat(message.chat)
      setTexts([])

      socketRef.current.emit('message', {
        query: 'getTexts',
        data: {
          chat_uuid: message.chat.uuid,
          user_uuid: user.uuid,
        },
      })
    }

    socketRef.current.on('acceptInviteResponse', onAcceptInviteResponse)

    return () => {
      socketRef.current.off('acceptInviteResponse', onAcceptInviteResponse)
    }
  }, [chats, invites, socketRef])

  const onCreate = (members) => {
    socketRef.current.emit('message', {
      query: 'createChat',
      data: {
        user_uuid: user.uuid,
        members,
      },
    })

    setTab('chats')
  }

  useEffect(() => {
    if (!socketRef.current) {
      return
    }

    const onText = (message) => {
      if (message.chat_uuid !== selectedChat.uuid) {
        return
      }

      const newMessages = [...texts, message]
      setTexts(newMessages)
    }

    socketRef.current.on('textResponse', onText)

    return () => {
      socketRef.current.off('textResponse', onText)
    }
  }, [texts, socketRef, selectedChat])

  const leaveChat = (chat) => {
    socketRef.current.emit('message', {
      query: 'leaveChat',
      data: {
        user_uuid: user.uuid,
        chat_uuid: chat.uuid,
      },
    })

    setSelectedChat(null)
    setTexts([])
  }

  const acceptInvite = (invite) => {
    socketRef.current.emit('message', {
      query: 'acceptInvite',
      data: {
        sender_uuid: invite.sender_uuid,
        user_uuid: user.uuid,
        chat_uuid: invite.chat.uuid,
      },
    })

    setTab('chats')
  }

  const declineInvite = (invite) => {
    socketRef.current.emit('message', {
      query: 'deleteInvite',
      data: {
        sender_uuid: invite.sender_uuid,
        user_uuid: user.uuid,
        chat_uuid: invite.chat.uuid,
      },
    })
  }

  const selectChat = (uuid) => {
    setSelectedChat(chats.filter((chat) => chat.uuid === uuid)[0])
    setTexts([])

    socketRef.current.emit('message', {
      query: 'getTexts',
      data: {
        chat_uuid: uuid,
        user_uuid: user.uuid,
      },
    })
  }

  const addText = () => {
    if (newText.trim() === '') {
      return
    }

    socketRef.current.emit('message', {
      query: 'text',
      data: {
        user_uuid: user.uuid,
        chat_uuid: selectedChat.uuid,
        text: newText,
        timestamp: getCurrentTime(),
      },
    })

    setNewText('')
  }

  return (
    <div className="flex w-screen h-screen">
      <Sidebar />
      <div className="flex w-full h-full px-14 gap-4">
        <div className="flex flex-col w-1/3">
          <div className="flex justify-between">
            <Button
              variant={tab === 'chats' ? 'default' : 'ghost'}
              className="w-1/3"
              onClick={() => setTab('chats')}
            >
              Chats
            </Button>
            <Button
              variant={tab === 'invites' ? 'default' : 'ghost'}
              className="flex justify-center w-1/3 gap-2"
              onClick={() => setTab('invites')}
            >
              Invites
            </Button>
            <Button
              variant={tab === 'friends' ? 'default' : 'ghost'}
              className="w-1/3"
              onClick={() => setTab('friends')}
            >
              Friends
            </Button>
          </div>
          <div className="h-full pt-2">
            {tab === 'chats'
              ? chats.map((chat) => (
                  <div>
                    <div
                      key={chat.uuid}
                      onClick={() => selectChat(chat.uuid)}
                      className={`flex justify-between items-center min-h-16 py-3 px-3 cursor-pointer rounded-sm hover:bg-slate-100 ${
                        selectedChat && selectedChat.uuid === chat.uuid
                          ? 'bg-slate-100'
                          : ''
                      }`}
                    >
                      <div className="font-bold">
                        {chat.group_chat && chat.name
                          ? chat.name
                          : chat.members.length > 1
                          ? chat.members
                              .map((member) => member.user)
                              .concat(
                                chat.invites.map((invite) => invite.recipient)
                              )
                              .filter((u) => u.uuid !== user.uuid)
                              .map((u) => u.username)
                              .join(', ')
                          : 'Empty Chat'}
                      </div>
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          leaveChat(chat)
                        }}
                      >
                        <DoorOpen />
                      </Button>
                    </div>
                  </div>
                ))
              : tab === 'invites'
              ? invites.map((invite) => (
                  <div>
                    <div
                      key={invite.uuid}
                      className="flex justify-between items-center min-h-16 py-3 px-3"
                    >
                      <p className="font-bold">
                        {invite.chat.group_chat && invite.chat.name
                          ? invite.chat.name
                          : invite.chat.members
                              .map((member) => member.user)
                              .concat(
                                invite.chat.invites.map(
                                  (invite) => invite.recipient
                                )
                              )
                              .filter((u) => u.uuid !== user.uuid)
                              .map((u) => u.username)
                              .join(', ')}
                      </p>
                      <div>
                        <Button
                          variant="ghost"
                          className="h-full"
                          onClick={() => acceptInvite(invite)}
                        >
                          <Check />
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-full"
                          onClick={() => declineInvite(invite)}
                        >
                          <X />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              : friends.map((friend) => (
                  <div>
                    <div
                      key={friend.uuid}
                      className="flex justify-between items-center min-h-16 py-3 px-3"
                    >
                      <p className="font-bold">{friend.username}</p>
                      <div>
                        {onlineFriends.filter((of) => of.uuid === friend.uuid)
                          .length > 0 ? (
                          <Badge variant="default">Online</Badge>
                        ) : (
                          <Badge variant="outline">Offline</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
        <div className="flex flex-col w-full bg-slate-100 rounded-sm justify-center items-center">
          {selectedChat ? (
            <div className="flex flex-col w-full h-full">
              <div className="flex justify-center items-center min-h-16 py-3">
                <p className="font-bold">
                  {selectedChat.group_chat && selectedChat.name
                    ? selectedChat.name
                    : selectedChat.members.length > 1
                    ? selectedChat.members
                        .map((member) => member.user)
                        .concat(
                          selectedChat.invites.map((invite) => invite.recipient)
                        )
                        .filter((u) => u.uuid !== user.uuid)
                        .map((u) => u.username)
                        .join(', ')
                    : 'Empty Chat'}
                </p>
              </div>
              <div className="flex flex-col h-full gap-2">
                {texts.map((text) => (
                  <div
                    key={text.uuid}
                    className="flex justify-between items-center px-8"
                  >
                    <p>
                      <span className="font-bold">
                        {selectedChat.members.filter(
                          (member) => member.user_uuid === text.sender_uuid
                        )[0]?.user.username || 'Deleted User'}
                      </span>
                      : {text.message}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {formatTime(text.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
              {selectedChat.members.length > 1 ? (
                <Input
                  type="text"
                  value={newText}
                  placeholder="Enter message here..."
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyUp={(k) => k.key === 'Enter' && addText()}
                />
              ) : (
                <p>Waiting for other members to join...</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 items-center">
              <Bot className="w-12 h-12" />
              <p>Let's start a chat.</p>
              <CreateChatModal
                onlineFriends={onlineFriends}
                onCreate={onCreate}
                setIsOpen={setCreateChatDialogIsOpen}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
