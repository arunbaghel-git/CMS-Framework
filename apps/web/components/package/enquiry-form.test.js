import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `EnquiryForm` ke do guard (client, 23 Sep, D-115) — JSX + CSS padh kar, `popup-form.test.js` jaisa.
 */
const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\s*\}/g, '')
const read = (path) => strip(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'))

const form = read('./EnquiryForm.jsx')
const css = read('../../app/globals.css')

describe('Form ka heading <h3> nahi (client: "disturbing html structure in home form")', () => {
  it('teeno variant ka heading .fhead <p> hai — koi <h3> nahi', () => {
    expect(form).not.toMatch(/<h[1-6][\s>]/)
    expect(form.match(/<p className="fhead/g)?.length).toBe(3)
  })

  /** Look h3 jaisa hi — wahi Fonts ke H3 tokens, taaki admin ka H3 badalna isko bhi badle. */
  it('.fhead h3 ke tokens se chalta hai', () => {
    const at = css.indexOf('\n.fhead {')
    expect(at).toBeGreaterThan(-1)
    const rule = css.slice(at, css.indexOf('}', at))
    for (const token of ['--font-heading', '--h3-c', '--h3-w', '--h3-lh', '--h3-ls']) {
      expect(rule).toContain(token)
    }
  })

  it('purane h3 selector .fhead pe aa gaye', () => {
    expect(css).not.toMatch(/\.wdg--cta h3|\.hf-card__head h3|\.wdg--cta\.is-open > h3/)
    expect(css).toContain('.wdg--cta .fhead {')
    expect(css).toContain('.hf-card__head .fhead {')
  })
})

describe('Date ka khaana phone pe khaali na dikhe (client, 23 Sep)', () => {
  it('khaali date pe placeholder ka span — admin ka, warna "Select date"', () => {
    expect(form).toContain('className="fld__ph" aria-hidden="true"')
    expect(form).toContain("field.placeholder || 'Select date'")
  })

  it('date pe poora box click karne laayak (R19)', () => {
    const at = form.indexOf('function DateInput')
    expect(form.slice(at, form.indexOf('\n}', at))).toContain('onClick={openPicker}')
  })

  /** Desktop pe browser ka apna `dd-mm-yyyy` hai — span sirf touch pe, warna dono chhapte. */
  it('span sirf touch pe dikhta hai', () => {
    expect(css).toMatch(/\n\.fld__ph \{\s*display: none;/)
    expect(css).toMatch(/@media \(hover: none\) \{\s*\.fld__ph \{\s*display: block;/)
  })
})
