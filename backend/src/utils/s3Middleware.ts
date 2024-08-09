import { S3Client } from '@aws-sdk/client-s3'
import multer from 'multer'
import multerS3 from 'multer-s3'

const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
    },
})

const s3Upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.S3_BUCKET_NAME || 'user-images-plsfixautograder',
        acl: 'public-read-write',
        key: (req, file, cb) => {
            cb(null, `${req.user.uuid}`)
        },
    }),
})

const s3UploadImg = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.S3_BUCKET_NAME || 'user-images-plsfixautograder',
        acl: 'public-read-write',
        key: (req, file, cb) => {
            cb(null, `${req.params.uuid}`)
        },
    }),
})

export { s3Client, s3Upload, s3UploadImg }
