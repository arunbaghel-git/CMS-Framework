import { createApp } from './app.js'
import { env } from './core/env.js'
import { logger } from './core/logger.js'
import { connectDb, disconnectDb } from './core/db.js'
import { checkPending } from './core/migrations/runner.js'

await connectDb()

/**
 * Migrations deploy step pe chalti hain, boot se pehle. Yahan sirf **check** hai.
 *
 * Boot jaan-boojh kar nahi rokte — chalti hui client site ko down karna pending
 * migration se zyada nuksaandeh hai. Warning loud hai, aur /api/health se admin ke
 * Site Health card tak pahunchti hai.
 */
const { pending, modified, missing } = await checkPending()

if (pending > 0) {
  logger.warn({ pending }, 'Pending migrations. Deploy step me "pnpm cms migrate" chalao')
}
if (modified > 0) {
  logger.error(
    { modified },
    'Applied migrations edit ho chuki hain — instances alag state pe ja sakte hain',
  )
}
if (missing > 0) {
  logger.error({ missing }, 'Ledger me migrations hain jo disk pe nahi mili')
}

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
