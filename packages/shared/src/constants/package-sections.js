/**
 * ⚠️ Yahan se `schemas/` me import ho raha hai, jo is folder ke liye ulta lagta hai.
 *
 * Wajah: `resolveSectionLabels()` ek **function** hai, constant nahi — wo yahan isliye
 * hai ki uska data (`PACKAGE_SECTIONS`) yahin hai. `rich-doc.js` sirf zod pe depend karti
 * hai, isliye koi cycle nahi banta (barrel se nahi, seedhi file se import hai).
 */
import { textToDoc } from '../schemas/rich-doc.js'

/**
 * Public package page ke sections — har ek ka **heading** aur uske neeche ki **line**.
 *
 * Ye file Q-9 ka jawab hai (client, 31 Aug). Pehle ye saara text theme me hardcoded tha
 * (`PackagePage.jsx` + `Pricing.jsx`), yaani client ek shabd bhi admin se nahi badal sakta
 * tha — aur wo is framework ke vaade se takrata hai: har client ka apna instance, par core
 * code sab me same. `Popular add-ons` ko `Optional extras` karna ek code change tha.
 *
 * ## Ye file hi ekmatra source hai
 *
 * Yahan likha text **do jagah** kaam karta hai:
 *
 * - theme ka **fallback** — client ne kuch na likha ho to yahi chhapta hai
 * - admin ka **placeholder** — client ko dikhta hai ki khaali chhodne pe kya aayega
 *
 * Dono ek hi jagah se isliye aate hain ki alag rakhne pe wo **ek din alag ho jaate** —
 * admin placeholder me kuch aur dikhata, page pe kuch aur chhapta, aur kisi ko pata nahi
 * chalta. Yahi sabak D-43 §2 me `allowedColumnCounts` pe mila tha.
 *
 * ## `key` wahi hai jo page ka anchor hai
 *
 * `overview`, `itinerary`, `included`, `booking`, `faq` — ye page pe pehle se
 * `<section id="...">` hain. Naya naam gadhne ka koi faayda nahi tha, aur inhe milate
 * rehne se `#faq` jaisa link aur uska label hamesha ek hi cheez ki baat karte hain.
 *
 * ⚠️ `addOns` ka DOM id `add-ons` hai (kebab), par key camelCase hai — naming convention
 * keys pe camelCase kehta hai, aur ye key Mongo me stored data ban jaati hai.
 *
 * ## Kya yahan NAHI hai
 *
 * Page ki chhoti inline lines — `per person · twin sharing`, `PRICE_NOTE`,
 * catbar wali line, aur hotel tabs ke naam (`Base` · `Sea-facing` · `Beachfront` ·
 * `Villas`). Wo **section ke heading nahi** hain, aur unhe field banana wahi galti hoti jo
 * D-57/D-58 me pakdi gayi thi — jo cheez abhi kisi ne maangi nahi, uske liye pehle se 12
 * field mat banao. Tab tabs wali baat sabse tez kaanta hai (wo Andaman-specific hai) aur
 * uska record `09-OPEN-ITEMS.md` Q-9 me hai.
 */

/**
 * Page ke kram me — admin ka panel bhi isi kram me banta hai.
 *
 * `label` admin me dikhta hai, `heading`/`description` page pe. `description` khaali ka
 * matlab hai "aaj is section ke neeche koi line nahi hai" — client chaahe to bhar sakta
 * hai, aur tab wo chhapne lagegi (client, 31 Aug: "abhi nahi hai to kya hua, aage text
 * bhi daal sakte hai").
 *
 * `hasDescription: false` sirf **Overview** pe hai — wahan description ka box hi nahi
 * banta, aur schema use reject karta hai. Wajah neeche us entry pe likhi hai.
 */
export const PACKAGE_SECTIONS = Object.freeze([
  {
    key: 'overview',
    label: 'Overview',
    heading: 'About this itinerary',
    description: '',
    /**
     * ⚠️ Is section pe description ka box **nahi** hai (client, 31 Aug).
     *
     * Wajah: is section ka "text" pehle se maujood hai — wo **Edit Package ▸ Overview** ka
     * rich text (`entry.content`) hai, aur wo har package ka **apna** hai. Yahan ek aur
     * description dene ka matlab hota heading aur us rich text ke **beech** me ek global
     * line, jo har package pe wahi rehti. Do intro ek doosre ke upar — client ne mana kiya.
     *
     * Heading phir bhi badalne laayak hai; sirf line wala box hata hai.
     */
    hasDescription: false,
  },
  {
    key: 'itinerary',
    label: 'Day-by-day itinerary',
    heading: 'Day-by-day itinerary',
    /**
     * ⚠️ Isme ek **vaada** hai — "Replanning is free". Wo har client pe sach nahi hoga.
     * Pehle iske upar comment tha ki "jis din badalna pade, ye field banegi" — wo din
     * aa gaya, aur ab ye badalne laayak hai.
     */
    description:
      'Every day below can be moved, shortened or swapped. Replanning is free — you only pay the difference in what you change.',
  },
  {
    key: 'hotels',
    label: 'Hotels',
    heading: 'Hotels on this package',
    /**
     * ⚠️ "and on the enquiry form" — wo form abhi bana nahi hai (Enquiries, Q-2). Line
     * design ki hai isliye jaisi ki taisi rakhi gayi, par ab client use khud kaat sakta
     * hai — pehle wo ek line ka code change tha.
     */
    description:
      'Rooms are held on twin sharing with daily breakfast. Switch the category to see the properties it puts you in — the tab you pick here also sets the price shown at the top of the page and on the enquiry form.',
    /**
     * ⚠️ Ye hint ek asli galti ke baad juda (client, 31 Aug).
     *
     * Page pe is line ke **neeche** ek aur paragraph dikhta hai — chuni hui category ka
     * apna text (`CATEGORY_COPY`, `components/package/Pricing.jsx`). Wo tabs ke baad aata
     * hai aur **tab badalne pe badal jaata hai**.
     *
     * Client ne page dekh kar dono paragraph is box me paste kar diye, aur wo text page pe
     * **do baar** chhapne laga — ek baar yahan se, ek baar widget se. Box ko dekh kar ye
     * pata hi nahi chalta ki neeche wala paragraph kiska hai, isliye ab wo likha hua hai.
     */
    hint: 'The paragraph below the tabs belongs to the hotel category widget — it changes with the selected tab, so don’t repeat it here.',
  },
  {
    key: 'addOns',
    label: 'Add-ons',
    heading: 'Popular add-ons',
    description: 'Added to your quote only if you want them.',
  },
  {
    key: 'included',
    label: "What's included",
    /** Curly apostrophe — page pe pehle `&rsquo;` tha, wahi character rehna chahiye. */
    heading: 'What’s included',
    description: '',
  },
  {
    key: 'booking',
    label: 'Good to know',
    heading: 'Good to know before you book',
    description: '',
  },
  {
    key: 'faq',
    label: 'FAQs',
    heading: 'Questions about this package',
    description: '',
  },
])

/** Zod shape aur admin dono isi list se chalte hain — koi doosri jagah hardcode nahi. */
export const PACKAGE_SECTION_KEYS = Object.freeze(PACKAGE_SECTIONS.map((section) => section.key))

/**
 * Kis section pe description ka field hai.
 *
 * Default **haan** — `hasDescription: false` likhna padta hai, `true` nahi. Naya section
 * jodne wale ko wahi milta hai jo aam hai, aur apwaad likh kar batana padta hai.
 */
export const sectionHasDescription = (section) => section.hasDescription !== false

/**
 * `key` → `{ heading, description }`, aur `description` yahan **doc** hai (D-69).
 *
 * Ye theme ka aakhri sahara hai — jab `packageDefaults` ka call hi fail ho jaaye. Us haalat
 * me bhi shape wahi hona chahiye jo API bhejti hai, warna page bina heading ke reh jaata
 * hai ya render crash karta hai.
 *
 * ⚠️ Isiliye yahan `textToDoc()` lagta hai: `PACKAGE_SECTIONS` me defaults padhne laayak
 * **strings** hain (file khulti hai to text dikhna chahiye, JSON ka ped nahi), par bahar
 * jaane wala shape doc hai.
 */
export const PACKAGE_SECTION_DEFAULTS = Object.freeze(
  Object.fromEntries(
    PACKAGE_SECTIONS.map(({ key, heading, description }) => [
      key,
      { heading, description: textToDoc(description) },
    ]),
  ),
)

/**
 * Stored `sectionLabels` + defaults → wo text jo page pe sach me chhapega.
 *
 * **Ye ek hi jagah hai jahan fallback lagta hai.** Pehle ye sirf public projection me thi
 * aur admin apni alag copy rakhta tha — do jagah wahi shart likhna theek wahi shakl hai
 * jisme ek din dono alag ho jaate: admin ek text dikhata aur page doosra chhapta, aur kisi
 * ko pata nahi chalta. Ab API dono taraf yahi function bulati hai.
 *
 * ## Khaali ke teen alag matlab
 *
 * | Stored                  | Nateeja                                          |
 * | ----------------------- | ------------------------------------------------ |
 * | key hai hi nahi         | default heading **aur** default line             |
 * | `heading: ''`           | default heading — section bina title ke na rahe  |
 * | `description` khaali doc | **kuch nahi** — client ne line jaan-boojh kar hatayi |
 *
 * Aakhri row is feature ka asli maqsad hai: client ko line **hataane** ka raasta chahiye
 * tha. Isiliye shart `=== undefined` hai — khaali doc ek asli jawab hai, khaali jagah nahi.
 *
 * @param {Record<string, {heading?: string, description?: object}>} [stored]
 */
export function resolveSectionLabels(stored) {
  return Object.fromEntries(
    PACKAGE_SECTIONS.map((section) => {
      const { key, heading, description } = section
      const custom = stored?.[key]
      /** Default padhne laayak string hai; theme ko hamesha doc chahiye (D-69). */
      const defaultDoc = () => textToDoc(description)

      /**
       * Jis section pe description ka field hi nahi (Overview), uske payload me wo key
       * **aati hi nahi**.
       *
       * Pehle yahan `description: ''` bheji ja rahi thi "shape ek jaisa rahe" ke naam pe —
       * par wahi khaali string admin ke Save me wapas jaati aur schema use `.strict()` se
       * **400** de deta. Payload ko us cheez ke baare me chup rehna chahiye jo hai hi nahi.
       * Theme ise pehle se sambhalta hai (`label?.description &&`).
       */
      if (!sectionHasDescription(section)) {
        return [key, { heading: custom?.heading?.trim() || heading }]
      }

      /** Kabhi chhua hi nahi — dono default se. */
      if (!custom) return [key, { heading, description: defaultDoc() }]

      return [
        key,
        {
          heading: custom.heading?.trim() || heading,
          /**
           * `=== undefined` hi shart hai.
           *
           * Stored **khaali doc** ek asli jawab hai — "ye line page se hata do" (D-65). Use
           * default se bharna client ko us line se kabhi peecha na chhudane deta. Isliye
           * yahan sirf ye dekha jaata hai ki field **aayi hi nahi**, uske khaali hone se
           * koi farak nahi padta.
           *
           * (Pehle ye `custom.description?.trim() ?? description` tha — string ke zamane
           * ka. `.trim()` ab doc pe chalta hi nahi.)
           */
          description: custom.description === undefined ? defaultDoc() : custom.description,
        },
      ]
    }),
  )
}
