import { describe, expect, it } from 'vitest'

import {
  POPUP_SEEN_KEY,
  isPopupDue,
  popupForType,
  popupStoreKind,
  readPopupSeen,
  writePopupSeen,
} from './popup-visibility.js'

const DAY = 24 * 60 * 60 * 1000

/** Ek naqli storage — jitna `popup-visibility.js` chhoota hai utna hi. */
function fakeWin({ throws = false } = {}) {
  const make = () => {
    const map = new Map()
    return {
      getItem: (k) => {
        if (throws) throw new Error('blocked')
        return map.has(k) ? map.get(k) : null
      },
      setItem: (k, v) => {
        if (throws) throw new Error('blocked')
        map.set(k, v)
      },
    }
  }
  return { sessionStorage: make(), localStorage: make() }
}

describe('popupStoreKind — kaunsa storage', () => {
  it('session tab tak, once/days hamesha, always kahin nahi', () => {
    expect(popupStoreKind('session')).toBe('session')
    expect(popupStoreKind('once')).toBe('local')
    expect(popupStoreKind('days')).toBe('local')
    expect(popupStoreKind('always')).toBe(null)
  })
})

describe('isPopupDue', () => {
  it('kabhi dekha hi nahi — hamesha dikhta hai', () => {
    for (const frequency of ['session', 'once', 'days', 'always']) {
      expect(isPopupDue({ frequency }, null)).toBe(true)
    }
  })

  it('always — dekha hua ho tab bhi dikhta hai', () => {
    expect(isPopupDue({ frequency: 'always' }, String(Date.now()))).toBe(true)
  })

  it('session aur once — ek baar dekh liya to phir nahi', () => {
    expect(isPopupDue({ frequency: 'session' }, '1')).toBe(false)
    expect(isPopupDue({ frequency: 'once' }, '1')).toBe(false)
  })

  it('days — N din poore hone par hi', () => {
    const now = 100 * DAY
    const popup = { frequency: 'days', frequencyDays: 7 }

    expect(isPopupDue(popup, String(now - 6 * DAY), now)).toBe(false)
    expect(isPopupDue(popup, String(now - 7 * DAY), now)).toBe(true)
    expect(isPopupDue(popup, String(now - 30 * DAY), now)).toBe(true)
  })

  it('days ka default 7 hai', () => {
    const now = 100 * DAY
    expect(isPopupDue({ frequency: 'days' }, String(now - 6 * DAY), now)).toBe(false)
    expect(isPopupDue({ frequency: 'days' }, String(now - 8 * DAY), now)).toBe(true)
  })

  it('kachra record pe popup DIKHTA hai, chhupta nahi', () => {
    /**
     * ⚠️ Ye is file ka sabse zaroori test hai. `Number('abc')` `NaN` hai aur har `NaN`
     * comparison `false` deta hai — yaani bina guard ke ek kharab record popup ko **hamesha
     * ke liye** band kar deta, aur uska lakshan wahi "kuch na hona" hota jo is repo me teen
     * baar pakda gaya (D-86, D-89, D-102).
     */
    expect(isPopupDue({ frequency: 'days' }, 'abc')).toBe(true)
    expect(isPopupDue({ frequency: 'days' }, '')).toBe(true)
  })

  it('frequency bheji hi na ho to session jaisa chalta hai', () => {
    expect(isPopupDue({}, null)).toBe(true)
    expect(isPopupDue({}, '1')).toBe(false)
  })
})

describe('readPopupSeen / writePopupSeen', () => {
  it('session aur local alag-alag jagah likhte hain', () => {
    const win = fakeWin()

    writePopupSeen('session', 111, win)
    expect(win.sessionStorage.getItem(POPUP_SEEN_KEY)).toBe('111')
    expect(win.localStorage.getItem(POPUP_SEEN_KEY)).toBe(null)

    writePopupSeen('once', 222, win)
    expect(win.localStorage.getItem(POPUP_SEEN_KEY)).toBe('222')

    expect(readPopupSeen('session', win)).toBe('111')
    expect(readPopupSeen('once', win)).toBe('222')
  })

  it('always kahin likhta bhi nahi, padhta bhi nahi', () => {
    const win = fakeWin()
    writePopupSeen('always', 111, win)
    expect(win.sessionStorage.getItem(POPUP_SEEN_KEY)).toBe(null)
    expect(win.localStorage.getItem(POPUP_SEEN_KEY)).toBe(null)
    expect(readPopupSeen('always', win)).toBe(null)
  })

  it('storage band ho (private window) to phat-ta nahi — popup dikh jaata hai', () => {
    /**
     * ⚠️ Private window me `sessionStorage` ko **chhoona hi** throw karta hai. Bina `try/catch`
     * ke poora page phat jaata — ek popup ke liye.
     */
    const win = fakeWin({ throws: true })
    expect(() => writePopupSeen('session', 1, win)).not.toThrow()
    expect(readPopupSeen('session', win)).toBe(null)
    expect(isPopupDue({ frequency: 'session' }, readPopupSeen('session', win))).toBe(true)
  })
})

describe('popupForType — kis page pe', () => {
  const popup = { heading: 'Special Offers', showOn: { homePage: true, package: false } }

  it('ticked type pe poora popup, baaki pe null', () => {
    expect(popupForType(popup, 'homePage')).toBe(popup)
    expect(popupForType(popup, 'package')).toBe(null)
  })

  it('anjaan type pe null — naya page type apne aap popup nahi le leta', () => {
    /**
     * ⚠️ Naya page type banega to `POPUP_PAGE_TYPES` me jodna padega. Tab tak uspe popup **nahi**
     * aayega — aur ye theek hai: chup-chaap aa jaana usse bura hota.
     */
    expect(popupForType(popup, 'nosuchtype')).toBe(null)
  })

  it('popup hi na ho, ya type hi na ho — null', () => {
    expect(popupForType(null, 'homePage')).toBe(null)
    expect(popupForType(popup, undefined)).toBe(null)
    expect(popupForType({ showOn: {} }, 'homePage')).toBe(null)
  })
})
