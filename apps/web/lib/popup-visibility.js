/**
 * Popup dobara kab dikhe — ka poora hisaab, **pure functions me** (D-103).
 *
 * ⚠️ Ye JSX me nahi hai aur wo jaan-boojh kar hai. Jo cheez sirf render pe chalti hai uska test
 * likha hi nahi ja sakta — wahi sabak D-92 §10 me liya gaya tha (`wrapTables()` ka table header
 * **do baar** galat bana, dono baar galti live page pe pakdi gayi). Yahan galti ka lakshan usse
 * bhi bura hota: popup kisi ek haalat me dikhna band ho jaata aur **koi error kahin nahi aata**.
 *
 * ## Sab kuch browser me rehta hai — ye majboori hai, chunav nahi
 *
 * Har page ek hi cached HTML deta hai (ISR, D-83), isliye server ko pata ho hi nahi sakta ki kis
 * visitor ne popup dekha. Nateeja jise client ko pata hona chahiye: **history saaf karne pe popup
 * phir dikhega**.
 */

/** Jahan "dekh liya" likha jaata hai. Ek hi jagah, taaki purana record kabhi anaath na ho. */
export const POPUP_SEEN_KEY = 'cms:popup:seen'

/**
 * Is page type pe popup chahiye ya nahi — **server pe** poochha jaata hai.
 *
 * ⚠️ Ye theme ke client component me karna aasan tha, par galat hota: tab popup ka poora data
 * (heading + form ke saare fields) **har page** ke RSC payload me chala jaata, un pages pe bhi
 * jahan wo kabhi dikhta hi nahi. Yahan `null` lautane se un pages pe kuch serialize hi nahi hota.
 *
 * Wahi tark jo D-65 (`toSectionLabels()`) aur D-88 (`sidebarWidgets[]`) pe hai — **resolve server
 * pe, theme me nahi**.
 *
 * @param {object|null} popup `settings.popup` — server pe pehle hi resolve ho chuka
 * @param {string} type `entry.type`
 */
export function popupForType(popup, type) {
  if (!popup || !type) return null
  return popup.showOn?.[type] ? popup : null
}

/**
 * Kis storage me — aur yahi frequency ka asli farak hai.
 *
 * | frequency | storage | kab tak yaad |
 * | --- | --- | --- |
 * | `session` | `sessionStorage` | tab band hone tak |
 * | `once` · `days` | `localStorage` | browser me tab tak jab tak saaf na ho |
 * | `always` | — | kahin nahi, har baar dikhta hai |
 *
 * @param {string} frequency
 * @returns {'session'|'local'|null}
 */
export function popupStoreKind(frequency) {
  if (frequency === 'session') return 'session'
  if (frequency === 'once' || frequency === 'days') return 'local'
  return null
}

/**
 * Popup dikhna chahiye ya nahi.
 *
 * @param {{frequency?: string, frequencyDays?: number}} popup
 * @param {string|null} stored pehle se likha hua timestamp (`Date.now()` ka string), ya `null`
 * @param {number} now
 */
export function isPopupDue(popup, stored, now = Date.now()) {
  const frequency = popup?.frequency ?? 'session'

  /** `always` — kuch yaad rakha hi nahi jaata, isliye stored ka koi matlab nahi. */
  if (frequency === 'always') return true

  /** Kabhi dekha hi nahi. */
  if (!stored) return true

  if (frequency === 'days') {
    const seenAt = Number(stored)

    /**
     * ⚠️ Kachra value pe popup **dikhta hai**, chhupta nahi.
     *
     * `Number('abc')` `NaN` hai aur har `NaN` comparison `false` deta hai — yaani bina is
     * check ke ek kharab record popup ko **hamesha ke liye** band kar deta, aur us bug ka
     * lakshan wahi "kuch na hona" hota jo D-86/D-89 me teen baar pakda gaya.
     */
    if (!Number.isFinite(seenAt)) return true

    const days = popup?.frequencyDays ?? 7
    return now - seenAt >= days * 24 * 60 * 60 * 1000
  }

  /** `session` aur `once` — ek baar dekh liya to bas. Farak sirf storage ka hai. */
  return false
}

/**
 * Browser se "dekh liya" padho. Har galti pe `null` — yaani popup dikh jaayega.
 *
 * ⚠️ `try/catch` zaroori hai: private window me, ya site data block hone pe, `sessionStorage`
 * ko **chhoona hi** throw karta hai. Bina iske poora page phat jaata — ek popup ke liye.
 */
export function readPopupSeen(frequency, win = globalThis) {
  const kind = popupStoreKind(frequency)
  if (!kind) return null

  try {
    const store = kind === 'session' ? win.sessionStorage : win.localStorage
    return store?.getItem(POPUP_SEEN_KEY) ?? null
  } catch {
    return null
  }
}

/** "Dekh liya" likho. Na likh paaye to kuch nahi — popup agli baar phir dikhega, bas. */
export function writePopupSeen(frequency, now = Date.now(), win = globalThis) {
  const kind = popupStoreKind(frequency)
  if (!kind) return

  try {
    const store = kind === 'session' ? win.sessionStorage : win.localStorage
    store?.setItem(POPUP_SEEN_KEY, String(now))
  } catch {
    /* private window / blocked storage — ignore */
  }
}
