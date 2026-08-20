import { describe, it, expect, vi } from 'vitest'

import { requireAuth, requireAnyPermission, requirePermission } from './auth.js'

/** Middleware ko call karke `next()` ko jo mila wahi lautata hai. */
function run(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (err) => resolve(err))
  })
}

describe('requireAuth', () => {
  it('user na ho to 401', async () => {
    const err = await run(requireAuth, {})
    expect(err.status).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('user ho to aage jaane deta hai', async () => {
    expect(await run(requireAuth, { user: { _id: '1' } })).toBeUndefined()
  })
})

describe('requirePermission', () => {
  const guard = requirePermission('entry.publish')

  it('login na ho to 401 deta hai, 403 nahi', async () => {
    // Farq maayne rakhta hai: 401 = "login karo", 403 = "tumhe nahi milega"
    const err = await run(guard, {})
    expect(err.status).toBe(401)
  })

  it('permission na ho to 403', async () => {
    const err = await run(guard, { user: { _id: '1' }, permissions: ['entry.read'] })
    expect(err.status).toBe(403)
    expect(err.message).toContain('entry.publish')
  })

  it('permission ho to aage jaane deta hai', async () => {
    const req = { user: { _id: '1' }, permissions: ['entry.read', 'entry.publish'] }
    expect(await run(guard, req)).toBeUndefined()
  })

  it('permissions list hi na ho to 403', async () => {
    const err = await run(guard, { user: { _id: '1' } })
    expect(err.status).toBe(403)
  })

  it('role string dekh kar decide NAHI karta', async () => {
    // admin role hone ke baawajood permission list khaali hai to 403 hi milega —
    // source of truth roles collection hai, role ka naam nahi (spec 001)
    const err = await run(guard, { user: { _id: '1', role: 'admin' }, permissions: [] })
    expect(err.status).toBe(403)
  })
})

describe('requireAnyPermission', () => {
  const guard = requireAnyPermission('entry.update', 'entry.update.own')

  it('koi ek bhi ho to chalta hai', async () => {
    const req = { user: { _id: '1' }, permissions: ['entry.update.own'] }
    expect(await run(guard, req)).toBeUndefined()
  })

  it('ek bhi na ho to 403', async () => {
    const err = await run(guard, { user: { _id: '1' }, permissions: ['entry.read'] })
    expect(err.status).toBe(403)
  })
})

describe('permission guard side effects', () => {
  it('response ko chhoota nahi — sirf next() call karta hai', async () => {
    const res = { json: vi.fn(), status: vi.fn() }
    await new Promise((resolve) => requirePermission('entry.read')({}, res, resolve))

    expect(res.json).not.toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})
