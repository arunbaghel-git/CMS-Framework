import { connectDb, disconnectDb } from './core/db.js'
import { logger } from './core/logger.js'
import { ensureBuiltInContentTypes } from './modules/content-types/service.js'
import { ensurePackageDefaults } from './modules/package-defaults/service.js'
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
 *   ✅ content types (3)      — package · page · post (D-46)
 *   ✅ packageDefaults (1)    — khaali singleton (spec 007 §1.8)
 *   ⏳ taxonomies · templates · menus · entries
 *      — taxonomies me koi built-in row nahi hai: Destinations aur Package Type
 *        client ki apni vocabulary hain (spec 007 §1). Posts ka "Uncategorized"
 *        Posts ki screens ke saath aayega.
 */

/** @param {{ force?: boolean }} [options] */
export async function runSeed({ force = false } = {}) {
  const summary = {
    roles: [],
    contentTypes: [],
    admin: null,
    settings: null,
    packageDefaults: null,
  }

  summary.roles = await ensureDefaultRoles({ force })

  /**
   * Built-in content types — roles wala hi model (D-36, D-46). Har deploy pe sync hote
   * hain, isliye code me joda gaya naya field kisi chalu instance pe chhoot nahi jaata.
   */
  summary.contentTypes = await ensureBuiltInContentTypes({ force })

  /**
   * packageDefaults ka khaali document — `settings` jaisa singleton (D-40).
   *
   * `--force` ise chhoota **nahi**: usme client ka likha hua "What's included" aur
   * cancellation policy hoti hai, aur unhe reset karna seed ka kaam nahi. Wahi rule jo
   * `settings` pe pehle se laga hua hai.
   */
  const packageDefaults = await ensurePackageDefaults()
  summary.packageDefaults = {
    included: packageDefaults.whatsIncluded?.included?.length ?? 0,
    images: packageDefaults.itineraryImages?.length ?? 0,
  }

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

    for (const t of summary.contentTypes) {
      const detail = {}
      if (t.changed?.length) detail.changed = t.changed
      if (t.reason) detail.reason = t.reason

      logger.info({ contentType: t.key, ...detail }, `Content type ${t.action}`)
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
