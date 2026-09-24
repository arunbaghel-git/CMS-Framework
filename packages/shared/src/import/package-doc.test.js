import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  clamp,
  normalizeLabel,
  parseCount,
  parseMoney,
  parseNameList,
  parseSlug,
} from './doc-parse.js'
import { parseMeals, parsePackageDoc } from './package-doc.js'

/**
 * ⚠️ **Ye fixture asli hai — client ke Google Doc ka apna export.**
 *
 * Haath se likha hua HTML yahan bekaar hota: wo wahi shakl leta jo hume aasaan lagti, aur
 * theek wo bug chhoot jaate jo Google ki apni shakl se aate hain (khaali `<p>` har label ke
 * baad, `<span>` ke andar text, aur label me trailing space).
 *
 * Dobara lene ke liye: `curl -sL "https://docs.google.com/document/d/<id>/export?format=html"`
 */
const TEMPLATE = readFileSync(
  fileURLToPath(new URL('./__fixtures__/package-template.html', import.meta.url)),
  'utf8',
)

/**
 * Ek bhara hua doc — usi shakl me jaisa Google bhejta hai.
 *
 * Isme jaan-boojh kar wo cheezein hain jo asli me aati hain aur parser ko todti hain:
 * label pe trailing space (`Destinations `), label pe colon (`Meta Description :`), ek hi
 * line me `Label : value`, sub-bullet wali nested list, aur `&lt;` wala text.
 */
const FILLED = `
<p class="c0"><span class="c2">Meta Title</span></p>
<p class="c0"><span class="c2">Andaman 5 Nights 6 Days</span></p>
<p class="c0"><span class="c2">Meta Description :</span></p>
<p class="c0"><span class="c2">Port Blair, Havelock and Neil.</span></p>
<p class="c0 c1"><span class="c2"></span></p>
<p class="c0"><span class="c2">Day :</span></p>
<p class="c0"><span class="c2">6</span></p>
<p class="c0"><span class="c2">Night :</span></p>
<p class="c0"><span class="c2">5 Nights</span></p>
<p class="c0"><span class="c2">Destinations </span></p>
<p class="c0"><span class="c2">Port Blair, Havelock</span></p>
<p class="c0"><span class="c2">Package Type</span></p>
<p class="c0"><span class="c2">Honeymoon</span></p>
<p class="c0"><span class="c2">Add Ons</span></p>
<p class="c0"><span class="c2">Snorkelling, Sea walk</span></p>
<p class="c0"><span class="c2">Standard Price</span></p>
<p class="c0"><span class="c2">&#8377;24,999</span></p>
<p class="c0"><span class="c2">Package Name : Andaman Escape</span></p>
<p class="c0"><span class="c2">Package URL :</span></p>
<p class="c0"><span class="c2">https://example.com/packages/andaman-escape?utm=x</span></p>
<p class="c0"><span class="c2">Short Description</span></p>
<p class="c0"><span class="c2">Kids &lt; 5 years stay free.</span></p>
<p class="c0"><span class="c2">Overview</span></p>
<p>Five nights covers <strong>Port Blair</strong> and Neil.</p>
<ul class="c7"><li class="c0"><span class="c2">Ferry included</span><ul class="c7"><li class="c0"><span class="c2">Two legs</span></li></ul></li></ul>
<p class="c0"><span class="c2">Day wise Itinerary</span></p>
<p class="c0"><span class="c2">Day 1</span></p>
<p class="c0"><span class="c2">Day Title:</span></p>
<p class="c0"><span class="c2">Arrive Port Blair</span></p>
<p class="c0"><span class="c2">Overnight Stay</span></p>
<p class="c0"><span class="c2">Port Blair</span></p>
<p class="c0"><span class="c2">Meals</span></p>
<p class="c0"><span class="c2">Breakfast, Dinner</span></p>
<p class="c0"><span class="c2">Transfer</span></p>
<p class="c0"><span class="c2">Private AC Sedan</span></p>
<p class="c0"><span class="c2">Transfer Duration</span></p>
<p class="c0"><span class="c2">90 min</span></p>
<p class="c0"><span class="c2">Day Tag</span></p>
<p class="c0"><span class="c2">Arrival day</span></p>
<p class="c0"><span class="c2">Notes</span></p>
<p class="c0"><span class="c2">Approx. 4 hrs sightseeing</span></p>
<p class="c0"><span class="c2">Day Description</span></p>
<p class="c0"><span class="c2">Land at Veer Savarkar airport.</span></p>
<p class="c0"><span class="c2">Cellular Jail light show in the evening.</span></p>
<p class="c0"><span class="c2">Day 2</span></p>
<p class="c0"><span class="c2">Day Title:</span></p>
<p class="c0"><span class="c2">Ferry to Havelock</span></p>
<p class="c0"><span class="c2">Overnight Stay</span></p>
<p class="c0"><span class="c2">Havelock</span></p>
`

describe('parsePackageDoc — asli template', () => {
  const parsed = parsePackageDoc(TEMPLATE)

  it('khaali template ke saare label pehchaan leta hai', () => {
    /**
     * Template me har label hai par value ek bhi nahi. Parser ko phir bhi har khaana
     * **dikhna** chahiye — warna "label mila hi nahi" aur "label mila par khaali tha" me
     * farak hi na rahe, aur galat format chup-chaap nikal jaaye.
     */
    for (const key of [
      'metaTitle',
      'metaDescription',
      'days',
      'nights',
      'bestSeason',
      'destinations',
      'packageType',
      'addOns',
      'bestFor',
      'ferries',
      'bannerImage',
      'standardHotel',
      'deluxeHotel',
      'premiumHotel',
      'luxuryHotel',
      'packageName',
      'packageUrl',
      'shortDescription',
      'overview',
    ]) {
      expect(parsed.values, key).toHaveProperty(key)
    }
  })

  it('template ke dono Day block pakadta hai', () => {
    expect(parsed.days.map((day) => day.number)).toEqual([1, 2])
  })

  it('khaali template pe koi value nahi banati', () => {
    expect(parsed.values.metaTitle.text).toBe('')
  })

  it('"format badal gaya" wali warning nahi deti — labels to mile hain', () => {
    expect(parsed.warnings.join(' ')).not.toContain('No known labels')
  })
})

describe('parsePackageDoc — bhara hua doc', () => {
  const { values, days, warnings } = parsePackageDoc(FILLED)

  it('label pe trailing space aur colon dono maaf karta hai', () => {
    // `Destinations ` (space) aur `Meta Description :` (colon) — dono asli template se hain
    expect(values.destinations.text).toBe('Port Blair, Havelock')
    expect(values.metaDescription.text).toBe('Port Blair, Havelock and Neil.')
  })

  it('ek hi line me likha "Label : value" bhi padhta hai', () => {
    expect(values.packageName.text).toBe('Andaman Escape')
  })

  it('`Day :` ko `Day 1` se nahi milata', () => {
    expect(values.days.text).toBe('6')
    expect(values.nights.text).toBe('5 Nights')
    expect(days).toHaveLength(2)
  })

  it('value ke kai paragraph jodta hai, ek nahi chhodta', () => {
    expect(days[0].fields.description.text).toBe(
      'Land at Veer Savarkar airport.\nCellular Jail light show in the evening.',
    )
  })

  it('Overview ka formatting aur nested list bachaata hai', () => {
    const html = values.overview.html

    expect(html).toContain('<strong>Port Blair</strong>')
    expect(html).toContain('Two legs')
    // Nested `<ul>` ke andar wali `</ul>` pe list adhoori nahi katni chahiye
    expect(html.match(/<\/ul>/g)).toHaveLength(2)
  })

  it('`&lt;` wala text jyon ka tyon padhta hai', () => {
    // "Kids < 5 years" — HTML me ye adhoora tag jaisa dikhta hai, par hai plain text
    expect(values.shortDescription.text).toBe('Kids < 5 years stay free.')
  })

  it('itinerary shuru hone ke baad ke labels din ke hain, doc ke nahi', () => {
    expect(days[0].fields.transferDuration.text).toBe('90 min')
    expect(days[0].fields.transfer.text).toBe('Private AC Sedan')
    expect(days[1].fields.title.text).toBe('Ferry to Havelock')
  })

  it('adhoore aakhri din pe nahi girta', () => {
    expect(days[1].fields.overnightStay.text).toBe('Havelock')
    expect(days[1].fields.description).toBeUndefined()
  })

  it('sab theek ho to koi warning nahi', () => {
    expect(warnings).toEqual([])
  })
})

/**
 * Client, 24 Sep — `Featured Image` package pe bhi. Pehle wo label nahi tha, aur `Luxury Price` ke
 * neeche likhne pe URL daam me chipak gaya (media id ke digit → strike-through, package Failed).
 */
describe('parsePackageDoc — Featured Image', () => {
  const url =
    'http://localhost:5173/uploads/sites/default/media/2026/09/6aa91cb0c25f34cd91894da0/large.webp'
  const doc = (label) =>
    `<p>Package Name</p><p>X</p><p>Luxury Price</p><p>45,999 → 39,999</p><p>${label}</p><p>${url}</p>`

  it.each(['Featured Image', 'Featured Image URL', 'Banner Image URL'])(
    '"%s" ka URL bannerImage me jaata hai',
    (label) => {
      expect(parsePackageDoc(doc(label)).values.bannerImage.text).toBe(url)
    },
  )

  it('upar wale Luxury Price me kuch nahi chipakta', () => {
    expect(parsePackageDoc(doc('Featured Image')).values.luxuryPrice.text).toBe('45,999 → 39,999')
  })
})

describe('parsePackageDoc — jab format hi galat ho', () => {
  it('ek bhi label na mile to saaf warning deta hai', () => {
    const { warnings } = parsePackageDoc('<p>Just some prose</p><p>and more</p>')

    expect(warnings.join(' ')).toContain('No known labels')
  })

  it('itinerary heading na ho to batata hai ki din import nahi hue', () => {
    const { days, warnings } = parsePackageDoc('<p>Meta Title</p><p>X</p><p>Day 1</p>')

    expect(days).toEqual([])
    expect(warnings.join(' ')).toContain('Day wise Itinerary')
  })
})

describe('ek-ek khaane ko padhna', () => {
  it('normalizeLabel case, space aur aakhri colon uda deta hai', () => {
    expect(normalizeLabel('  Meta   Description :  ')).toBe('meta description')
    expect(normalizeLabel('Destinations ')).toBe('destinations')
  })

  it('parseCount pehla number nikaalta hai', () => {
    expect(parseCount('5 Nights')).toBe(5)
    expect(parseCount('06')).toBe(6)
    expect(parseCount('')).toBeNull()
  })

  it('parseMoney symbol aur comma ke saath chalta hai', () => {
    expect(parseMoney('₹24,999')).toBe(24999)
    expect(parseMoney('Rs. 31,999/-')).toBe(31999)
    expect(parseMoney('—')).toBeNull()
  })

  it('parseNameList teenon separator samajhta hai', () => {
    expect(parseNameList('Port Blair, Havelock')).toEqual(['Port Blair', 'Havelock'])
    expect(parseNameList('Port Blair\nHavelock')).toEqual(['Port Blair', 'Havelock'])
    expect(parseNameList('Port Blair · Havelock')).toEqual(['Port Blair', 'Havelock'])
  })

  /**
   * D-104 (21 Sep) — pehle yahan enum tha aur ye test uska tha: anjaan shabd `unknown` me lautta
   * tha taaki row ke issues me chhape. Us bartaav ka asli nateeja A-38 me dikha — client ke doc ka
   * `Evening tea` **bataya** to jaata tha, par us din ke meals me kabhi pahunchta nahi tha.
   *
   * Ab koi enum hi nahi hai: jo likha hai wahi bachta hai, bade akshar samet.
   */
  it('parseMeals free text hai — jo likha hai wahi bachta hai', () => {
    expect(parseMeals('Breakfast, Dinner')).toEqual(['Breakfast', 'Dinner'])
    expect(parseMeals('Breakfast, Evening tea')).toEqual(['Breakfast', 'Evening tea'])
    // Wahi separators jo baaki liston pe chalte hain (`parseNameList`)
    expect(parseMeals('Breakfast · Dinner')).toEqual(['Breakfast', 'Dinner'])
    expect(parseMeals('')).toEqual([])
  })

  it('parseSlug poore URL se bhi aur akele slug se bhi kaam karta hai', () => {
    expect(parseSlug('https://example.com/packages/andaman-escape?utm=x')).toBe('andaman-escape')
    expect(parseSlug('/packages/andaman-escape/')).toBe('andaman-escape')
    expect(parseSlug('andaman-escape')).toBe('andaman-escape')
    expect(parseSlug('')).toBe('')
  })

  it('clamp kaat kar batata hai, chup-chaap nahi', () => {
    const warnings = []

    expect(clamp('abcdefghij', 4, 'Day 1 transfer duration', warnings)).toBe('abcd')
    expect(warnings).toEqual(['Day 1 transfer duration was shortened to 4 characters'])
  })

  it('clamp hadd ke andar wali line ko chhoota bhi nahi', () => {
    const warnings = []

    expect(clamp('90 min', 60, 'x', warnings)).toBe('90 min')
    expect(warnings).toEqual([])
  })
})

describe('FAQs — Question / Answer ki jodi (client, 4 Sep)', () => {
  const FAQ_DOC = `
<p>Package Name</p><p>X</p>
<p>Day wise Itinerary</p>
<p>Day 1</p><p>Day Title</p><p>Arrive</p>
<p>FAQs</p>
<p>Question</p><p>Is the ferry included?</p>
<p>Answer</p><p>Yes, all three legs.</p><p>Tickets are sent a day before.</p>
<p>Question</p><p>Can we add scuba?</p>
<p>Answer</p><ul><li>Try-dive at Havelock</li><li>Certified dives on request</li></ul>
`

  const { faqs, days, warnings } = parsePackageDoc(FAQ_DOC)

  it('har Question ek naya FAQ shuru karta hai — numbering ki zaroorat nahi', () => {
    expect(faqs).toHaveLength(2)
    expect(faqs[0].question.text).toBe('Is the ferry included?')
    expect(faqs[1].question.text).toBe('Can we add scuba?')
  })

  it('jawab ke kai paragraph jud jaate hain', () => {
    expect(faqs[0].answer.html).toContain('Yes, all three legs.')
    expect(faqs[0].answer.html).toContain('Tickets are sent a day before.')
  })

  it('jawab me list bhi chalti hai', () => {
    expect(faqs[1].answer.html).toContain('<li>Try-dive at Havelock</li>')
  })

  it('FAQs shuru hone ke baad itinerary ke labels nahi lagte', () => {
    // Warna `FAQs` ek din ka label samajh liya jaata aur poori list itinerary me chali jaati
    expect(days).toHaveLength(1)
    expect(days[0].fields.title.text).toBe('Arrive')
    expect(warnings).toEqual([])
  })

  it('FAQs itinerary se pehle likhe hon to bhi chalta hai', () => {
    const before = parsePackageDoc(
      '<p>FAQs</p><p>Question</p><p>Q1</p><p>Answer</p><p>A1</p>' +
        '<p>Day wise Itinerary</p><p>Day 1</p><p>Day Title</p><p>D1</p>',
    )

    expect(before.faqs).toHaveLength(1)
    expect(before.days[0].fields.title.text).toBe('D1')
  })

  it('Question se pehle aaya Answer chup-chaap nahi girta', () => {
    const { faqs: none, warnings: warned } = parsePackageDoc(
      '<p>FAQs</p><p>Answer</p><p>orphan</p>',
    )

    expect(none).toEqual([])
    expect(warned.join(' ')).toContain('before any "Question"')
  })
})

/** Headings se FAQ — client, 23 Sep (D-116). Post jaisa hi niyam, `faqHeadingRole()` se. */
describe('FAQ — h2 heading, h3 sawaal', () => {
  const h = (level, text) => `<h${level} class="c9"><span class="c2">${text}</span></h${level}>`
  const para = (text) => `<p class="c1"><span class="c2">${text}</span></p>`

  it('h3 sawaal, neeche ka sab jawab; agli h2 pe FAQ khatam aur itinerary chalti hai', () => {
    const parsed = parsePackageDoc(
      para('Package Name') +
        para('Kerala') +
        h(2, 'Frequently Asked Questions') +
        h(3, 'Is it safe?') +
        para('Yes.') +
        h(3, 'Best time?') +
        para('Oct to Mar.') +
        h(2, 'Day wise Itinerary') +
        para('Day 1') +
        para('Day Title') +
        para('Arrive'),
    )

    expect(parsed.faqs.map((faq) => faq.question.text)).toEqual(['Is it safe?', 'Best time?'])
    expect(parsed.faqs[1].answer.text).toBe('Oct to Mar.')
    expect(parsed.days).toHaveLength(1)
    expect(parsed.days[0].fields.title.text).toBe('Arrive')
  })
})
