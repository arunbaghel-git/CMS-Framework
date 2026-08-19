import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'

describe('GET /api/health', () => {
  it('status aur uptime deta hai', async () => {
    const res = await request(createApp()).get('/api/health')

    expect([200, 503]).toContain(res.status)
    expect(res.body).toHaveProperty('status')
    expect(res.body).toHaveProperty('db')
    expect(typeof res.body.uptime).toBe('number')
  })
})

describe('unknown route', () => {
  it('404 error envelope deta hai', async () => {
    const res = await request(createApp()).get('/api/aisa-koi-route-nahi')

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})
