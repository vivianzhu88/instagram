import { Kafka } from 'kafkajs'

const KAFKA_URL = process.env.KAFKA_URL || 'localhost:29092'
const TUNNEL_URL =
    process.env.TUNNEL_URL || 'kafka.tunnel.universe.esinx.net:9092'

const kafka = new Kafka({
    clientId: 'producer',
    brokers: [KAFKA_URL],
})

const tunnelKafka = new Kafka({
    clientId: 'tunnel',
    brokers: [TUNNEL_URL],
})

const producer = kafka.producer()
const tunnelProducer = tunnelKafka.producer()

const setUpKafka = async () => {
    await producer.connect()
    console.log('Connected normal kafka')
    await tunnelProducer.connect()
    console.log('Kafka producers connected')
}

export { producer, tunnelProducer, setUpKafka }
