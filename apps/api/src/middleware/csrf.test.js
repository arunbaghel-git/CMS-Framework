import { describe, it, expect } from 'vitest'

import { COOKIE } from '../core/tokens.js'
import { csrfProtection, CSRF_HEADER } from './csrf.js'

function makeReq({ method = 'POST', cookie, header }) {
  return {
    method,
    cookies: cookie ? { [COOKIE.CSRF]: cookie } : {},
    get: (name) => (name.toLowerCase() === CSRF_HEADER ? header : undefined),
  }
}

function run(req) {
  return new Promise((resolve) => csrfProtection(req, {}, (err) => resolve(err)))
}

describe('csrfProtection', () => {
  it('GET pe check nahi karta', async () => {
    const req = makeReq({ method: 'GET', cookie: 'abc', header: undefined })
    expect(await run(req)).toBeUndefined()
  })

  it('HEAD aur OPTIONS pe bhi nahi', async () => {
    expect(await run(makeReq({ method: 'HEAD', cookie: 'abc' }))).toBeUndefined()
    expect(await run(makeReq({ method: 'OPTIONS', cookie: 'abc' }))).toBeUndefined()
  })

  it('cookie aur header match karein to POST chalta hai', async () => {
    const req = makeReq({ cookie: 'token-abc', header: 'token-abc' })
    expect(await run(req)).toBeUndefined()
  })

  it('header missing ho to 400', async () => {
    const err = await run(makeReq({ cookie: 'token-abc' }))
    expect(err.status).toBe(400)
  })

  it('header galat ho to 400', async () => {
    const err = await run(makeReq({ cookie: 'token-abc', header: 'token-xyz' }))
    expect(err.status).toBe(400)
  })

  it('cookie hi na ho to aage jaane deta hai — login POST isi raaste se aata hai', async () => {
    // Session hi nahi hai; aage 401 waise bhi milega. Yahan rokne se login hi na ho paata
    expect(await run(makeReq({ header: 'kuch-bhi' }))).toBeUndefined()
  })
})
