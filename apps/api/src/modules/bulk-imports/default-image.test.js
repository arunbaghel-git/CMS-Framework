import { describe, expect, it } from 'vitest'

import { pickDefaultImage } from './default-image.js'

/** Client, 24 Sep — doc me image na ho to default pool se (package + blog). */
describe('pickDefaultImage', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f']

  it('khaali pool pe kuch nahi', () => {
    expect(pickDefaultImage([], { runId: 'r1', rowIndex: 0 })).toBeNull()
    expect(pickDefaultImage(undefined, { runId: 'r1', rowIndex: 0 })).toBeNull()
  })

  it('hamesha pool ki hi ek id', () => {
    for (let i = 0; i < 20; i++) {
      expect(pool).toContain(pickDefaultImage(pool, { runId: 'r1', rowIndex: i }))
    }
  })

  it('wahi run + wahi row = wahi image (restart / Retry again pe bhi)', () => {
    const first = pickDefaultImage(pool, { runId: 'r1', rowIndex: 7 })
    expect(pickDefaultImage(pool, { runId: 'r1', rowIndex: 7 })).toBe(first)
  })

  it('ghuma ke baant-ta hai — 6 image, 16 row pe har image 2 ya 3 baar', () => {
    const counts = {}
    for (let i = 0; i < 16; i++) {
      const id = pickDefaultImage(pool, { runId: 'r1', rowIndex: i })
      counts[id] = (counts[id] ?? 0) + 1
    }

    expect(Object.keys(counts).sort()).toEqual(pool)
    for (const n of Object.values(counts)) expect([2, 3]).toContain(n)
  })

  it('lagataar rows ko alag image — pool khatam hone tak koi dohraav nahi', () => {
    const first6 = Array.from({ length: 6 }, (_, i) =>
      pickDefaultImage(pool, { runId: 'r1', rowIndex: i }),
    )
    expect(new Set(first6).size).toBe(6)
  })

  it('alag run ka kram alag hota hai', () => {
    const order = (runId) =>
      Array.from({ length: 6 }, (_, i) => pickDefaultImage(pool, { runId, rowIndex: i })).join('')
    const orders = new Set(['r1', 'r2', 'r3', 'r4'].map(order))
    expect(orders.size).toBeGreaterThan(1)
  })

  it('pool me dohraai id aur khaali value gin-ti nahi', () => {
    const picks = new Set(
      Array.from({ length: 4 }, (_, i) =>
        pickDefaultImage(['a', 'a', '', 'b'], { runId: 'r1', rowIndex: i }),
      ),
    )
    expect([...picks].sort()).toEqual(['a', 'b'])
  })
})
