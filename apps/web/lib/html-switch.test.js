import { describe, expect, it } from 'vitest'

import { switchKey } from './html-switch.js'

/**
 * Custom editor ke tabs ki key — `i-<key>` class se (D-96 §29).
 *
 * ⚠️ Reference `data-i="havelock"` use karta hai, par sanitizer `data-*` girata hai. Isliye key `class` se
 * aati hai — aur yahi wo ek jagah hai jahan wo galat pakdi ja sakti thi (`ipill`, `imap__c`, `is-on` sab
 * paas se guzarte hain).
 */
describe('switchKey — kaunsa island (D-96 §29)', () => {
  it('sirf `i-<key>` wali class uthata hai', () => {
    expect(switchKey(['ipill', 'sw-tab', 'i-havelock'])).toBe('havelock')
    expect(switchKey(['hot', 'sw-tab', 'i-port-blair', 'is-on'])).toBe('port-blair')
  })

  it('doosri classes se dhokha nahi khaata', () => {
    expect(switchKey(['ipill', 'sw-tab'])).toBe('')
    expect(switchKey(['is-on', 'icount', 'imap__c'])).toBe('')
    expect(switchKey(['i-'])).toBe('')
    expect(switchKey([])).toBe('')
    expect(switchKey()).toBe('')
  })

  it('bade akshar chhote ban jaate hain — CSS aur JS ek hi key dekhein', () => {
    expect(switchKey(['I-Havelock'])).toBe('havelock')
  })
})
