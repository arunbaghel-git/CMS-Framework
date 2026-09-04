import {
  clamp,
  HOTEL_CATEGORIES,
  ITINERARY_LIMITS,
  normalizeName,
  parseCount,
  parseMeals,
  parseMoney,
  parseNameList,
  parseSlug,
} from '@cms/shared'

/**
 * Doc ka kaccha data → `createEntry()` ka payload (D-81).
 *
 * ## Ye `service.js` se alag file kyun hai
 *
 * Yahan koi DB nahi, koi network nahi — andar naam aate hain, bahar ids jaati hain. Iska matlab
 * hai ki poori mapping **bina Mongo ke** test ho sakti hai, aur wahi is feature ki sabse zyada
 * bug wali jagah hai (38 khaane, chaar master list, teen alag hadd).
 *
 * ## ⚠️ Sabse zaroori niyam: mapper wo data kabhi na bheje jise service thukra degi
 *
 * `entries/service.js` ka `assertPackageRefs()` kuch cheezein **422** ke saath phenkta hai jo
 * Zod me hain hi nahi — ek hi category do baar, `strikePrice` jo `priceFrom` se bada na ho,
 * ek hi `destinationId:category` jodi do baar. Agar mapper wo bhej de to poora package fail ho
 * jaata hai, sirf ek daam ki galti pe.
 *
 * Isliye har aisi shart yahan **pehle** dekhi jaati hai aur uska nateeja ek issue banta hai,
 * exception nahi. Client ko *"Deluxe strike-through price is not higher than the price"*
 * dikhna chahiye — na ki poora package gayab ho jaana chahiye.
 *
 * Yahi baat lambai ki hadd pe bhi lagti hai (`ITINERARY_LIMITS`): line kaat kar note likha
 * jaata hai, kyunki ek 61 character ki line ki wajah se package rukna galat hai.
 */

/** `blocker` publish rok deta hai; `note` sirf batata hai. */
const blocker = (label, value, message) => ({
  level: 'blocker',
  label,
  value: String(value ?? ''),
  message,
})
const note = (label, value, message) => ({
  level: 'note',
  label,
  value: String(value ?? ''),
  message,
})

/**
 * Ek naam se uski id — ya wo galti jo client ko batani hai.
 *
 * Teen alag nateeje hain aur teenon ka message alag hona chahiye:
 * na mila · ek se zyada mile · khaali chhoda gaya.
 *
 * ⚠️ **Ek se zyada milna asli khatra hai.** Taxonomy ki uniqueness `slug` pe hai, `name` pe
 * nahi — do destination ka naam sach me "Havelock" ho sakta hai. Aise me pehla utha lena
 * chup-chaap **galat hotel** live page pe daal deta hai. Isliye wo bhi blocker hai.
 */
function resolveOne(map, rawName, { label, listName }) {
  const name = String(rawName ?? '').trim()
  if (!name) return { id: null, issue: null }

  const found = map.get(normalizeName(name)) ?? []

  if (found.length === 0) {
    return {
      id: null,
      issue: blocker(
        label,
        name,
        `"${name}" is not in the ${listName} list. Add it there, or fix the spelling in the document.`,
      ),
    }
  }

  if (found.length > 1) {
    return {
      id: null,
      issue: blocker(
        label,
        name,
        `"${name}" matches ${found.length} entries in the ${listName} list. Rename one of them so the name is unique.`,
      ),
    }
  }

  return { id: found[0].id, item: found[0], issue: null }
}

/** Comma se alag kiye naam → ids. Har na-mila naam apna issue banata hai. */
function resolveMany(map, rawText, options) {
  const ids = []
  const issues = []

  for (const name of parseNameList(rawText)) {
    const { id, issue } = resolveOne(map, name, options)

    if (issue) issues.push(issue)
    else if (id && !ids.includes(id)) ids.push(id)
  }

  return { ids, issues }
}

/** Khaane ka text — na ho to khaali string. */
const textOf = (values, key) => String(values?.[key]?.text ?? '').trim()

/**
 * Daam padho — `24,999` ya `31,999 → 24,999` dono.
 *
 * Do number likhe ho to **bada strike-through** hai aur **chhota asli daam** — wahi kram jo
 * page pe dikhta hai (`₹31,999 → ₹24,999`). Ek hi ho to wo asli daam hai aur strike nahi hai.
 */
function parsePriceLine(text) {
  const numbers = String(text ?? '')
    .split(/[→\-–—/|]/)
    .map((part) => parseMoney(part))
    .filter((value) => value !== null && value > 0)

  if (numbers.length === 0) return { priceFrom: null, strikePrice: null }
  if (numbers.length === 1) return { priceFrom: numbers[0], strikePrice: null }

  const sorted = [...numbers].sort((a, b) => a - b)

  return { priceFrom: sorted[0], strikePrice: sorted[sorted.length - 1] }
}

/**
 * Doc se pricing.
 *
 * ⚠️ `strikePrice` ko `priceFrom` se **bada hona hi padta hai** — warna service 422 phenkti
 * hai. Barabar ya chhota ho to strike gira diya jaata hai aur daam bach jaata hai: adhoora
 * package fail hone se behtar hai.
 */
function buildPricing(values, issues) {
  const categoryPricing = []

  for (const category of HOTEL_CATEGORIES) {
    const raw = textOf(values, `${category}Price`)
    if (!raw) continue

    const label = `${category[0].toUpperCase()}${category.slice(1)} Price`
    const { priceFrom, strikePrice } = parsePriceLine(raw)

    if (priceFrom === null) {
      issues.push(note(label, raw, 'No number could be read from this price, so it was skipped.'))
      continue
    }

    if (strikePrice !== null && strikePrice <= priceFrom) {
      issues.push(
        note(
          label,
          raw,
          'The strike-through price is not higher than the price, so it was left out.',
        ),
      )
    }

    categoryPricing.push({
      category,
      priceFrom,
      strikePrice: strikePrice !== null && strikePrice > priceFrom ? strikePrice : null,
    })
  }

  return { categoryPricing }
}

/**
 * Doc ke chaar hotel se `fields.hotels[]`.
 *
 * ⚠️ **`destinationId` doc se nahi aata — hotel ke apne record se aata hai.** Doc me sirf
 * `Standard Hotel : <naam>` likha hota hai, par `packageHotelSchema` ko teenon chahiye
 * (`destinationId`, `category`, `hotelId`). Hotel ki master list me `destinationId` pehle se
 * hai, to client se dobara poochhne ki zaroorat hi nahi.
 *
 * ⚠️ Ek hi `destinationId:category` jodi do baar bhejne pe service 422 deti hai — do category
 * ke liye ek hi hotel likh dena aam galti hai, aur wo poore package ko nahi giraana chahiye.
 */
function buildHotels(values, refs, issues) {
  const hotels = []
  const seen = new Set()

  for (const category of HOTEL_CATEGORIES) {
    const raw = textOf(values, `${category}Hotel`)
    if (!raw) continue

    const label = `${category[0].toUpperCase()}${category.slice(1)} Hotel`

    /**
     * ⚠️ **Hotel ka apna record bhi `category` rakhta hai** — Hotels ki list
     * (destination × category) pe bani hai, isliye ek hi naam kai category pe ho sakta hai.
     *
     * Sirf naam se dhoondhne pe wo har baar "ek se zyada mile" ban jaata aur har hotel line
     * blocker deti. Isliye pehle usi category me dhoondha jaata hai jo doc ke label ne batayi
     * (`Deluxe Hotel` → deluxe), aur wahan kuch na mile tabhi poori list dekhi jaati hai.
     */
    const all = refs.hotels.get(normalizeName(raw)) ?? []
    const sameCategory = all.filter((hotel) => hotel.category === category)
    const narrowed = sameCategory.length > 0 ? sameCategory : all

    const { item, issue } = resolveOne(new Map([[normalizeName(raw), narrowed]]), raw, {
      label,
      listName: 'Hotels',
    })

    if (issue) {
      issues.push(issue)
      continue
    }

    if (!item.destinationId) {
      issues.push(blocker(label, raw, `"${item.name}" has no destination set in the Hotels list.`))
      continue
    }

    /**
     * Naam mila par uski apni category doc ke label se alag hai.
     *
     * Ye galti bhi ho sakti hai aur jaan-boojh kar bhi (client ne standard hotel ko deluxe
     * row me dikhana chaha ho). Isliye **note**, blocker nahi — package rukna nahi chahiye,
     * par client ko dikhna chahiye.
     */
    if (item.category && item.category !== category) {
      issues.push(
        note(
          label,
          raw,
          `"${item.name}" is listed as a ${item.category} hotel, but it was used for the ${category} row.`,
        ),
      )
    }

    const pair = `${item.destinationId}:${category}`
    if (seen.has(pair)) {
      issues.push(note(label, raw, 'This destination already has a hotel for this category.'))
      continue
    }

    seen.add(pair)
    /** `id` tay hai, random nahi — dobara import pe wahi row rehni chahiye (neeche dekho). */
    hotels.push({ id: pair, destinationId: item.destinationId, category, hotelId: item.id })
  }

  return hotels
}

/** Din ka HTML — hadd se lamba ho to kaat kar batao. */
function dayDescription(day, number, issues) {
  const html = String(day.fields?.description?.html ?? '').trim()

  if (html.length <= ITINERARY_LIMITS.description) return html

  issues.push(
    note(
      `Day ${number} → Day Description`,
      '',
      'This description was shortened because it is very long.',
    ),
  )

  return html.slice(0, ITINERARY_LIMITS.description)
}

/**
 * Din ki list.
 *
 * ⚠️ **Har din ka `id` tay hai (`d1`, `d2`…), random nahi.** `normalizeFields` bina `id` wale
 * din ko har baar naya `randomUUID()` de deta hai — yaani dobara import karne pe har din "naya"
 * ban jaata, revision me poora itinerary badla hua dikhta, aur din ki id pe tiki koi bhi cheez
 * toot jaati.
 */
function buildItinerary(days, refs, issues) {
  const clampWarnings = []

  const itinerary = days.map((day) => {
    const number = day.number
    const at = (label) => `Day ${number} → ${label}`
    const field = (key) => String(day.fields?.[key]?.text ?? '').trim()

    let title = field('title')
    if (!title) {
      title = `Day ${number}`
      issues.push(note(at('Day Title'), '', 'No title was given, so the day number was used.'))
    }

    const stay = resolveOne(refs.destinations, field('overnightStay'), {
      label: at('Overnight Stay'),
      listName: 'Destinations',
    })
    if (stay.issue) issues.push(stay.issue)

    const transfer = resolveOne(refs.transfers, field('transfer'), {
      label: at('Transfer'),
      listName: 'Transfers',
    })
    if (transfer.issue) issues.push(transfer.issue)

    const { meals, unknown } = parseMeals(field('meals'))
    if (unknown.length > 0) {
      issues.push(
        note(
          at('Meals'),
          unknown.join(', '),
          'Only Breakfast, Lunch and Dinner can be used, so these were left out.',
        ),
      )
    }

    return {
      id: `d${number}`,
      title: clamp(title, ITINERARY_LIMITS.title, at('Day Title'), clampWarnings),
      overnightStayId: stay.id,
      description: dayDescription(day, number, issues),
      meals,
      transferId: transfer.id,
      transferNote: clamp(
        field('transferDuration'),
        ITINERARY_LIMITS.transferNote,
        at('Transfer Duration'),
        clampWarnings,
      ),
      dayTag: clamp(field('dayTag'), ITINERARY_LIMITS.dayTag, at('Day Tag'), clampWarnings),
      note: clamp(field('notes'), ITINERARY_LIMITS.note, at('Notes'), clampWarnings),
    }
  })

  for (const message of clampWarnings) issues.push(note(message.split(' was ')[0], '', message))

  return itinerary
}

/**
 * Poora payload banao.
 *
 * @param {{ values: object, days: object[], warnings: string[] }} parsed `parsePackageDoc()` se
 * @param {object} refs naam → id ke naksha (`buildRefMaps()` se)
 * @returns {{ input: object, issues: object[], slug: string, bannerUrl: string }}
 *   `input` **`bannerImage` ke bina** hai — wo image download hone ke baad service jodti hai
 */
export function toEntryInput(parsed, refs) {
  const { values, days } = parsed
  const issues = []

  for (const warning of parsed.warnings ?? []) issues.push(note('Document', '', warning))

  const title = textOf(values, 'packageName')
  const slug = parseSlug(textOf(values, 'packageUrl'))

  const destinations = resolveMany(refs.destinations, textOf(values, 'destinations'), {
    label: 'Destinations',
    listName: 'Destinations',
  })
  issues.push(...destinations.issues)

  const packageTypes = resolveMany(refs.packageTypes, textOf(values, 'packageType'), {
    label: 'Package Type',
    listName: 'Package Type',
  })
  issues.push(...packageTypes.issues)

  const addOns = resolveMany(refs.addOns, textOf(values, 'addOns'), {
    label: 'Add Ons',
    listName: 'Add-ons',
  })
  issues.push(...addOns.issues)

  const input = {
    type: 'package',
    title,
    ...(slug ? { slug } : {}),

    seo: {
      title: textOf(values, 'metaTitle').slice(0, 200),
      description: textOf(values, 'metaDescription').slice(0, 500),
    },

    /**
     * Overview `entry.content` me jaata hai — ek `richText` block, wahi shape jo editor deta
     * hai (D-80). Block ka `type` kabhi rename nahi hota (R4).
     */
    content: {
      version: 1,
      blocks: [{ type: 'richText', props: { html: String(values.overview?.html ?? '').trim() } }],
    },

    taxonomies: { destinations: destinations.ids, packageTypes: packageTypes.ids },

    fields: {
      /** Ye `textarea` hai, HTML nahi — plain text hi jaana chahiye. */
      shortDescription: textOf(values, 'shortDescription'),
      nights: parseCount(textOf(values, 'nights')),
      days: parseCount(textOf(values, 'days')),
      bestSeason: textOf(values, 'bestSeason'),
      bestFor: textOf(values, 'bestFor'),
      ferriesNote: textOf(values, 'ferries'),
      itinerary: buildItinerary(days, refs, issues),
      pricing: buildPricing(values, issues),
      hotels: buildHotels(values, refs, issues),
      addOns: addOns.ids,
    },
  }

  /** `null` count field me bemaani hai — khaali chhod dena behtar hai. */
  if (input.fields.nights === null) delete input.fields.nights
  if (input.fields.days === null) delete input.fields.days

  return {
    input,
    issues: issues.slice(0, 50),
    slug,
    bannerUrl: textOf(values, 'bannerImage'),
  }
}

/** Kya is row ko publish hona chahiye — ya draft rukna chahiye. */
export const hasBlocker = (issues) => issues.some((issue) => issue.level === 'blocker')
