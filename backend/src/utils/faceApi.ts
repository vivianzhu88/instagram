import * as tf from '@tensorflow/tfjs-node'
import {
    nets,
    detectAllFaces,
    SsdMobilenetv1Options,
} from '@vladmandic/face-api'
import { chromaImageCollection } from './chroma.ts'

let optionsSSDMobileNet

/**
 * Helper function, converts "descriptor" Int32Array to JavaScript array
 * @param {Int32Array} array
 * @returns JavaScript array
 */
const getArray = (array) => {
    const ret = []
    for (let i = 0; i < array.length; i++) {
        ret.push(array[i])
    }
    return ret
}

/**
 * Compute the face embeddings within an image file
 *
 * @param {*} imageFile
 * @returns List of detected faces' embeddings
 */
async function getEmbeddings(image) {
    const tensor = tf.node.decodeImage(image, 3)

    const faces = await detectAllFaces(tensor as any, optionsSSDMobileNet)
        .withFaceLandmarks()
        .withFaceDescriptors()
    tf.dispose(tensor)

    // For each face, get the descriptor and convert to a standard array
    return faces.map((face) => getArray(face.descriptor))
}

async function findTopKMatches(image, k) {
    const ret = []

    const queryEmbeddings = await getEmbeddings(image)
    for (const queryEmbedding of queryEmbeddings) {
        const results = await chromaImageCollection.query({
            queryEmbeddings: queryEmbedding,
            // By default embeddings aren't returned -- if you want
            // them you need to uncomment this line
            // include: ['embeddings', 'documents', 'metadatas'],
            nResults: k,
        })

        ret.push(results)
    }
    return ret
}

async function initializeFaceApi() {
    console.log('Initializing FaceAPI...')

    await tf.ready()
    await nets.ssdMobilenetv1.loadFromDisk('model')
    optionsSSDMobileNet = new SsdMobilenetv1Options({
        minConfidence: 0.5,
        maxResults: 1,
    })
    await nets.faceLandmark68Net.loadFromDisk('model')
    await nets.faceRecognitionNet.loadFromDisk('model')

    return
}

export { getEmbeddings, initializeFaceApi, findTopKMatches }
