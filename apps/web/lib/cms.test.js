import { afterEach, describe, expect, it, vi } from 'vitest'

import { CACHE_TAG_ALL } from '@cms/shared'

import { getMenu, getSettings, resolvePath } from './cms.js'

/**
 * Topbar ka ⟳ Cache (A-53) sirf `CACHE_TAG_ALL` saaf karta hai. Koi fetch us tag ke bina chala to
 * wo cheez button dabane pe bhi purani rehti — aur wo failure bilkul chup hoti. Isliye har public
 * fetch ka tag yahan pakka kiya jaata hai.
 */
describe('getJson — common cache tag', () => {
  afterEach(() => vi.unstubAllGlobals())

  function stubFetch() {
    const calls = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        calls.push(init?.next?.tags ?? [])
        return { ok: true, json: async () => ({ data: null }) }
      }),
    )
    return calls
  }

  it('har fetch pe apne tag ke saath CACHE_TAG_ALL', async () => {
    const calls = stubFetch()

    await getSettings()
    await getMenu('header')
    await resolvePath('/test')

    expect(calls).toHaveLength(3)
    for (const tags of calls) expect(tags).toContain(CACHE_TAG_ALL)
    expect(calls[0]).toContain('settings')
    expect(calls[1]).toContain('menu:header')
  })
})
