import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from './logger.js'

/** Mongo connect. Fail hone pe app boot nahi hoga. */
export async function connectDb() {
  mongoose.set('strictQuery', true)

  try {
    await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB_NAME })
    logger.info({ db: env.MONGODB_DB_NAME }, 'Mongo connected')
  } catch (err) {
    logger.error({ err }, 'Mongo connect fail')
    process.exit(1)
  }

  mongoose.connection.on('disconnected', () => logger.warn('Mongo disconnected'))
  mongoose.connection.on('reconnected', () => logger.info('Mongo reconnected'))
}

export async function disconnectDb() {
  await mongoose.connection.close()
  logger.info('Mongo connection closed')
}
