import { z } from 'zod'

import { DEFAULT_SITE_ID } from '../constants/index.js'

/**
 * Enquiry forms — `admin-design-v2.html` ke `#s-enquiry-forms` aur `#s-form-builder` se
 * (client, 1 Sep).
 *
 * Client ne poora Enquiries module abhi nahi maanga — **sirf Enquiry Forms aur Add New
 * Form**, "kyunki design me chahiye itinerary page par". Yaani asli maang ye hai ki package
 * page ke sidebar me ek chalta hua form dikhe (Q-2 ka wo hissa jo D-67 me khula reh gaya
 * tha: wahan button ban gaya tha, form nahi).
 *
 * ## Yahan kya NAHI hai
 *
 * - **All Enquiries ki screen, Enquiry Detail, Export CSV** — client ne "only" kaha
 * - **Email bhejna** — SMTP Phase 0 se blocked hai (`09-OPEN-ITEMS.md`). `emailTo` field
 *   abhi bhi hai aur save hota hai, kyunki wo pata client ke paas aaj hai aur us din
 *   dobara nahi poochhna padega
 * - **Shortcode se kisi bhi page pe lagana** — uske liye page builder chahiye (Phase 5)
 *
 * ⚠️ Submissions **DB me jaati hain** (`enquiries`), bhale unhe dekhne ki screen abhi na
 * ho. Ye jaan-boojh kar hai: ek form jo bhara jaata hai par kahin store nahi hota, wo
 * client ki asli enquiries chup-chaap kho deta — aur wo nuksaan wapas nahi aata. Screen baad
 * me ban jaayegi; kho gaya data nahi banta.
 */

// ── field types ──────────────────────────────────────────────────────────────

/**
 * Design ke builder wale aath type, aur ek nauvaan — `hidden`.
 *
 * ⚠️ `hidden` ab **kisi default field pe nahi** hai. Wo `Source page` ke liye tha, aur wo
 * field 2 Sep me hat gayi — enquiry ka path ab payload ka apna khaana hai
 * (`submitEnquirySchema.sourcePath`), kisi field pe tika hua nahi.
 *
 * Type phir bhi yahan hai, aur wo jaan-boojh kar hai: us badlaav se **pehle** bane form me wo
 * field ab bhi ho sakti hai, aur enum se hatane ka matlab hota ki wo form agli Save pe 400
 * de. Naya form use kabhi nahi banata.
 */
export const FORM_FIELD_TYPES = Object.freeze([
  'text',
  'email',
  'phone',
  'number',
  'date',
  'select',
  'checkbox',
  'textarea',
  'hidden',
])

/** Builder ke dropdown me jo dikhta hai — `hidden` yahan jaan-boojh kar nahi hai. */
export const FORM_FIELD_TYPE_LABEL = Object.freeze({
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  number: 'Number',
  date: 'Date',
  select: 'Dropdown',
  checkbox: 'Checkbox',
  textarea: 'Long text',
  hidden: 'Hidden',
})

export const formFieldSchema = z.object({
  /**
   * `key` **stored data** hai — submission ke values isi naam se baithte hain
   * (`values.fullName`). Rename karna R4 wali baat hai: purani enquiries ka data us naye
   * naam pe nahi milega.
   *
   * Isiliye admin me `key` badalne ka koi raasta nahi hai; label badalta hai, key nahi.
   */
  key: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-zA-Z][a-zA-Z0-9]*$/, 'Field key must be camelCase letters and digits'),

  label: z.string().min(1).max(120),

  type: z.enum(FORM_FIELD_TYPES),

  /**
   * `show: false` ka matlab hai "ye field form pe dikhega hi nahi".
   *
   * Field ko **hataya** nahi jaata, chhupaya jaata hai — do alag baatein hain. Hata dene se
   * purani submissions ka wo khaana anaath ho jaata; chhupane se wo record me rehta hai aur
   * client kal use wapas la sakta hai. Design me bhi dono hain (checkbox aur Remove).
   */
  show: z.boolean().default(true),

  required: z.boolean().default(false),

  /**
   * `select` ke vikalp. Baaki types pe ye khaali rehta hai.
   *
   * Khaali `options` wala dropdown page pe **render hi nahi hota** — ek khaali dropdown
   * dikhana adhoora control dikhana hai (D-30, wahi tark jo khaali URL wale button pe hai).
   */
  options: z.array(z.string().min(1).max(120)).max(50).default([]),

  /**
   * Sirf `select` pe — vikalp admin ke likhe hue nahi, kahin aur se aate hain.
   *
   * | `source` | Vikalp kahan se | Design |
   * | --- | --- | --- |
   * | `packages` | is page ka package + uske similar | `Dropdown · auto-filled from Packages` |
   * | `categories` | is package ki **bhari hui** categories, daam ke saath | `Standard — ₹24,999` |
   *
   * ⚠️ `categories` sirf ek dropdown nahi hai — wo **page ka daam badalta hai**. Reference
   * (`itinerary-v3.html`) me wahi `.js-cat-sel` hai: category chunte hi widget ka neela sar
   * aur "save %" dono badal jaate hain. Isiliye uske vikalp admin likh hi nahi sakta — wo
   * har package ke apne daam hain.
   */
  source: z.enum(['packages', 'categories']).optional(),

  /**
   * `Your name`, `+91 98765 43210`, `you@example.com` — reference ke apne placeholders.
   *
   * Label batata hai ki khaana **kya** hai; placeholder batata hai ki uska **roop** kya hai.
   * Mobile pe ye sabse zyada kaam aata hai: `+91` dikhte hi user ko pata chal jaata hai ki
   * country code chahiye ya nahi.
   */
  placeholder: z.string().max(200).default(''),

  /**
   * `half` wale do field **ek row me** baithte hain — reference ka `.bkg__two`.
   *
   * Wahan `Travel date` aur `Guests` ek saath hain, aur wo bina wajah nahi: sidebar ka form
   * patla hai, aur do chhote khaane ko poori chaudai dena form ko bekaar lamba kar deta hai.
   *
   * Jodi **apne aap** banti hai — do lagataar `half` mil jaayein to wo ek row ho jaate hain.
   * Admin ko "row" jaisi koi cheez banane ki zaroorat nahi; ek akela `half` bhi theek chalta
   * hai (wo poori chaudai le leta hai).
   */
  width: z.enum(['full', 'half']).default('full'),

  /*
   * ⚠️ Yahan ek `optionalTag` bhi tha — label ke aage halka `optional` (reference me
   * `Special request` pe hai). Client ne uska checkbox hatane ko kaha (1 Sep), aur uske baad
   * wo kahin se **set hi nahi ho sakta tha**: schema me khaana, payload me safar, theme me
   * render — sab maujood, aur koi use bhar hi nahi sakta.
   *
   * Aisi config chhodna khaali chhodne se bura hai: wo padhne wale ko lagta hai ki koi
   * feature hai, aur wo use dhoondhta rehta hai. Isliye poora hata diya gaya.
   */
})

// ── form ─────────────────────────────────────────────────────────────────────

/**
 * Form kahan dikhta hai.
 *
 * Design me paanch vikalp hain (All package pages · Contact page · Popup · Sticky mobile
 * bar · koi path). Aaj sirf **do** ban sakte hain: package pages, aur kahin nahi. Baaki teen
 * ke liye page builder chahiye (Phase 5) — unhe abhi dropdown me daal dena ek jhootha
 * control hota, jo chunne par kuch karta hi nahi.
 */
export const FORM_PLACEMENTS = Object.freeze(['packages', 'none'])

export const FORM_PLACEMENT_LABEL = Object.freeze({
  packages: 'All package pages',
  none: 'Not placed anywhere yet',
})

export const FORM_STATUSES = Object.freeze(['active', 'draft'])

export const formSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  name: z.string().trim().min(1, 'Give the form a name').max(200),

  /**
   * `sales@…` — **abhi sirf store hota hai, bheja kuch nahi jaata** (SMTP blocked).
   *
   * Comma se ek se zyada. Yahan poora email validation jaan-boojh kar nahi hai: client
   * `sales@x.com, ops@x.com` likhta hai aur beech me space chhodta hai, aur us din is field
   * pe atak jaana form banane se rok deta. Jis din mail sach me jaayegi, us din bhejne se
   * pehle parse hoga.
   */
  emailTo: z.string().trim().max(500).default(''),

  afterSubmit: z
    .object({
      mode: z.enum(['message', 'redirect']).default('message'),
      /** `message` pe wo text, `redirect` pe wo path. Dono ek hi khaane me. */
      value: z.string().trim().max(500).default(''),
    })
    .default({ mode: 'message', value: '' }),

  /**
   * Button ke neeche ki chhoti line — reference ka `<small>`.
   *
   * `No advance to see the plan. Answered by a planner in Port Blair, usually within 4
   * working hours.`
   *
   * Ye thank-you message se **alag** hai aur ye farq maayne rakhta hai: thank-you submit ke
   * **baad** aata hai, ye **pehle** — jab user abhi soch raha hai ki bharun ya na bharun.
   * Isme jhijhak todne wali baat hoti hai ("no advance", "4 hours"), aur usi wajah se wo
   * conversion pe seedha asar daalti hai.
   */
  footnote: z.string().trim().max(300).default(''),

  placement: z.enum(FORM_PLACEMENTS).default('none'),

  status: z.enum(FORM_STATUSES).default('draft'),

  /**
   * ⚠️ **Ek form pe do field ki ek hi `key` nahi ho sakti.**
   *
   * Bina is check ke submission ka `values` object chup-chaap ek ko doosre se overwrite kar
   * deta — dono khaane form pe dikhte, aur enquiry me sirf ek pahunchta. Ye Zod me hi hai,
   * service me nahi, kyunki iske liye sirf yahi document chahiye.
   */
  fields: z
    .array(formFieldSchema)
    .max(40)
    .default([])
    .refine(
      (fields) => new Set(fields.map((f) => f.key)).size === fields.length,
      'Two fields cannot share the same key',
    ),

  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createFormSchema = formSchema
  .omit({ createdAt: true, updatedAt: true })
  .partial({ siteId: true })

export const updateFormSchema = createFormSchema.partial()

export const formListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z.enum(FORM_STATUSES).optional(),
  placement: z.enum(FORM_PLACEMENTS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

// ── default field set ────────────────────────────────────────────────────────

/**
 * Naya form kis shape me khulta hai — `admin-design-v2.html` ke builder ki wahi das rows,
 * usi kram me, unhi Show/Required ticks ke saath.
 *
 * Bhara hua khulta hai, khaali nahi. Wahi wajah jo Section Headings ke form pe likhi hai
 * (D-65): client ko ek chalti hui cheez milni chahiye jise wo kaat sake — khaali table dekh
 * kar use pehle ye sochna padta ki ek enquiry form me hota kya hai.
 */
export const DEFAULT_FORM_FIELDS = Object.freeze([
  {
    key: 'fullName',
    label: 'Full Name',
    type: 'text',
    show: true,
    required: true,
    placeholder: 'Your name',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    show: true,
    required: true,
    placeholder: 'you@example.com',
  },
  {
    key: 'phone',
    label: 'Phone / WhatsApp',
    type: 'phone',
    show: true,
    required: true,
    placeholder: '+91 98765 43210',
  },
  {
    key: 'packageName',
    label: 'Package',
    type: 'select',
    show: true,
    required: false,
    /** Vikalp publish packages se aate hain — admin inhe likhta nahi. */
    source: 'packages',
  },
  /** Ye do reference me ek hi row me hain (`.bkg__two`) — isiliye dono `half`. */
  {
    key: 'travelDate',
    label: 'Travel Date',
    type: 'date',
    show: true,
    required: false,
    width: 'half',
  },
  {
    key: 'travellers',
    label: 'Travellers',
    type: 'number',
    show: true,
    required: false,
    width: 'half',
  },
  /**
   * Hotel category — reference ka `.js-cat-sel`.
   *
   * `show: false` pe khulta hai, jaan-boojh kar: har site package pe category-wise daam
   * nahi rakhti, aur bina bhare hue daam ke ye dropdown khaali hota (aur tab render bhi nahi
   * hota). Jise chahiye wo ek tick se chalu kar le.
   */
  {
    key: 'hotelCategory',
    label: 'Hotel category',
    type: 'select',
    show: false,
    required: false,
    source: 'categories',
  },
  {
    key: 'budget',
    label: 'Budget',
    type: 'select',
    show: true,
    required: false,
    options: ['Under ₹25,000', '₹25,000 – ₹50,000', '₹50,000 – ₹1,00,000', 'Above ₹1,00,000'],
  },
  {
    key: 'message',
    label: 'Message',
    type: 'textarea',
    show: true,
    required: false,
    placeholder: "Honeymoon, kids' ages, flight timings — anything we should plan around",
  },
  { key: 'consent', label: 'Consent', type: 'checkbox', show: true, required: true },
])

/** Naye form ka poora khaali document. */
export function emptyForm() {
  return {
    name: '',
    emailTo: '',
    afterSubmit: { mode: 'message', value: 'Thank you — we will get back to you shortly.' },
    /** Reference ki apni line — client kaat sakta hai, par ek chalti hui shuruaat milti hai. */
    footnote: 'No advance to see the plan. Answered by a planner, usually within 4 working hours.',
    placement: 'none',
    status: 'draft',
    fields: DEFAULT_FORM_FIELDS.map((field) => ({
      options: [],
      placeholder: '',
      width: 'full',
      ...field,
    })),
  }
}

// ── submissions ──────────────────────────────────────────────────────────────

/**
 * Public submit ka payload.
 *
 * `values` **`z.record()`** hai, koi tay shape nahi — form ke fields client ke banaye hue
 * hain, to unke naam pehle se pata nahi ho sakte. Asli validation service me hoti hai: wo
 * form ka document padh kar dekhti hai ki har `required` field bhara hai aur koi anjaan key
 * nahi aayi.
 *
 * ⚠️ Yahi wo jagah hai jahan R9 sabse zyada maayne rakhta hai — ye ek **bina auth ke**
 * endpoint hai aur `values` seedha Mongo me jaata hai. Isiliye value sirf string/number/
 * boolean ho sakti hai: nested object ya array pass karne ka matlab hota `$` wale operator
 * document me pahunch jaana.
 */
export const enquiryValueSchema = z.union([z.string().max(5000), z.number(), z.boolean()])

export const submitEnquirySchema = z.object({
  formId: z.string().min(1),

  values: z.record(z.string().max(60), enquiryValueSchema).default({}),

  /**
   * Enquiry kis page se aayi — `/packages/discover-andaman`.
   *
   * ⚠️ Ye **payload ka apna khaana** hai, form ka field nahi. Pehle ye `values.sourcePage` se
   * aata tha, yaani ek `hidden` field pe tika hua tha — aur jis client ne wo field apne form
   * se hata di, uski har enquiry pe path **khaali** aane laga (2 Sep).
   *
   * Wo galat dhaancha tha: "ye kis page se aayi" client ki setting nahi hai, wo submission ka
   * apna sach hai. Use form ke fields pe tikaane ka matlab tha ki ek admin ka chunav data ki
   * quality tay kar de.
   */
  sourcePath: z.string().max(500).default(''),

  /**
   * Honeypot — asli user ise kabhi nahi bharta (wo CSS se chhupa hota hai), bot bhar deta
   * hai. Bhara hua aaye to service **200 lauta deti hai aur kuch store nahi karti**: bot ko
   * "block ho gaya" batane ka matlab hai use agla tareeka dhoondhne ka ishaara dena.
   *
   * Captcha nahi hai jaan-boojh kar — wo ek teesri service, ek aur key aur ek aur consent
   * ka sawaal le kar aata hai. Honeypot + rate limit se shuruaat theek hai; asli spam dikhe
   * to tab badhaya jaayega.
   */
  hp: z.string().max(200).optional(),
})
