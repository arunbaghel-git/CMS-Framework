import { describe, expect, it } from 'vitest'

import { listParamsKey } from './use-entries.js'

/**
 * `useEntryList` ka infinite-loop wala bug — 8 Sep.
 *
 * ## Kya hua tha
 *
 * `useEntryList` ki effect dep `[type, query]` thi, yaani **object ki identity**. `PageEdit` ne
 * use aise bulaya tha:
 *
 * ```js
 * useEntryList('page', { limit: 200, status: 'published' })
 * ```
 *
 * Wo object har render pe naya banta hai. Nateeja ek loop tha: nayi identity → naya `load` →
 * `useEffect` chali → `setState` → dobara render → phir naya object. Page/Tour ka edit screen
 * kholte hi `/api/entries` par requests ki jhadi lag jaati thi.
 *
 * ## Lakshan galat jagah dikhta tha
 *
 * Client ko admin me _"Bahut zyada requests. Thodi der baad."_ dikha — yaani **rate limiter**
 * ka message (`app.js`, dev me 1000 req/min). Wahan se dekhne pe lagta hai ki limiter tang kar
 * raha hai; asli galti ek hook ki dep me thi. Yahi wajah hai ki ye test likha gaya: bug chup
 * tha aur uska pata doosri jagah se chala.
 *
 * ⚠️ Admin ke liye koi React test setup nahi hai (na jsdom, na testing-library), isliye hook
 * khud test nahi hota. Par jo hissa **toota tha** wo pure hai — dep ka key — aur wahi yahan pin
 * hai.
 */
describe('listParamsKey — useEntryList ki effect dep', () => {
  it('do alag object jinka content ek hai, unka key bhi ek hai', () => {
    // Yahi wo case hai jo loop banata tha: har render pe naya object, wahi content
    const a = listParamsKey('page', { limit: 200, status: 'published' })
    const b = listParamsKey('page', { limit: 200, status: 'published' })

    expect(a).toBe(b)
  })

  it('content badle to key bhi badalta hai — warna list kabhi refresh hi na ho', () => {
    // Ulta khatra bhi asli hai: key zyada "stable" ho jaaye to page badalne pe fetch hi na ho
    expect(listParamsKey('page', { page: 1 })).not.toBe(listParamsKey('page', { page: 2 }))
    expect(listParamsKey('page', {})).not.toBe(listParamsKey('tourPage', {}))
  })

  it('bina query ke bhi chalta hai', () => {
    expect(listParamsKey('page')).toBe(listParamsKey('page', undefined))
  })
})
