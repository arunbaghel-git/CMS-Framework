import {
  faqsSchema,
  itinerarySchema,
  packageHotelsSchema,
  parsePackageDoc,
  pricingSchema,
} from '@cms/shared'
import { describe, expect, it } from 'vitest'

import { hasBlocker, toEntryInput } from './mapper.js'

/**
 * Naam → id ke naksha, wahi shape jo `buildRefMaps()` banata hai.
 *
 * Har naam ki value ek **array** hai, ek object nahi — kyunki "ek se zyada mile" ek asli
 * haalat hai (taxonomy ki uniqueness `slug` pe hai, `name` pe nahi) aur us par blocker lagta
 * hai. Array ke bina wo case likha hi nahi ja sakta.
 */
const mapOf = (entries) => new Map(Object.entries(entries))

const refs = {
  destinations: mapOf({
    'port blair': [{ id: 'dest-pb', name: 'Port Blair' }],
    havelock: [{ id: 'dest-hl', name: 'Havelock' }],
    /** Do entries ek hi naam pe — asli me ye ho sakta hai aur ye blocker hona chahiye */
    neil: [
      { id: 'dest-n1', name: 'Neil' },
      { id: 'dest-n2', name: 'Neil' },
    ],
  }),
  packageTypes: mapOf({ honeymoon: [{ id: 'type-hm', name: 'Honeymoon' }] }),
  addOns: mapOf({ snorkelling: [{ id: 'add-sn', name: 'Snorkelling' }] }),
  transfers: mapOf({ 'private ac sedan': [{ id: 'tr-car', name: 'Private AC Sedan' }] }),
  hotels: mapOf({
    'beach resort': [
      { id: 'hot-1', name: 'Beach resort', destinationId: 'dest-hl', category: 'deluxe' },
    ],
    'city hotel': [
      { id: 'hot-2', name: 'City hotel', destinationId: 'dest-pb', category: 'standard' },
    ],
    'no home': [{ id: 'hot-3', name: 'No home', destinationId: null, category: 'standard' }],
  }),
}

/** Saaf HTML — parser ko wahi milta hai (`cleanGoogleHtml()` ke baad). */
const doc = (body) => parsePackageDoc(body)

const FULL = `
<p>Package Name</p><p>Andaman Escape</p>
<p>Package URL</p><p>https://x.com/packages/andaman-escape</p>
<p>Meta Title</p><p>Andaman Escape | 5N</p>
<p>Meta Description</p><p>Port Blair and Havelock.</p>
<p>Day</p><p>6</p>
<p>Night</p><p>5 Nights</p>
<p>Destinations</p><p>Port Blair, Havelock</p>
<p>Package Type</p><p>Honeymoon</p>
<p>Add Ons</p><p>Snorkelling</p>
<p>Best Season</p><p>Oct – May</p>
<p>Best For</p><p>first-timers</p>
<p>Ferries</p><p>3 legs, included</p>
<p>Short Description</p><p>Kids &lt; 5 free.</p>
<p>Overview</p><p>Covers <strong>Port Blair</strong>.</p>
<p>Standard Hotel</p><p>City hotel</p>
<p>Deluxe Hotel</p><p>Beach resort</p>
<p>Standard Price</p><p>&#8377;24,999</p>
<p>Deluxe Price</p><p>31,999 → 27,999</p>
<p>Day wise Itinerary</p>
<p>Day 1</p>
<p>Day Title</p><p>Arrive Port Blair</p>
<p>Overnight Stay</p><p>port blair</p>
<p>Meals</p><p>Breakfast, Dinner</p>
<p>Transfer</p><p>Private AC Sedan</p>
<p>Transfer Duration</p><p>90 min</p>
<p>Day Tag</p><p>Arrival day</p>
<p>Day Description</p><p>Land and rest.</p>
`

describe('toEntryInput — sab kuch theek ho', () => {
  const { input, issues, slug, bannerUrl } = toEntryInput(doc(FULL), refs)

  it('koi blocker nahi banta', () => {
    expect(issues.filter((issue) => issue.level === 'blocker')).toEqual([])
    expect(hasBlocker(issues)).toBe(false)
  })

  it('title aur slug nikaalta hai', () => {
    expect(input.title).toBe('Andaman Escape')
    expect(slug).toBe('andaman-escape')
  })

  it('naam ka case maaf karta hai — `port blair` bhi chalta hai', () => {
    expect(input.fields.itinerary[0].overnightStayId).toBe('dest-pb')
  })

  it('taxonomies sahi keys me jaati hain', () => {
    expect(input.taxonomies).toEqual({
      destinations: ['dest-pb', 'dest-hl'],
      packageTypes: ['type-hm'],
    })
  })

  it('Overview ek richText block banta hai, block ka type badla nahi', () => {
    expect(input.content.blocks[0].type).toBe('richText')
    expect(input.content.blocks[0].props.html).toContain('<strong>Port Blair</strong>')
  })

  it('shortDescription plain text rehta hai, HTML nahi', () => {
    // Ye field `textarea` hai — usme tag jaana galat hota
    expect(input.fields.shortDescription).toBe('Kids < 5 free.')
  })

  it('ginti number banti hai', () => {
    expect(input.fields.days).toBe(6)
    expect(input.fields.nights).toBe(5)
  })

  it('hotel ka destinationId hotel ke apne record se aata hai', () => {
    // Doc me destination likha hi nahi hota — wo Hotels master list se aata hai
    expect(input.fields.hotels).toEqual([
      { id: 'dest-pb:standard', destinationId: 'dest-pb', category: 'standard', hotelId: 'hot-2' },
      { id: 'dest-hl:deluxe', destinationId: 'dest-hl', category: 'deluxe', hotelId: 'hot-1' },
    ])
  })

  it('do number wale daam me bada strike aur chhota asli hota hai', () => {
    expect(input.fields.pricing.categoryPricing).toEqual([
      { category: 'standard', priceFrom: 24999, strikePrice: null },
      { category: 'deluxe', priceFrom: 27999, strikePrice: 31999 },
    ])
  })

  it('din ka id tay hota hai, random nahi', () => {
    // Random hota to dobara import pe har din "naya" ban jaata
    expect(input.fields.itinerary[0].id).toBe('d1')
    expect(toEntryInput(doc(FULL), refs).input.fields.itinerary[0].id).toBe('d1')
  })

  it('banner ka URL alag se lautta hai — wo download ke baad judta hai', () => {
    expect(bannerUrl).toBe('')
    expect(input.fields.bannerImage).toBeUndefined()
  })

  /**
   * ⚠️ **Ye is file ka sabse zaroori test hai.**
   *
   * Mapper aur schema do alag jagah hain. Ek din koi schema me field jode ya hadd badle, aur
   * mapper waisa ka waisa rahe — to wo drift **sirf asli import pe** pakdi jaati, ek 422 ke
   * roop me jo client ko dikhta hai. Yahan wo abhi pakdi jaati hai.
   */
  it('output asli Zod schemas se guzar jaata hai', () => {
    expect(() => itinerarySchema.parse(input.fields.itinerary)).not.toThrow()
    expect(() => pricingSchema.parse(input.fields.pricing)).not.toThrow()
    expect(() => packageHotelsSchema.parse(input.fields.hotels)).not.toThrow()
  })
})

describe('toEntryInput — jab naam match na kare', () => {
  it('spelling galat ho to blocker banta hai, andaza nahi lagta', () => {
    const { issues } = toEntryInput(doc('<p>Destinations</p><p>Havelok</p>'), refs)
    const found = issues.find((issue) => issue.label === 'Destinations')

    expect(found.level).toBe('blocker')
    expect(found.value).toBe('Havelok')
    expect(found.message).toContain('not in the Destinations list')
  })

  it('ek naam do jagah mile to bhi rukta hai — chup-chaap pehla nahi uthata', () => {
    const { issues } = toEntryInput(doc('<p>Destinations</p><p>Neil</p>'), refs)
    const found = issues.find((issue) => issue.label === 'Destinations')

    expect(found.level).toBe('blocker')
    expect(found.message).toContain('matches 2 entries')
  })

  it('hotel pe destination set na ho to blocker deta hai', () => {
    const { issues } = toEntryInput(doc('<p>Standard Hotel</p><p>No home</p>'), refs)

    expect(issues.find((issue) => issue.label === 'Standard Hotel').message).toContain(
      'no destination set',
    )
  })

  it('khaali khaana blocker nahi hai — wo bas khaali hai', () => {
    const { issues } = toEntryInput(
      doc('<p>Package URL</p><p>trip</p><p>Destinations</p><p>Port Blair</p>'),
      refs,
    )

    expect(issues.filter((issue) => issue.level === 'blocker')).toEqual([])
  })

  /**
   * ⚠️ `Package URL` isme **apwaad** hai — baaki har khaali khaana maaf hai, ye nahi (D-86).
   *
   * Wajah "khaana khaali hai" nahi, **pehchaan khaali hai**: wahi ek cheez doc ko uske package
   * se baandhti hai. Uske bina address naam se banta hai, aur naam badalte hi agla import ek
   * doosra live page bana deta hai.
   */
  it('Package URL na ho to wo blocker hai — baaki khaali khaanon se ulta', () => {
    const { issues } = toEntryInput(doc('<p>Package Name</p><p>Trip One</p>'), refs)

    const found = issues.find((issue) => issue.label === 'Package URL')

    expect(found.level).toBe('blocker')
    expect(found.message).toContain('renaming the package later does not create a second page')
  })
})

describe('toEntryInput — wo cheezein jo service 422 deti', () => {
  it('strike daam bada na ho to use gira deta hai, package nahi', () => {
    const { input, issues } = toEntryInput(doc('<p>Standard Price</p><p>24,999 / 24,999</p>'), refs)

    expect(input.fields.pricing.categoryPricing[0]).toEqual({
      category: 'standard',
      priceFrom: 24999,
      strikePrice: null,
    })
    expect(issues.find((issue) => issue.label === 'Standard Price').level).toBe('note')
  })

  it('ek hi hotel do category pe ho to doosri row girti hai, package nahi', () => {
    // `destinationId:category` jodi do baar bhejne pe service 422 deti hai
    const { input, issues } = toEntryInput(
      doc(
        '<p>Package URL</p><p>trip</p><p>Standard Hotel</p><p>City hotel</p><p>Deluxe Hotel</p><p>City hotel</p>',
      ),
      refs,
    )

    expect(input.fields.hotels).toHaveLength(2)
    expect(() => packageHotelsSchema.parse(input.fields.hotels)).not.toThrow()
    expect(issues.filter((issue) => issue.level === 'blocker')).toEqual([])
  })

  it('lambi line kaat kar batata hai, poore package ko nahi giraata', () => {
    const long = 'x'.repeat(80)
    const { input, issues } = toEntryInput(
      doc(`<p>Day wise Itinerary</p><p>Day 1</p><p>Transfer Duration</p><p>${long}</p>`),
      refs,
    )

    expect(input.fields.itinerary[0].transferNote).toHaveLength(60)
    expect(issues.some((issue) => issue.message.includes('shortened'))).toBe(true)
    expect(() => itinerarySchema.parse(input.fields.itinerary)).not.toThrow()
  })

  it('din ka title na ho to din number lagata hai — schema title maangta hai', () => {
    const { input } = toEntryInput(
      doc('<p>Day wise Itinerary</p><p>Day 3</p><p>Notes</p><p>x</p>'),
      refs,
    )

    expect(input.fields.itinerary[0].title).toBe('Day 3')
    expect(() => itinerarySchema.parse(input.fields.itinerary)).not.toThrow()
  })

  /**
   * D-104 — pehle yahan enum tha aur `Brunch` ek issue ban kar **gir** jaata tha. Client ne
   * 21 Sep ko free text maanga; ab jo doc me likha hai wahi din pe pahunchta hai.
   */
  it('meals free text hain — anjaan shabd bhi bachta hai', () => {
    const { input, issues } = toEntryInput(
      doc('<p>Day wise Itinerary</p><p>Day 1</p><p>Meals</p><p>Breakfast, Evening tea</p>'),
      refs,
    )

    expect(input.fields.itinerary[0].meals).toEqual(['Breakfast', 'Evening tea'])
    expect(issues.find((issue) => issue.label === 'Day 1 → Meals')).toBeUndefined()
  })

  /**
   * Din ka `Notes` ab kahin nahi jaata (D-104) — par chup-chaap girta bhi nahi.
   *
   * ⚠️ Label `DAY_LABELS` me jaan-boojh kar bacha hai: hata dene pe wo line kisi label se match
   * na karti aur **upar wale khaane me chipak** jaati (A-38 wali galti).
   */
  it('din ka purana Notes girta hai, par ek note ke saath', () => {
    const { input, issues } = toEntryInput(
      doc('<p>Day wise Itinerary</p><p>Day 1</p><p>Notes</p><p>Carry a permit</p>'),
      refs,
    )

    expect(input.fields.itinerary[0].note).toBeUndefined()

    const issue = issues.find((i) => i.label === 'Day 1 → Notes')
    expect(issue.level).toBe('note')
    expect(issue.value).toBe('Carry a permit')
    expect(issue.message).toContain('Notes Content')
  })

  /** Naya top-level Notes section — heading plain text, content doc ki apni HTML (D-104). */
  it('Notes Heading aur Notes Content package ke Notes section me jaate hain', () => {
    const { input } = toEntryInput(
      doc(
        '<p>Notes Heading</p><p>Before you travel</p>' +
          '<p>Notes Content</p><p>Carry a <strong>valid ID</strong></p>' +
          '<p>Day wise Itinerary</p><p>Day 1</p><p>Day Title</p><p>Arrive</p>',
      ),
      refs,
    )

    expect(input.fields.notes.heading).toBe('Before you travel')
    expect(input.fields.notes.content).toContain('<strong>valid ID</strong>')
  })

  /**
   * ⚠️ **Client ne doc me heading ki value `Notes` likhi, aur wo chup-chaap gayab ho gayi.**
   *
   * Wajah: `Notes` khud ek label tha (`notesContent` ka shortcut). Value label ban gayi,
   * heading khaali reh gayi, aur koi error kahin nahi aaya. Shortcut hata diya gaya — ab
   * `Notes` sirf ek shabd hai.
   *
   * Ye test us shortcut ke wapas aane ka pehra hai.
   */
  it('heading ki value khud "Notes" ho to bhi bachti hai', () => {
    const { input } = toEntryInput(
      doc(
        '<p>Notes Heading</p><p>Notes</p>' +
          '<p>Notes Content</p><p>Carry a valid photo ID.</p>' +
          '<p>Day wise Itinerary</p><p>Day 1</p><p>Day Title</p><p>Arrive</p>',
      ),
      refs,
    )

    expect(input.fields.notes.heading).toBe('Notes')
    expect(input.fields.notes.content).toContain('Carry a valid photo ID.')
  })

  it('Notes na ho to dono khaali rehte hain — section page pe aata hi nahi', () => {
    const { input } = toEntryInput(
      doc('<p>Day wise Itinerary</p><p>Day 1</p><p>Day Title</p><p>Arrive</p>'),
      refs,
    )

    expect(input.fields.notes).toEqual({ heading: '', content: '' })
  })
})

describe('FAQs', () => {
  const FAQ_DOC = `
<p>Package Name</p><p>X</p>
<p>FAQs</p>
<p>Question</p><p>Is the ferry included?</p>
<p>Answer</p><p>Yes, <strong>all three legs</strong>.</p>
<p>Question</p><p>Can we add scuba?</p>
<p>Answer</p><ul><li>Try-dive at Havelock</li></ul>
`

  it('Question/Answer se faqs banti hain — sawaal plain, jawab HTML', () => {
    const { input } = toEntryInput(doc(FAQ_DOC), refs)

    expect(input.fields.faqs).toHaveLength(2)
    expect(input.fields.faqs[0].question).toBe('Is the ferry included?')
    // Sawaal `<summary>` me jaata hai — wahan markup ka koi matlab nahi
    expect(input.fields.faqs[0].question).not.toContain('<')
    expect(input.fields.faqs[0].answer).toContain('<strong>all three legs</strong>')
    expect(input.fields.faqs[1].answer).toContain('<li>Try-dive at Havelock</li>')
  })

  it('faq ka id tay hota hai, random nahi', () => {
    // Random hota to dobara import pe har FAQ "naya" ban jaata
    expect(toEntryInput(doc(FAQ_DOC), refs).input.fields.faqs.map((f) => f.id)).toEqual([
      'f1',
      'f2',
    ])
  })

  it('bina jawab wala sawaal chhod deta hai — par chup-chaap nahi', () => {
    const { input, issues } = toEntryInput(
      doc('<p>FAQs</p><p>Question</p><p>Lonely question</p>'),
      refs,
    )

    expect(input.fields.faqs).toEqual([])
    expect(issues.find((issue) => issue.label === 'FAQ 1').message).toContain('no answer')
  })

  it('output asli faqsSchema se guzar jaata hai', () => {
    const { input } = toEntryInput(doc(FAQ_DOC), refs)

    expect(() => faqsSchema.parse(input.fields.faqs)).not.toThrow()
  })
})
