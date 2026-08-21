import { connectDb, disconnectDb } from './core/db.js'
import { logger } from './core/logger.js'
import { ensureDefaultRoles } from './modules/roles/service.js'
import { ensureSettings } from './modules/settings/service.js'
import { ensureAdminUser } from './modules/users/service.js'
import { createUserSchema } from './modules/users/validation.js'

/**
 * Seed — spec 004.
 *
 * **Idempotent:** dobara chalne pe kuch duplicate nahi banta aur existing data pe
 * destructive kabhi nahi. `--force` sirf built-in roles ki permissions reset karta hai.
 *
 * Abhi ye Phase 0 ka hissa seed karta hai:
 *   ✅ roles (5)              ✅ admin user (1)          ✅ settings (1)
 *   ⏳ content types · taxonomies · templates · menus · entries
 *      — ye Phase 1 me aayenge, jab wo collections banengi
 */

/** @param {{ force?: boolean }} [options] */
export async function runSeed({ force = false } = {}) {
  const summary = { roles: [], admin: null, settings: null }

  summary.roles = await ensureDefaultRoles({ force })

  /**
   * Settings ka document — idempotent. `--force` ise chhoota nahi: usme site ka naam,
   * contact number aur social links hote hain jo admin ne haath se bhare hain, aur
   * unhe reset karna seed ka kaam nahi.
   */
  const settings = await ensureSettings()
  summary.settings = { siteName: settings.siteName }

  const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME } = process.env

  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    logger.warn('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD set nahi hain — admin user skip kiya')
    return summary
  }

  /**
   * Seed ka input bhi Zod se guzarta hai (R8). Chhota password yahan pakda jaana
   * chahiye — pehle login pe nahi, jab admin ke paas dev tak pahunch bhi na ho.
   */
  const input = createUserSchema.parse({
    name: SEED_ADMIN_NAME || 'Administrator',
    email: SEED_ADMIN_EMAIL,
    password: SEED_ADMIN_PASSWORD,
    role: 'admin',
  })

  summary.admin = await ensureAdminUser(input)
  return summary
}

/** CLI entry — `pnpm seed`. */
export async function main(argv = process.argv.slice(2)) {
  const force = argv.includes('--force')

  await connectDb()

  try {
    const summary = await runSeed({ force })

    for (const r of summary.roles) {
      // Kya juda/hata bhi dikhao — "synced" akela ye nahi batata ki asar kya hua
      const detail = {}
      if (r.added?.length) detail.added = r.added
      if (r.removed?.length) detail.removed = r.removed

      logger.info({ role: r.key, ...detail }, `Role ${r.action}`)
    }

    if (summary.admin) {
      logger.info({ email: summary.admin.user.email }, `Admin user ${summary.admin.action}`)
      if (summary.admin.action === 'created') {
        logger.warn('Pehle login pe password badalna zaroori hai (mustChangePassword)')
      }
    }

    logger.info('Seed poora hua')
  } finally {
    await disconnectDb()
  }
}

// Sirf tab chalao jab file **directly** run ho — import karne pe nahi (tests)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed.js')) {
  await main()
}
