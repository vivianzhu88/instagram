import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Post from '@/components/Post'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [user, setUser] = useState({})

  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await axios.get('/api/profiles/user')
        setUser(userResponse.data.user)

        const feedResponse = await axios.get('/api/feed/post/ranked', {
          withCredentials: true,
        })
        console.log(feedResponse.data)
        setPosts(feedResponse.data)
      } catch (err: any) {
        if (err.response.data.error.includes('Must be logged in.')) {
          navigate('/')
        }
        alert(err.response.data.error)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="flex w-full h-full">
      <Sidebar />
      <div className="flex flex-col items-center w-full gap-4">
        {posts.map((post: any) => (
          <Post key={post.uuid} current_user={user} {...post} />
        ))}
      </div>
    </div>
  )
}
