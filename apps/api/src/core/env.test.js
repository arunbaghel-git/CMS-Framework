import { describe, it, expect } from 'vitest'

import { loadEnv } from './env.js'

/**
 * Env parsing ke wo hisse jo chup-chaap galat ho sakte hain.
 *
 * `loadEnv()` fail hone pe `process.exit(1)` karta hai, isliye yahan sirf **valid**
 * inputs test hote hain. "Missing var pe boot fail ho" wala test tab likhega jab
 * `loadEnv` throw kare — abhi wo exit karta hai (spec 003 ka open item).
 */

/** Har required field ke saath ek chalta-phirta base env. */
function baseEnv(overrides = {}) {
  return {
    SITE_URL: 'http://localhost:3000',
    MONGODB_URI: 'mongodb://localhost:27017',
    MONGODB_DB_NAME: 'test',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
    JWT_REFRESH_SECRET: 'y'.repeat(32),
    REVALIDATE_SECRET: 'z'.repeat(32),
    STORAGE_DRIVER: 'local',
    UPLOAD_DIR: './uploads',
    ...overrides,
  }
}

describe('COOKIE_SECURE', () => {
  /**
   * Ye asli bug tha: `z.coerce.boolean()` `Boolean('false')` chalata hai, jo `true`
   * hai. `.env` me `COOKIE_SECURE=false` likhne ke baad bhi cookie `Secure` rehti
   * thi — aur plain HTTP dev me browser use store hi nahi karta, yaani login "kaam
   * karta hua" dikhta par session tikta nahi.
   */
  it('string "false" ko false maanta hai', () => {
    expect(loadEnv(baseEnv({ COOKIE_SECURE: 'false' })).COOKIE_SECURE).toBe(false)
  })

  it('string "true" ko true maanta hai', () => {
    expect(loadEnv(baseEnv({ COOKIE_SECURE: 'true' })).COOKIE_SECURE).toBe(true)
  })

  it('1 / yes / on bhi true hain', () => {
    for (const value of ['1', 'yes', 'on', 'TRUE', ' True ']) {
      expect(loadEnv(baseEnv({ COOKIE_SECURE: value })).COOKIE_SECURE).toBe(true)
    }
  })

  it('0 / no / off / khaali sab false hain', () => {
    for (const value of ['0', 'no', 'off', '', 'False']) {
      expect(loadEnv(baseEnv({ COOKIE_SECURE: value })).COOKIE_SECURE).toBe(false)
    }
  })

  it('set na ho to default false', () => {
    expect(loadEnv(baseEnv()).COOKIE_SECURE).toBe(false)
  })

  it('hamesha boolean lautata hai, string nahi', () => {
    expect(typeof loadEnv(baseEnv({ COOKIE_SECURE: 'true' })).COOKIE_SECURE).toBe('boolean')
  })
})

describe('defaults', () => {
  it('TTL aur port ke defaults spec 003 wale hain', () => {
    const env = loadEnv(baseEnv())

    expect(env.PORT).toBe(4000)
    expect(env.ACCESS_TOKEN_TTL).toBe('15m')
    // Do TTL — "Remember me" ke saath aur uske bina (D-38)
    expect(env.REFRESH_TOKEN_TTL).toBe('24h')
    expect(env.REFRESH_TOKEN_TTL_REMEMBER).toBe('7d')
    expect(env.MAX_UPLOAD_MB).toBe(20)
  })

  it('PORT string se number banta hai', () => {
    expect(loadEnv(baseEnv({ PORT: '4111' })).PORT).toBe(4111)
  })
})

describe('SEED_ADMIN_*', () => {
  it('optional hain — inke bina bhi app boot hota hai', () => {
    expect(loadEnv(baseEnv()).SEED_ADMIN_EMAIL).toBeUndefined()
  })

  it('diye jaayein to email validate hota hai', () => {
    const env = loadEnv(baseEnv({ SEED_ADMIN_EMAIL: 'admin@site.com' }))
    expect(env.SEED_ADMIN_EMAIL).toBe('admin@site.com')
  })
})
