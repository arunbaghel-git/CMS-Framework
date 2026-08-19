import { createApp } from './app.js'
import { env } from './core/env.js'
import { logger } from './core/logger.js'
import { connectDb, disconnectDb } from './core/db.js'

await connectDb()

const app = createApp()
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API ready')
})

/** Graceful shutdown — chalti hui requests poori hone do. */
async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down')
  server.close(async () => {
    await disconnectDb()
    process.exit(0)
  })
  setTimeout(() => {
    logger.error('Graceful shutdown timeout — force exit')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
