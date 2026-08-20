import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

/**
 * Environment contract — spec 003.
 *
 * Boot pe validate hota hai. Missing ya galat var pe app start hi nahi hoga —
 * runtime pe fail hona allowed nahi hai.
 */

/**
 * `apps/api/.env` load karta hai — Node ka apna loader, koi `dotenv` package nahi (R3:
 * jitni kam dependencies utna kam maintenance).
 *
 * Path `import.meta.url` se banta hai, `process.cwd()` se nahi — `pnpm seed` repo root
 * se chalti hai aur `pnpm dev:api` `apps/api` se; cwd pe bharosa karte to ek jagah
 * `.env` milti aur dusri jagah nahi.
 *
 * File na ho to **chup-chaap** aage badho: production me asli env vars process me
 * hote hain, `.env` file wahan hoti hi nahi.
 */
const envFile = fileURLToPath(new URL('../../.env', import.meta.url))

/**
 * Test me `.env` **kabhi nahi** load hoti.
 *
 * Warna suite developer ki local file pe depend karne lagti hai: kisi ke yahan
 * `COOKIE_SECURE=true` hai to cookie ke naam badal jaate hain aur test fail hota hai,
 * jabki CI pe wahi test pass karta hai. Test ka env `vitest.config.js` me hai — bas
 * wahi, aur kuch nahi.
 */
const skipEnvFile = process.env.NODE_ENV === 'test'

if (!skipEnvFile && existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  // Pehle se set vars ko overwrite nahi karta — shell/CI ki value jeetti hai
  process.loadEnvFile(envFile)
}
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    /** Monorepo dev me repo root pe point karta hai; client repo me chhod do. */
    MIGRATIONS_DIR: z.string().optional(),

    // Canonical URL — redirects, sitemap, OG tags aur CORS allowlist sab isi se
    SITE_URL: z.string().url(),
    ADMIN_URL: z.string().url().optional(),

    MONGODB_URI: z.string().min(1),
    MONGODB_DB_NAME: z.string().min(1),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL: z.string().default('7d'),
    COOKIE_SECURE: z.coerce.boolean().default(false),
    COOKIE_DOMAIN: z.string().optional(),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    UPLOAD_DIR: z.string().optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    CDN_BASE_URL: z.string().url().optional(),
    MAX_UPLOAD_MB: z.coerce.number().int().positive().default(20),

    // Bina secret ke revalidate webhook ek public cache-purge endpoint hai
    REVALIDATE_SECRET: z.string().min(32),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().optional(),

    SENTRY_DSN: z.string().optional(),

    /**
     * Seed ka pehla admin — spec 004. Optional isliye hai ki ye sirf `pnpm seed` ke
     * waqt chahiye; inke bina app normally boot hona chahiye. Seed inhe na paaye to
     * admin user skip karke roles seed kar deta hai.
     */
    SEED_ADMIN_EMAIL: z.string().email().optional(),
    SEED_ADMIN_PASSWORD: z.string().optional(),
    SEED_ADMIN_NAME: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.STORAGE_DRIVER === 's3') {
      for (const key of [
        'S3_ENDPOINT',
        'S3_BUCKET',
        'S3_REGION',
        'S3_ACCESS_KEY',
        'S3_SECRET_KEY',
      ]) {
        if (!val[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `STORAGE_DRIVER=s3 hone pe ${key} zaroori hai`,
          })
        }
      }
    }
    if (val.STORAGE_DRIVER === 'local' && !val.UPLOAD_DIR) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['UPLOAD_DIR'],
        message: 'STORAGE_DRIVER=local hone pe UPLOAD_DIR zaroori hai',
      })
    }
  })

/** Secrets jo kabhi log nahi hone chahiye. */
export const REDACTED_KEYS = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'REVALIDATE_SECRET',
  'S3_SECRET_KEY',
  'S3_ACCESS_KEY',
  'SMTP_PASS',
  'MONGODB_URI',
  'SEED_ADMIN_PASSWORD',
]

/**
 * Process env ko parse karta hai. Fail hone pe saaf message deta hai aur exit karta hai.
 * @returns {z.infer<typeof envSchema>}
 */
export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`)
    console.error('\nEnvironment config galat hai:\n' + lines.join('\n') + '\n')
    console.error('.env.example dekho — spec 003 me poori list hai.\n')
    process.exit(1)
  }

  return result.data
}

export const env = loadEnv()
export const isProd = env.NODE_ENV === 'production'
export const isDev = env.NODE_ENV === 'development'
