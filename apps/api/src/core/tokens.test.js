import { describe, it, expect } from 'vitest'

import {
  ACCESS_TTL_MS,
  COOKIE,
  newCsrfToken,
  newFamilyId,
  safeEqual,
  signAccessToken,
  signRefreshToken,
  ttlToMs,
  verifyAccessToken,
  verifyRefreshToken,
} from './tokens.js'

describe('ttlToMs', () => {
  it('s/m/h/d suffix samajhta hai', () => {
    expect(ttlToMs('30s')).toBe(30_000)
    expect(ttlToMs('15m')).toBe(900_000)
    expect(ttlToMs('2h')).toBe(7_200_000)
    expect(ttlToMs('7d')).toBe(604_800_000)
  })

  it('bina suffix ke seconds maanta hai', () => {
    expect(ttlToMs('900')).toBe(900_000)
  })

  it('bakwaas value pe throw karta hai', () => {
    expect(() => ttlToMs('kal-tak')).toThrow()
  })

  it('default access TTL 15 min hai', () => {
    expect(ACCESS_TTL_MS).toBe(900_000)
  })
})

describe('access token', () => {
  it('sign aur verify round-trip karta hai', () => {
    const token = signAccessToken({ id: 'user-1', role: 'admin' })
    const payload = verifyAccessToken(token)

    expect(payload.sub).toBe('user-1')
    expect(payload.role).toBe('admin')
  })

  it('galat token pe throw nahi, null deta hai', () => {
    expect(verifyAccessToken('bilkul-bekaar-token')).toBeNull()
    expect(verifyAccessToken(undefined)).toBeNull()
  })

  it('refresh token ko access token maan ke accept NAHI karta', () => {
    // Alag secret + `typ` claim — dono is confusion ko rokte hain
    const { token } = signRefreshToken({ id: 'user-1', familyId: 'fam-1' })
    expect(verifyAccessToken(token)).toBeNull()
  })
})

describe('refresh token', () => {
  it('jti aur familyId le kar aata hai', () => {
    const familyId = newFamilyId()
    const signed = signRefreshToken({ id: 'user-1', familyId })

    expect(signed.familyId).toBe(familyId)
    expect(signed.jti).toBeTruthy()
    expect(signed.expiresAt.getTime()).toBeGreaterThan(Date.now())

    const payload = verifyRefreshToken(signed.token)
    expect(payload.jti).toBe(signed.jti)
    expect(payload.familyId).toBe(familyId)
  })

  it('har baar naya jti deta hai — rotation isi pe chalti hai', () => {
    const a = signRefreshToken({ id: 'u', familyId: 'f' })
    const b = signRefreshToken({ id: 'u', familyId: 'f' })
    expect(a.jti).not.toBe(b.jti)
  })

  it('access token ko refresh maan ke accept NAHI karta', () => {
    const token = signAccessToken({ id: 'user-1', role: 'admin' })
    expect(verifyRefreshToken(token)).toBeNull()
  })
})

describe('safeEqual', () => {
  it('same string pe true', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true)
  })

  it('alag string pe false', () => {
    expect(safeEqual('abc123', 'abc124')).toBe(false)
  })

  it('alag lambai pe throw nahi karta', () => {
    expect(safeEqual('abc', 'abcdef')).toBe(false)
  })

  it('non-string pe false', () => {
    expect(safeEqual(undefined, 'abc')).toBe(false)
    expect(safeEqual(null, null)).toBe(false)
  })
})

describe('csrf token', () => {
  it('har baar alag hota hai', () => {
    expect(newCsrfToken()).not.toBe(newCsrfToken())
  })

  it('64 hex characters ka hai (32 bytes)', () => {
    expect(newCsrfToken()).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('cookie names', () => {
  it('dev me __Host- prefix nahi lagta', () => {
    // __Host- ko Secure chahiye — plain HTTP dev me wo cookie set hi nahi hoti
    expect(COOKIE.ACCESS).toBe('cms_at')
    expect(COOKIE.REFRESH).toBe('cms_rt')
    expect(COOKIE.CSRF).toBe('cms_csrf')
  })
})
