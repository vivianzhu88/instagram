import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import axios from 'axios'
import { useState } from 'react'

export default function Create() {
  const [text, setText] = useState('')
  const [contentType, setContentType] = useState('')
  const [image, setImage] = useState<File | null>(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const response = await axios.post(`/api/feed/post`, {
        text,
        content_type: contentType,
      })

      if (response.status === 200) {
        console.log(response.data)
        setText('')
        setContentType('')
      } else {
        alert(response.data.error)
      }

      if (image) {
        const formData = new FormData()
        formData.append('image', image)
        const imageResponse = await axios.post(
          `/api/feed/post/${response.data.uuid}/image`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        )
        console.log(imageResponse.data)
      }
    } catch (err: any) {
      alert(err.response.data.error)
    }
  }

  return (
    <div className="flex w-full h-full">
      <Sidebar />
      <div className="flex items-start justify-center w-screen h-screen">
        <div className="flex flex-col gap-2 w-72 h-2/5">
          <form onSubmit={handleSubmit}>
            <Card className="flex flex-col items-center">
              <CardHeader>
                <CardTitle>New Post</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col w-full gap-2">
                <Input
                  type="text"
                  placeholder="What are you thinking about?"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <input
                  type="file"
                  onChange={(e) =>
                    setImage(e.target.files ? e.target.files[0] : null)
                  }
                />
              </CardContent>
              <CardFooter>
                <Button type="submit">Create</Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </div>
    </div>
  )
}
