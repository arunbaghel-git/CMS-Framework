import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { parsePostDoc } from './post-doc.js'

/**
 * ⚠️ **Ye fixture asli hai — client ke Google Doc ka apna export.**
 *
 * Haath se likha hua HTML yahan bekaar hota, aur wo galti is kaam me **ek baar ho bhi chuki**:
 * apna likha demo "chal gaya" tha aur usne bold ke baare me galat jawab diya, kyunki usme
 * Google ke `<span class="c2">` the hi nahi. Yahi baat D-81 me pehle se likhi hai.
 *
 * Isi fixture ne teen cheezein pakdi jo maan li gayi thin: `&mdash;` ka decode na hona,
 * table ka ek block na hona, aur FAQ ka `Heading` gir jaana.
 *
 * Dobara lene ke liye: `curl -sL "https://docs.google.com/document/d/<id>/export?format=html"`
 */
const TEMPLATE = readFileSync(
  fileURLToPath(new URL('./__fixtures__/post-template.html', import.meta.url)),
  'utf8',
)

const parsed = parsePostDoc(TEMPLATE)
const text = (key) => parsed.values[key]?.text ?? ''

describe('parsePostDoc — asli template', () => {
  it('har label pehchaan leta hai', () => {
    for (const key of [
      'metaTitle',
      'metaDescription',
      'title',
      'slug',
      'heading',
      'excerpt',
      'category',
      'bannerImage',
      'content',
    ]) {
      expect(parsed.values, `"${key}" ka khaana mila hi nahi`).toHaveProperty(key)
    }

    expect(parsed.warnings).toEqual([])
  })

  it('title aur heading do alag khaane hain — D-90 ka batwara', () => {
    /**
     * Client: _"blog ki heading aur slug alag rahenge jisse breadcrumb bhi thik ho jayega"_.
     * Dono ek hi nikalne ka matlab hota ki breadcrumb me poori lambi headline chali jaati.
     */
    expect(text('title')).toBe('Andaman ferry booking')
    expect(text('heading')).toBe('Andaman ferry booking: everything you need before you sail')
  })

  it('Blog URL slug ban jaata hai', () => {
    expect(text('slug')).toBe('andaman-ferry-booking')
  })

  /**
   * Client, 23 Sep (D-116): blog ka label **`Featured Image`** hai (`Banner Image URL` nahi), aur usme
   * **bahar ka** URL — importer use download karke Media me daalta hai (API ka test ye jaanchta hai).
   */
  it('Featured Image label ka URL bannerImage me aata hai', () => {
    expect(text('bannerImage')).toBe('https://images.example.com/andaman/havelock-ferry.jpg')
  })

  it('Published Date padhi jaati hai', () => {
    expect(text('publishedDate')).toBe('9 Sept 2026')
  })

  /** Purane doc bina badle chalte rahein — label hata dene pe wo line Content me chipak jaati. */
  it('purana Banner Image URL label bhi chalta hai', () => {
    const old = parsePostDoc(
      '<p>Blog title</p><p>X</p><p>Banner Image URL</p><p>https://a.com/b.png</p>',
    )
    expect(old.values.bannerImage.text).toBe('https://a.com/b.png')
  })
})

/**
 * **Headings se FAQ** (client, 23 Sep, D-116): _"h2 heading aur h3 question, h3 ke baad answer, if
 * again h3 then question"_. Markup Google ke export jaisi hai — heading ke andar `<span class>`.
 */
describe('FAQ — h2 heading, h3 sawaal', () => {
  const h = (level, text) => `<h${level} class="c9"><span class="c2">${text}</span></h${level}>`
  const para = (text) => `<p class="c1"><span class="c2">${text}</span></p>`

  const docWith = (faq, after = '') =>
    parsePostDoc(
      para('Blog title') +
        para('Ferries') +
        para('Content') +
        para('Intro paragraph.') +
        faq +
        after,
    )

  it('h2 marker ke neeche har h3 ek sawaal, uske neeche ka sab jawab', () => {
    const parsed = docWith(
      h(2, 'Frequently Asked Questions') +
        h(3, 'Can I book on arrival?') +
        para('Only the government ferry.') +
        para('And only if seats are left.') +
        h(3, 'What if it is cancelled?') +
        '<ul><li>Refund</li><li>Next sailing</li></ul>',
    )

    expect(parsed.faqs).toHaveLength(2)
    expect(parsed.faqs[0].question.text).toBe('Can I book on arrival?')
    expect(parsed.faqs[0].answer.text).toBe(
      'Only the government ferry.\nAnd only if seats are left.',
    )
    expect(parsed.faqs[1].answer.html).toContain('<ul>')
    /** Marker khud heading hai — wahi FAQ block ka heading */
    expect(parsed.faqHeading).toBe('Frequently Asked Questions')
    /** Article me FAQ nahi ghusta */
    expect(parsed.values.content.text).toBe('Intro paragraph.')
  })

  it.each(['FAQ', 'FAQs', 'Frequently asked question', 'Frequently asked questions (FAQs)'])(
    '"%s" bhi FAQ ka marker hai',
    (marker) => {
      const parsed = docWith(h(2, marker) + h(3, 'Q?') + para('A.'))
      expect(parsed.faqs).toHaveLength(1)
    },
  )

  it('marker ke barabar ki h2 pe FAQ khatam — aage ka text article me wapas', () => {
    const parsed = docWith(
      h(2, 'FAQs') + h(3, 'Q?') + para('A.'),
      h(2, 'Conclusion') + para('Book early.'),
    )

    expect(parsed.faqs).toHaveLength(1)
    expect(parsed.faqs[0].answer.text).toBe('A.')
    expect(parsed.values.content.text).toContain('Conclusion')
    expect(parsed.values.content.text).toContain('Book early.')
  })

  it('purana Question / answer wala tareeka bhi chalta hai', () => {
    const parsed = docWith(
      para('Faq:') + para('Question') + para('Q1?') + para('answer') + para('A1.'),
    )

    expect(parsed.faqs).toHaveLength(1)
    expect(parsed.faqs[0].question.text).toBe('Q1?')
  })
})

describe('Content — poora article ek hi khaane me', () => {
  it('article ka HTML heading, list aur table sab rakhta hai', () => {
    const html = parsed.values.content.html

    expect(html).toMatch(/<h2/i)
    expect(html).toMatch(/<ul/i)
    /** ⚠️ Table ek block hai. `BLOCK_TAGS` me `table` na ho to har cell alag block ban jaata. */
    expect(html).toMatch(/<table/i)
  })

  it('table ke cells chipakte nahi — D-82 wala stripTags bug', () => {
    /**
     * `textOf` `</td>` ke baad space na daale to row `Makruzz90 minutes₹1,400` ban jaati hai.
     * Ye theek wahi shakl hai jo D-82 me pakdi gayi thi.
     */
    expect(text('content')).toMatch(/Makruzz 90 minutes/)
    expect(text('content')).not.toMatch(/Makruzz90/)
  })

  it('FAQ ka hissa Content me nahi ghusta', () => {
    expect(text('content')).not.toMatch(/Can I book Andaman ferry tickets/)
  })

  it('Content ke andar ka h2 label nahi ban jaata', () => {
    /**
     * ⚠️ "Who runs the ferries" jaisi heading kisi label se shuru na ho, ye kaafi nahi hai —
     * asli guard `matchLabel` ka hai: label ke baad kuch bacha ho to `:` zaroori hai. Bina
     * uske article ka bada hissa chup-chaap kisi aur khaane me chala jaata.
     */
    expect(text('content')).toMatch(/Who runs the ferries/)
    expect(text('content')).toMatch(/What to carry on the day/)
  })
})

describe('FAQs', () => {
  it('har Question apna item banata hai — numbering ki zaroorat nahi', () => {
    expect(parsed.faqs).toHaveLength(3)
    expect(parsed.faqs[0].question.text).toBe('Can I book Andaman ferry tickets after I land?')
    expect(parsed.faqs[0].answer.text).toMatch(/only for the government ferry/)
    expect(parsed.faqs[2].question.text).toMatch(/worth taking to save money/)
  })

  it('FAQ ka Heading alag lautta hai, kisi item me nahi', () => {
    /**
     * ⚠️ Client ke doc me `Heading` pehle `Question` se **pehle** aata hai. Use `currentFaq`
     * me daalne ka matlab hota "koi Question nahi mila" wali warning aur wo line ka **chup-chaap
     * gir jaana** — wahi "kuch na hona" jo D-86/D-89 me baar-baar mila.
     */
    expect(parsed.faqHeading).toBe('Common questions about Andaman ferries')
    expect(parsed.faqs[0]).not.toHaveProperty('heading')
  })

  it('jawab ka HTML bachta hai — wo rich text hai (D-80)', () => {
    expect(parsed.faqs[1].answer.html).toMatch(/<p/i)
  })
})

describe('HTML entities', () => {
  it('&mdash; aur &ndash; asli character bante hain', () => {
    /**
     * ⚠️ **Ye asli export se pakda gaya, andaaze se nahi** — usme `&mdash;` chaar baar aur
     * `&ndash;` paanch baar hai.
     *
     * Bina decode kiye ye plain-text khaanon me literally baith jaate: card pe aur meta
     * description me `Neil &mdash; plus when to book` chhapta. HTML wale khaane me nuksaan
     * nahi hota (wahan wo valid HTML hai), isliye ye sirf `text` side pe dikhta — aur usi
     * wajah se aasaani se chhoot jaata.
     *
     * Ye wahi bug hai jo D-81 me `&#8377;` pe pakda gaya tha, doosri shakl me.
     */
    expect(text('metaDescription')).toMatch(/Neil — plus when to book/)
    expect(text('metaDescription')).not.toMatch(/&mdash;/)
    expect(text('content')).not.toMatch(/&ndash;|&mdash;/)
  })
})

describe('jab doc template ka hai hi nahi', () => {
  it('ek bhi label na mile to saaf warning aati hai', () => {
    const bad = parsePostDoc('<p>Just some notes</p><p>and nothing else</p>')

    expect(bad.warnings).toEqual([
      'No known labels were found in this document — check that it uses the template',
    ])
    expect(bad.values).toEqual({})
  })

  it('Question se pehle likha jawab chhoota nahi, warning deta hai', () => {
    const bad = parsePostDoc('<p>Blog title</p><p>X</p><p>FAQs</p><p>answer</p><p>orphan</p>')

    expect(bad.faqs).toEqual([])
    expect(bad.warnings[0]).toMatch(/came before any "Question"/)
  })

  it('label aur value ek hi line me likhe hon to bhi chalta hai', () => {
    const inline = parsePostDoc('<p>Blog title : Andaman ferries</p>')

    expect(inline.values.title.text).toBe('Andaman ferries')
  })
})

describe('FAQ ka heading section marker se takrata hai', () => {
  /**
   * ⚠️ **Ye asli content se nikla (10 Sep).** Client ke article me FAQ section ka heading
   * literally "Frequently asked questions" hai — aur wahi vaakya `FAQ_SECTION_LABELS` me ek
   * section marker bhi hai.
   *
   * Parser use heading ki value nahi, ek **doosra `faqStart`** samajh leta tha: `currentKey`
   * reset ho jaata aur heading chup-chaap gir jaati. Chaaron sawaal theek aate the, sirf
   * heading gayab — yaani nuksaan dikhta hi nahi tha.
   */
  const withHeading = (heading) =>
    parsePostDoc(
      '<p>Blog title</p><p>T</p><p>Content</p><p>Body.</p>' +
        `<p>FAQs</p><p>Heading</p><p>${heading}</p>` +
        '<p>Question</p><p>Q1?</p><p>answer</p><p>A1.</p>',
    )

  it('heading khud ek section marker ho to bhi bach_ta hai', () => {
    const parsed = withHeading('Frequently asked questions')

    expect(parsed.faqHeading).toBe('Frequently asked questions')
    expect(parsed.faqs).toHaveLength(1)
    expect(parsed.faqs[0].question.text).toBe('Q1?')
  })

  it('saada heading pehle jaisa hi chalta hai', () => {
    expect(withHeading('Common questions about ferries').faqHeading).toBe(
      'Common questions about ferries',
    )
  })

  it('FAQ ke andar likha "Questions" ab section reset nahi karta', () => {
    /** Ek aur shakl: jawab ke andar `Questions` shabd akela ek line pe. */
    const parsed = parsePostDoc(
      '<p>Blog title</p><p>T</p><p>Content</p><p>Body.</p>' +
        '<p>FAQs</p><p>Question</p><p>Q1?</p><p>answer</p><p>A1.</p><p>Questions</p>',
    )

    expect(parsed.faqs).toHaveLength(1)
    expect(parsed.faqs[0].answer.text).toMatch(/A1\./)
  })
})
