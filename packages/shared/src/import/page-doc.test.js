import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { parsePageDoc } from './page-doc.js'

/**
 * ⚠️ **Ye fixture asli Google Doc ka export hai** — client ki sheet wala doc (`1AtY5YIu…`), jise
 * client ne 14 Sep ko khud bhara: Stat Rail ek-line (`Value: Free`), `On this page: Yes`, aur
 * content me ek image + `Caption:`. Haath se likha HTML yahan bekaar hota (D-81).
 *
 * ⚠️ **Ek hi badlaav kiya gaya:** image ka ~100KB `data:` URI ek 1200×800 solid PNG (4KB) se badla hai — fixture
 * halka rahe. Shakl (`<p><img></p>` + Caption) wahi hai.
 *
 * Dobara lene ke liye: `curl -sL "https://docs.google.com/document/d/<id>/export?format=html"`
 */
const TEMPLATE = readFileSync(
  fileURLToPath(new URL('./__fixtures__/page-template.html', import.meta.url)),
  'utf8',
)

const parsed = parsePageDoc(TEMPLATE)
const text = (key) => parsed.values[key]?.text ?? ''
const statText = (i, key) => parsed.stats[i]?.[key]?.text ?? ''

describe('parsePageDoc — asli template', () => {
  it('har label pehchaan leta hai, koi warning nahi', () => {
    for (const key of [
      'metaTitle',
      'metaDescription',
      'title',
      'slug',
      'parent',
      'subheading',
      'bannerImage',
      'buttonLabel',
      'buttonLink',
      'content',
    ]) {
      expect(parsed.values, `"${key}" ka khaana mila hi nahi`).toHaveProperty(key)
    }

    expect(parsed.warnings).toEqual([])
  })

  it('upar ke saade khaane', () => {
    expect(text('title')).toBe('Bharatpur Beach')
    expect(text('slug')).toBe('bharatpur-beach')
    expect(text('parent')).toBe('Andaman Beaches')
    expect(text('showToc')).toBe('Yes')
    expect(text('buttonLabel')).toBe('Plan a trip here')
    expect(text('buttonLink')).toBe('#enquiry')
  })

  it('On this page wali line Parent page me nahi judti (14 Sep ka bug)', () => {
    // Client ke doc me `On this page: Yes` parent ke theek baad hai. Label na pehchana jaaye to wo
    // pichhle khaane me jud jaati — parent kabhi nahi milta aur page draft rehta
    expect(text('parent')).not.toMatch(/on this page/i)
  })

  it('Button label aur Button link alag khaane hain — ek doosre ko nahi khaate', () => {
    // Dono `button` se shuru hote hain; `byLongestFirst` na ho to chhota label pehle jeet-ta
    expect(text('buttonLabel')).not.toContain('#enquiry')
  })

  it('Stat Rail ke chaar card, har card ke chaaron khaane', () => {
    expect(parsed.stats).toHaveLength(4)

    expect(statText(0, 'value')).toBe('Free')
    expect(statText(0, 'suffix')).toBe('entry')
    // Raw export me `&middot;` hai — asli import me `cleanGoogleHtml()` use decode karta hai
    expect(statText(0, 'label')).toMatch(/^Ticket (·|&middot;) qualifier$/)
    expect(statText(0, 'highlight')).toBe('Yes')

    expect(statText(1, 'value')).toBe('40 min')
    expect(statText(1, 'suffix')).toBe('')
    expect(statText(3, 'label')).toBe('Time needed')
  })

  it('Stat Rail ke labels content me nahi ghuste, aur Content stats me nahi jaata', () => {
    // `Content` ek top label hai — wahi stats se bahar laata hai
    expect(text('content')).toMatch(/^Bharatpur Beach sits on the eastern edge/)
    // "Time needed" content ki table me bhi hai — isliye stat ke apne labels dekhe jaate hain
    expect(text('content')).not.toMatch(/Highlight|qualifier|From the jetty/)
    expect(parsed.stats.some((stat) => stat.content)).toBe(false)
  })

  it('content me heading, table, image aur Note/Caption ki lines bachti hain', () => {
    const html = parsed.values.content.html

    // Doc me ek khaali Heading 2 bhi hai (table ke baad) — khaali block chhoot jaata hai
    expect((html.match(/<h2\b/g) ?? []).length).toBe(6)
    expect(html).toContain('<table')
    expect(html).toMatch(/<img\b/)
    expect(text('content')).toContain('Note: One afternoon on Neil?')
    expect(text('content')).toContain('Note: Please do not stand on the coral.')
    expect(text('content')).toContain('Caption: The coral shelf sits close to the surface')
  })

  it('FAQ — heading aur teen sawaal-jawab', () => {
    expect(parsed.faqHeading).toBe('Frequently asked questions')
    expect(parsed.faqs).toHaveLength(3)
    expect(parsed.faqs[0].question.text).toBe('Is Bharatpur Beach good for swimming?')
    expect(parsed.faqs[2].answer.text).toMatch(/^Two to three hours/)
  })
})

describe('parsePageDoc — optional aur galat shakl', () => {
  const p = (line) => `<p>${line}</p>`
  const doc = (...lines) => `<html><body>${lines.map(p).join('')}</body></html>`

  it('Stat Rail na ho to stats khaali — rail optional hai (client, 14 Sep)', () => {
    const out = parsePageDoc(doc('Page title', 'About', 'Content', 'Hello'))

    expect(out.stats).toEqual([])
    expect(out.warnings).toEqual([])
  })

  it('Value se pehle aaya khaana chhoot-ta hai, warning ke saath', () => {
    const out = parsePageDoc(doc('Stat Rail', 'Label', 'Orphan', 'Value', '40 min', 'Content', 'x'))

    expect(out.stats).toHaveLength(1)
    expect(out.stats[0].value.text).toBe('40 min')
    expect(out.warnings[0]).toMatch(/before any "Value"/)
  })

  it('ek bhi label na mile to saaf warning', () => {
    expect(parsePageDoc(doc('Just some text')).warnings[0]).toMatch(/No known labels/)
  })
})
