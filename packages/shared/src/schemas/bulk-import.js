import { z } from 'zod'

/**
 * Bulk Upload ka contract — ek import run aur uski rows (D-81).
 *
 * Client ka faisla saaf tha: _"mat likho wapas uspe, apne admin me hi status show karte jao"_.
 * Isliye sheet me kuch nahi likha jaata; har run ka poora hisaab **yahan** rehta hai. Uska ek
 * faayda bhi hai jo sheet me nahi milta — screen band karke wapas aao to bhi list bani rehti
 * hai, aur har package ka URL seedha clickable hota hai.
 */

/** Poore run ki haalat. */
export const IMPORT_RUN_STATUS = Object.freeze({
  QUEUED: 'queued',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
})

export const IMPORT_RUN_STATUSES = Object.freeze(Object.values(IMPORT_RUN_STATUS))

/**
 * Ek row ki haalat — yaani ek doc, yaani ek package.
 *
 * ⚠️ **`draft` aur `failed` alag cheezein hain**, aur ye farak client ka apna hai:
 *
 * - `draft` — package **ban gaya**, par kuch reference nahi mila, isliye publish nahi hua.
 *   Client doc ya master list theek karke dobara import chalata hai.
 * - `failed` — package ban hi **nahi saka** (naam hi nahi tha, doc nahi khuli).
 *
 * Client ne kaha tha: _"rok do publish mat karo, aur status me dikhta jayega ki kya choota hai
 * aur draft ban jayega"_. Yaani content chala jaana chahiye, sirf publish rukna chahiye.
 */
export const IMPORT_ROW_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  PUBLISHED: 'published',
  DRAFT: 'draft',
  FAILED: 'failed',
  SKIPPED: 'skipped',
})

export const IMPORT_ROW_STATUSES = Object.freeze(Object.values(IMPORT_ROW_STATUS))

/** Row jinke aage kuch nahi hona — poll tabhi tak chalti hai jab tak run in me na ho. */
export const IMPORT_RUN_TERMINAL = Object.freeze([IMPORT_RUN_STATUS.DONE, IMPORT_RUN_STATUS.FAILED])

/**
 * Ek issue — **blocker** publish rok deta hai, **note** sirf batata hai.
 *
 * ⚠️ Issue ek plain string **nahi** hai, aur wo jaan-boojh kar hai. Client ko chahiye tha ki
 * *"status me dikhta jayega ki kya choota hai"* — uske liye teen cheezein chahiye: kis khaane
 * me (`label`), doc me **kya likha tha** (`value`), aur kya karna hai (`message`). Sirf ek
 * vaakya likhne se client ko doc me wo line dhoondhni padti; `value` se wo seedha Ctrl-F kar
 * leta hai.
 */
export const issueSchema = z.object({
  level: z.enum(['blocker', 'note']),
  label: z.string().max(120),
  value: z.string().max(300).default(''),
  message: z.string().max(500),
})

export const importRowSchema = z.object({
  docUrl: z.string().max(2000),
  docId: z.string().max(120).nullable().default(null),
  status: z.enum(IMPORT_ROW_STATUSES),
  /** Package pehle se tha ya abhi bana — client ko "duplicate to nahi bana?" ka jawab. */
  action: z.enum(['created', 'updated']).nullable().default(null),
  entryId: z.string().nullable().default(null),
  title: z.string().max(300).default(''),
  path: z.string().max(500).default(''),
  issues: z.array(issueSchema).max(50).default([]),
  error: z.string().max(500).nullable().default(null),
})

/**
 * Import shuru karne ka input — bas sheet ka URL.
 *
 * `.url()` yahan jaan-boojh kar nahi hai: client aksar `docs.google.com/...` bina `https://`
 * ke paste karta hai, aur uspe *"Invalid url"* dikhana bemaani hai. Asli jaanch service me
 * hoti hai (`sheetIdFromUrl`), jahan error bhi kaam ka hota hai.
 */
/**
 * Import kis iraade se chal raha hai (client, 4 Sep).
 *
 * ⚠️ Ye ek **assertion** hai, filter nahi: client keh raha hai ki "is sheet me sirf naye doc
 * hain" ya "sirf purane". Jo row us baat se alag nikle wo **Failed** hoti hai, wajah ke saath.
 *
 * Wajah suraksha ki hai, suvidha ki nahi. Bina iske ek galti chup-chaap nikal jaati: client
 * naye packages ki sheet chalata hai, usme galti se ek purana URL reh gaya hota hai, aur wo
 * ek live package ko **chup-chaap overwrite** kar deta. Mode chun lene se wo galti ruk jaati
 * hai aur dikhti bhi hai.
 *
 * `new` default hai — sabse aam kaam yahi hai.
 */
export const IMPORT_MODE = Object.freeze({ NEW: 'new', EXISTING: 'existing' })

export const IMPORT_MODES = Object.freeze(Object.values(IMPORT_MODE))

export const startImportSchema = z
  .object({
    sheetUrl: z.string().min(1, 'Paste the Google Sheet link').max(2000),
    mode: z.enum(IMPORT_MODES).default(IMPORT_MODE.NEW),
  })
  .strict()

export const importRunQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/** Ek run me kitni rows — 20 aam hai; ye hadd bhaagti hui sheet se bachati hai. */
export const MAX_IMPORT_ROWS = 200
