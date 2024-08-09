import { findTopKMatches } from '../../utils/faceApi.ts'
import { dbConnection } from '../../utils/mysql.ts'

// profilesRouter.get('/:username/actors', async (req, res) => {
//     const name: string = req.body.actor

//     if (!name || name === '') {
//         return res.status(400).json({ error: 'Name is required.' })
//     }

//     const command = new ScanCommand({
//         ExpressionAttributeValues: { ':name': { S: name } },
//         FilterExpression: 'primaryName = :name',
//         TableName: tableName,
//     })

//     try {
//         const result = await dynamoDBClient.send(command)
//         if (result.Items && result.Items.length > 0) {
//             const embeddings = result.Items[0]['embeddings'].S
//             const embeddingList = embeddings
//                 .slice(1, -1)
//                 .split(',')
//                 .map((ele) => parseFloat(ele))

//             const collection = await chromaClient.getCollection({
//                 name: 'imdb-photos',
//             })

//             const closest = await collection.query({
//                 queryEmbeddings: [embeddingList],
//                 nResults: 5,
//             })

//             const imagePaths = closest['documents'][0].map((doc) => {
//                 return JSON.parse(doc)['path']
//             })
//             return res.json(imagePaths)
//         } else {
//             return res.status(404).json({ error: 'Actor not found.' })
//         }
//     } catch (err) {
//         return res.status(500).json({ error: 'Error querying databases.' })
//     }
// })

const seedActorsController = async (req, res) => {
    const actors = ['nc0001', 'nc0002', 'nc0003', 'nc0004', 'nc0005']

    const query = `INSERT INTO actors (nconst) VALUES ${actors.map((actor) => `("${actor}")`).join(', ')}`

    await dbConnection.execute(query)

    return res.status(200).json({ message: 'Actors seeded successfully.' })
}

const nearestActorController = async (req, res) => {
    const image = req.file.buffer

    if (!image) {
        return res.status(400).json({ error: 'Image is required.' })
    }

    const matches = await findTopKMatches(image, 5)

    console.log(matches)

    res.status(200).json(matches)
}

export { seedActorsController, nearestActorController }
