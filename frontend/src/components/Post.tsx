import { useEffect, useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Avatar } from '../components/ui/avatar'
import { AvatarImage } from '@radix-ui/react-avatar'
import { Heart, Trash2 } from 'lucide-react'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import DefaultProfilePhoto from '@/assets/defaultProfilePhoto.jpeg'

interface User {
  uuid: string
}

interface PostProps {
  uuid: string
  user_uuid: string
  text: string
  likes: unknown[]
  comments: Comment[]
  current_user: User
}

interface Comment {
  uuid: string
  text: string
  post_uuid: string
  user_uuid: string
  username?: string
}

interface CommentDialogProps {
  post_uuid: string
  current_user_uuid: string
  comments: Comment[]
}

function CommentDialog({
  post_uuid,
  current_user_uuid,
  comments,
}: CommentDialogProps) {
  const [comment, setComment] = useState('')
  const [liveComments, setLiveComments] = useState(comments)

  const handleAddComment = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    try {
      const commentResponse = await axios.post(
        `/api/feed/post/${post_uuid}/comment`,
        {
          comment,
        }
      )
      if (commentResponse.status === 200) {
        setComment('')
        setLiveComments(commentResponse.data.comments)
      } else {
        console.error(commentResponse.data.error)
      }
    } catch (err: any) {
      console.error(err.response.data.error)
    }
  }

  const handleDeleteComment = async (comment_uuid: string) => {
    try {
      const deleteResponse = await axios.delete(
        `/api/feed/comment/${comment_uuid}`
      )

      if (deleteResponse.status === 200) {
        setLiveComments(deleteResponse.data.comments)
      } else {
        console.error(deleteResponse.data.error)
      }
    } catch (err: any) {
      console.error(err.response.data.error)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">View Comments</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 items-start">
          {liveComments.map((comment) => (
            <div
              key={comment.uuid}
              className="w-full flex justify-between items-center gap-2"
            >
              <p>{comment.text}</p>
              {comment.user_uuid === current_user_uuid && (
                <Button
                  variant="ghost"
                  onClick={(_) => handleDeleteComment(comment.uuid)}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="flex w-full items-center space-x-2">
          <Input
            type="text"
            value={comment}
            placeholder="Enter a comment..."
            onChange={(e) => setComment(e.target.value)}
          />
          <Button type="submit" onClick={handleAddComment}>
            Comment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function Post({
  uuid,
  user_uuid,
  text,
  likes,
  comments,
  current_user,
}: PostProps) {
  const [username, setUsername] = useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(DefaultProfilePhoto)

  const [likeCount, setLikeCount] = useState(likes.length)

  const [photoUrl, setPhotoUrl] = useState('')

  useEffect(() => {
    setPhotoUrl(
      `https://user-images-plsfixautograder.s3.us-east-1.amazonaws.com/${uuid}`
    )

    const fetchData = async () => {
      try {
        const userResponse = await axios.get(`/api/profiles/user/${user_uuid}`)
        setUsername(userResponse.data.username)

        const imageResponse = await axios.get(
          `/api/profiles/user/${user_uuid}/image`
        )
        if (imageResponse.data.imageUrl) {
          setProfilePhotoUrl(imageResponse.data.imageUrl)
        }
      } catch (err: any) {
        console.error(err.response.data.error)
      }
    }

    fetchData()
  }, [])

  const handleLike = async () => {
    try {
      const likeResponse = await axios.post(`/api/feed/post/${uuid}/like`)
      if (likeResponse.status === 200) {
        setLikeCount(likeResponse.data.likes.length)
        console.log(likeResponse.data)
      } else {
        console.error(likeResponse.data.error)
      }
    } catch (err: any) {
      console.error(err.response.data.error)
    }
  }

  return (
    <Card className="flex justify-start items-center min-w-96 w-1/2">
      <CardContent className="flex flex-col w-full justify-center items-start gap-4 p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={profilePhotoUrl} />
          </Avatar>
          <span className="font-bold">{username}</span>
        </div>
        {photoUrl && (
          <img src={photoUrl} className="w-full h-96 object-cover" />
        )}
        {text && <p className="text-left">{text}</p>}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleLike}>
            <Heart className="h-4 w-4" />
          </Button>
          {likes && <span>{likeCount} likes</span>}
        </div>
        <CommentDialog
          post_uuid={uuid}
          current_user_uuid={current_user.uuid}
          comments={comments}
        />
      </CardContent>
    </Card>
  )
}
