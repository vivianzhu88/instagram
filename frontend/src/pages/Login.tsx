import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        await axios.post('/api/profiles/user/login', {})
      } catch (err: any) {
        if (err.response.data.error.includes('Already logged in.')) {
          navigate('/home')
        }
      }
    }
    checkLoggedIn()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const response = await axios.post('/api/profiles/user/login', {
        username,
        password,
      })
      if (response.status === 200) {
        navigate('/home')
        return
      } else {
        setError(response.data.error)
      }
    } catch (err: any) {
      if (err.response.data.error.includes("Already logged in.")) {
        navigate('/home')
        return
      }
      alert(err.response.data.error)
    }
  }

  return (
    <div className="flex justify-center w-full h-full">
      <div className="flex flex-col justify-center gap-2 h-full">
        <form onSubmit={handleSubmit}>
          <Card className="flex flex-col items-center">
            <CardHeader>
              <CardTitle>Pennstagram</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col w-full gap-2">
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <span className="text-sm text-red-500">{error}</span>}
            </CardContent>
            <CardFooter>
              <Button type="submit">Log In</Button>
            </CardFooter>
          </Card>
        </form>
        <Card>
          <CardHeader>
            <CardDescription>
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#1db954]">
                Sign up
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
