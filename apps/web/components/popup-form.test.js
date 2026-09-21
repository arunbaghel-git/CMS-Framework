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
const ruleOf = (selector) => {
  const at = css.indexOf(selector + ' {')

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
