import { ChromaClient, Collection } from 'chromadb'
import { dynamoDBClient } from './dynamoDB.ts'

const CHROMA_PATH = process.env.CHROMA_PATH || 'localhost:8000'
const CHROMA_POSTS_COLLECTION_NAME =
    process.env.CHROMA_POSTS_COLLECTION_NAME || 'posts'

const chromaClient = new ChromaClient({
    path: CHROMA_PATH,
})

let chromaImageCollection: Collection

let chromaPostsCollection: Collection

const setUpChroma = async () => {
    chromaPostsCollection = await chromaClient.getOrCreateCollection({
        name: CHROMA_POSTS_COLLECTION_NAME,
    })

    chromaImageCollection = await chromaClient.getOrCreateCollection({
        name: 'face-api',
        embeddingFunction: null,
        metadata: { 'hnsw:space': 'l2' },
    })

    const data = await dynamoDBClient.scan({
        TableName: 'actor-embeddings',
    })

    console.log('Adding image data to chroma: ' + data.Items.length + ' items')

    await Promise.all(
        data.Items.map(async (embedding) => {
            const emb = embedding['embedding'] as unknown as string
            const embArr = emb.S.split(',').map(Number)
            const data = {
                ids: [embedding['nconst'].S],
                embeddings: [embArr],
                metadatas: [{ source: 'imdb' }],
            }

            return chromaImageCollection.add(data)
        })
    )

    console.log('Chroma connected')
}

export {
    chromaClient,
    chromaPostsCollection,
    setUpChroma,
    chromaImageCollection,
}
