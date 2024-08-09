import Sidebar from '@/components/Sidebar'
import { Input } from '@/components/ui/input'
import axios from 'axios'
import { useEffect, useState } from 'react'
import Post from '@/components/Post'

export default function Discover() {
  const [user, setUser] = useState({})

  const [query, setQuery] = useState('')

  const [message, setMessage] = useState('')
  const [posts, setPosts] = useState([])

  const fetchUser = async () => {
    try {
      const userResponse = await axios.get('/api/profiles/user')
      setUser(userResponse.data.user)
    } catch (err: any) {
      alert(err.response.data.error)
    }
  }

  const fetchRag = async (message: string) => {
    try {
      const response = await axios.post('/api/feed/rag', {
        message,
      })

      console.log(response.data)
      setMessage(response.data.message)
      setPosts(response.data.posts)
    } catch (err: any) {
      setMessage(err.response.data.error)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchRag("What's going on around me right now?")
  }, [])

  return (
    <div className="flex w-full h-full">
      <Sidebar />
      <div className="flex flex-col justify-start items-start gap-4 w-full px-14">
        <h2 className="text-xl font-bold">Discover</h2>
        <Input
          type="search"
          value={query}
          placeholder="What's going on around me right now?"
          onChange={(e) => {
            e.preventDefault()
            setQuery(e.target.value)
          }}
          onKeyUp={(e) => {
            e.preventDefault()
            if (e.key === 'Enter') {
              fetchRag(query)
            }
          }}
        />
        {message ? (
          <p className="text-left">{message}</p>
        ) : (
          <p className="text-left text-slate-500">Thinking...</p>
        )}
        {posts && (
          <div className="flex flex-col w-full h-full items-start space-y-8">
            <h2 className="font-bold text-lg">Relevant Posts</h2>
            <div className="flex flex-col gap-4 w-full items-center">
              {posts.map((post: any) => (
                <Post key={post.uuid} current_user={user} {...post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
