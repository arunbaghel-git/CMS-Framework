import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `PopupForm` ke layout ke guard — CSS me, JSX me nahi.
 *
 * Wahi tark jo `floating-contact.test.js` ke sar pe likha hai: is component ka sabse aasan
 * tootan **CSS me** hai. Aur is baar wo tootan client ne **live dekh kar** pakda (21 Sep) —
 * do scrollbar, aur close button image ke upar. Teenon guard wahin se aaye hain.
 */

/**
 * ⚠️ **Comments hata kar padhte hain, aur wo zaroori hai.**
 *
 * Is repo ke comments me wo **purani** value likhi hoti hai jo hatayi gayi thi — `aspect-ratio`
 * ka zikr `.pmod__pic` ke apne comment me hai, aur `.pmod__box` ka zikr JSX ke comment me.
 * Bina safai ke test un comments ko hi code samajh leta hai; ye test likhte waqt dono baar
 * theek yahi hua.
 */
const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')

const read = (path) => strip(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'))

const css = read('../app/globals.css')
const jsx = read('./PopupForm.jsx')

/**
 * `.selector {` se uske band hone tak ka rule.
 *
 * ⚠️ Regex nahi — selector me `.` hota hai aur use har baar escape karna ek aisi galti hai jo
 * chup-chaap "rule mila hi nahi" bankar aati hai. Seedha string dhoondhna yahan kaafi hai.
 */
/**
 * ⚠️ **Line ke shuru pe anchor (`\n`) — aur wo ek asli bug se aaya hai (22 Sep).**
 *
 * Bina anchor ke `indexOf('.bkg--page form {')` ne **`.pmod__body .bkg--page form {`** ko match kar
 * liya, kyunki wo string uske andar poori maujood hai — aur wo scoped override file me pehle aata
 * hai. Nateeja: test base rule padh hi nahi raha tha aur galat cheez pe fail hua.
 *
 * Yahi wo "rule mila hi nahi" wali chup galti hai jiski chetavni upar pehle se likhi hai; ab wo
 * descendant selectors pe bhi nahi lagegi.
 */
const ruleOf = (selector) => {
  const at = css.indexOf('\n' + selector + ' {')

  expect(at, selector + ' CSS me hai hi nahi').toBeGreaterThan(-1)

  return css.slice(at, css.indexOf('}', at))
}

describe('Enquiry popup ka layout (D-103, client ne 21 Sep ko theek karwaya)', () => {
  /**
   * ⚠️ **Do scrollbar ka ilaaj.** Pehle `.pmod` (parda) aur `.pmod__box` dono scroll karte the.
   * Scroll sirf dabbe pe rehna chahiye — parda poori screen jitna hi hai, use scroll ki zaroorat
   * hai hi nahi.
   */
  it('parda khud scroll nahi karta — scroll sirf dabbe pe hai', () => {
    expect(ruleOf('.pmod')).not.toContain('overflow-y: auto')
    expect(ruleOf('.pmod__box')).toContain('overflow-y: auto')
  })

  /**
   * ⚠️ **Scroll aakhri sahara hai, roz ka raasta nahi.** Wo tab bhi chahiye (chhoti screen pe
   * Submit tak pahunchna), par aam screen pe aana hi nahi chahiye — isliye image ki ooonchai
   * **viewport** se bandhi hai, dabbe ki chaudai se nahi.
   *
   * Pehle yahan `aspect-ratio: 4/3` tha: 840px chauda dabba = **630px oonchi** image, aur uske
   * neeche poora form.
   */
  it('image ki ooonchai viewport se bandhi hai, aspect-ratio se nahi', () => {
    const rule = ruleOf('.pmod__pic')

    expect(rule).not.toContain('aspect-ratio')
    expect(rule).toMatch(/height:\s*clamp\([^)]*vh/)
    /** Teen alag naap ki image ek hi patti me — iske bina patti ooncha-neecha ho jaati hai. */
    expect(rule).toContain('object-fit: cover')
  })

  /**
   * ⚠️ **Close button dabbe ke BAHAR hai** — client ne yahi pakda: _"close icon ko popup ke side
   * me rakho, not on image"_.
   *
   * Do cheezein saath chahiye: shell (jo scroll ya clip na kare) aur button ka rinatmak `top`.
   * Button wapas `.pmod__box` ke andar chala gaya to wo image pe chhapega **aur** dabbe ke saath
   * scroll hoga — dono baar ye test girega.
   */
  it('close button dabbe ke bahar baithta hai, shell ke sahare', () => {
    expect(jsx).toContain('pmod__shell')
    /** Button shell ka seedha bachcha hai, box ka nahi — kram JSX me isi tarah hona chahiye. */
    expect(jsx.indexOf('pmod__x')).toBeLessThan(jsx.indexOf('pmod__box'))

    const shell = ruleOf('.pmod__shell')
    expect(shell).toContain('position: relative')
    /** Shell ne clip ya scroll kiya to button kat jaayega — wahi jaal jo `.pmod__box` me hai. */
    expect(shell).not.toContain('overflow')

    expect(ruleOf('.pmod__x')).toMatch(/top:\s*-\d+px/)
  })

  /**
   * ⚠️ Button ke liye upar jagah **parde ki padding** se aati hai. Wo hat gayi to button chhoti
   * screen pe screen ke bahar chala jaata hai — aur tab popup band karne ka koi raasta nahi
   * bachta (Esc ke alawa).
   */
  it('parde me button ke liye upar jagah chhodi gayi hai', () => {
    const pad = ruleOf('.pmod').match(/padding:\s*(\d+)px/)

    expect(pad, '.pmod pe padding likhi hi nahi hai').not.toBeNull()
    expect(Number(pad[1])).toBeGreaterThanOrEqual(44)
  })
})

describe('Popup ka close button aur andar ka card (D-103 §9, client ne 22 Sep ko pakda)', () => {
  /**
   * ⚠️ **Close button ka background THOS hona chahiye, transparent nahi.**
   *
   * `.vmod__x` (video popup) pe `color-mix(… var(--on-dark) 16%, transparent)` chalta hai, kyunki
   * wahan parde ke peeche poora video/kaala hota hai. `.pmod__x` **site ke header ke upar** baithta
   * hai — wahan 16% safed lagbhag gayab tha, aur client ne wahi bheja:
   * _"close button does not look good, give it a background"_.
   *
   * Ye guard isliye hai ki agli baar koi `.vmod__x` se copy kar ke wapas transparent na laga de.
   */
  it('close button ka background thos hai — transparent color-mix nahi', () => {
    const rule = ruleOf('.pmod__x')

    expect(rule).toContain('background: var(--surface)')
    expect(rule).not.toContain('transparent')
  })

  /**
   * ⚠️ **`line-height` yahan nahi honi chahiye.** Is rule me `font-size: var(--fs-small)` hai, aur
   * `theme-fonts` ka niyam kehta hai ki aise rule me `line-height` us level ke variable ke peeche
   * ho. Button ko uski zaroorat hai hi nahi — `place-items: center` ✕ ko beech me rakhta hai.
   *
   * D-103 me `line-height: 1` galti se likha gaya tha aur `theme-fonts.test.js` use pakad rahi thi.
   */
  it('close button pe line-height nahi hai — theme-fonts ka niyam', () => {
    expect(ruleOf('.pmod__x')).not.toContain('line-height')
  })

  /**
   * ⚠️ **Popup ke andar form ka apna card nahi banta — aur yahi scroller ki badi wajah thi.**
   *
   * Form `variant="page"` pe chalta hai, aur `.bkg--page form` apna border + shadow +
   * `clamp(18px, 2.4vw, 26px)` padding lagata hai. Contact page pe wo sahi hai; popup **khud ek
   * safed card hai**, to wahan wo dabbe ke andar dabba banata tha aur padding do baar lagti thi.
   *
   * ⚠️ Override `.pmod__body` ke **andar** scoped hona chahiye — bina scope ke contact page ka
   * card bhi chala jaata.
   */
  it('popup ke andar form ka card hata hai, par contact page ka bacha hai', () => {
    const inside = ruleOf('.pmod__body .bkg--page form')

    expect(inside).toContain('padding: 0')
    expect(inside).toContain('border: 0')
    expect(inside).toContain('box-shadow: none')

    /** Base rule zinda rehna chahiye — wo contact page ka card hai */
    const base = ruleOf('.bkg--page form')
    expect(base).toContain('border: 1px solid var(--line)')
  })
})

describe('Phone pe popup — poori image-patti nahi (client, 22 Sep)', () => {
  /** `@media (max-width: 760px) { … }` ka wo block jisme popup ke rules hain. */
  const phoneBlock = (() => {
    const re = /@media \(max-width: 760px\)/g
    for (let m; (m = re.exec(css)); ) {
      let depth = 0
      for (let i = css.indexOf('{', m.index); i < css.length; i++) {
        if (css[i] === '{') depth++
        else if (css[i] === '}' && --depth === 0) {
          const block = css.slice(m.index, i + 1)
          if (block.includes('.pmod__')) return block
          break
        }
      }
    }
    return ''
  })()

  /**
   * ⚠️ Client ne do kadam me kaha: pehle _"phone par popup se image hata do jisse poora popup thik
   * se dikhe, scroll na ho"_, phir _"image ke sath wala text bhi hatega"_. Patti
   * `clamp(130px, 20vh, 220px)` leti thi — phone pe wo jagah form ki zyada zaroori hai.
   */
  it('phone pe poori image-patti chhup jaati hai', () => {
    expect(phoneBlock, 'popup ka phone block mila hi nahi').not.toBe('')
    expect(phoneBlock).toMatch(/\.pmod__pics\s*\{\s*display:\s*none/)
  })

  /**
   * ⚠️ **Ye test isliye hai ki koi ise "bug" samajh kar palat na de.**
   *
   * `.pmod__h` (image ke upar wala heading) client ka likha content hai, aur use chhupana aam taur
   * pe theek wahi galti hoti jo D-86 / D-89 / D-102 me pakdi gayi thi — "koi error nahi, bas kuch
   * na hona". 22 Sep ko pehle wo bachaya bhi gaya tha (sirf image chhupti thi).
   *
   * Par client ne **saaf kaha** ki wo bhi hate. Isliye yahan wo chhupna **chaha hua** hai —
   * `.pmod__pics` ke andar hone ki wajah se wo patti ke saath hi jaata hai.
   *
   * **Ise badalne se pehle client se poochho.**
   */
  it('image ka heading bhi jaata hai — aur ye chaha hua hai, bug nahi', () => {
    /** Alag se bachane wala koi rule nahi hona chahiye */
    expect(phoneBlock).not.toMatch(/\.pmod__h\s*\{/)
  })

  /**
   * ⚠️ **Bina image wale popup ka heading (`--plain`) bachta hai, aur wo sahi hai.**
   *
   * Wo `.pmod__pics` ke **bahar** hai. Client ne "image ke saath wala text" hatane ko kaha tha —
   * jahan image hai hi nahi, wahan wo popup ka ekmatra title hai. Use bhi chhupa dene ka matlab
   * hota phone pe ek bina naam ka form.
   */
  it('bina image wale popup ka heading phone pe bhi rehta hai', () => {
    expect(phoneBlock).not.toContain('.pmod__h--plain')
  })

  /**
   * ⚠️ Image `display: none` ho par `eager` rahe to browser use **phir bhi** utarta hai — yaani
   * theek phone pe bandwidth jaati. `lazy` par wo viewport me aati hi nahi, isliye utarti bhi nahi.
   */
  it('image lazy hai — chhupi hui image download nahi honi chahiye', () => {
    const tag = jsx.slice(jsx.indexOf('className="pmod__pic"'))
    expect(tag.slice(0, tag.indexOf('/>'))).not.toContain('eager')
  })
})
