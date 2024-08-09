import { dbConnection } from '../../utils/mysql.ts'
import { IActor } from '../models/actorModel.ts'

const getActorService = async (actorId: string): Promise<IActor | null> => {
    const query = `SELECT * FROM actors WHERE nconst = "${actorId}"`
    const rawRes = await dbConnection.query(query)
    const res = rawRes[0] as unknown[]
    const user = res.length > 0 ? (res[0] as IActor) : null
    return user
}

export { getActorService }
