import { createApp } from './app.js'
import { env } from './core/env.js'
import { logger } from './core/logger.js'
import { connectDb, disconnectDb } from './core/db.js'
import { checkPending } from './core/migrations/runner.js'
import { publishDueEntries } from './modules/entries/service.js'

await connectDb()

/**
 * Migrations deploy step pe chalti hain, boot se pehle. Yahan sirf **check** hai.
 *
 * Boot jaan-boojh kar nahi rokte — chalti hui client site ko down karna pending
 * migration se zyada nuksaandeh hai. Warning loud hai, aur /api/health se admin ke
 * Site Health card tak pahunchti hai.
 */
const { pending, modified, missing, error, message } = await checkPending()

if (error) {
  // Migrations padhi hi nahi ja saki — usually galat MIGRATIONS_DIR. Iske baad ke
  // "0 pending" ka koi matlab nahi hai, isliye ye sabse pehle aur loud hai.
  logger.error({ message }, 'Migrations check fail — pending status pata nahi chal saka')
}
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

/**
 * Scheduled publish ka cron — har minute (R2, D-11).
 *
 * **Per-entry `setTimeout` kabhi nahi.** Wo process restart pe gayab ho jaata hai aur us
 * page ka publish hamesha ke liye ruk jaata hai, bina kisi error ke — ye is project ka
 * documented trap hai. Yahan timer sirf "ab dekh lo" bolta hai; faisla poora DB se hota
 * hai (`status: scheduled` + indexed `publishAt`).
 *
 * Multi-instance safe hai: claim `findOneAndUpdate` se hoti hai, to do instance ek hi
 * entry nahi utha sakte. Aur cron poori tarah band ho jaaye tab bhi site sahi rehti hai —
 * public read query khud `scheduled && publishAt <= now` ko published maanti hai
 * (`isPubliclyVisible`). Cron sirf cache invalidate karne aur admin me sahi status
 * dikhane ke liye hai.
 *
 * Ye `app.js` me nahi hai, `index.js` me hai — warna har test file apna timer chalu kar
 * deti aur vitest process kabhi khatam hi na hota.
 */
const scheduledPublishTimer = setInterval(async () => {
  try {
    const { published } = await publishDueEntries()
    if (published.length > 0) {
      logger.info({ count: published.length }, 'Scheduled items published')
    }
  } catch (err) {
    // Fail-soft: ek tick fail hone se server nahi girna chahiye — agla tick 60s me hai
    logger.error({ err }, 'Scheduled publish tick fail hua')
  }
}, 60_000)

scheduledPublishTimer.unref()

/** Graceful shutdown — chalti hui requests poori hone do. */
async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down')
  clearInterval(scheduledPublishTimer)
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
