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
 * ⚠️ **23 Sep se import ka nateeja sirf `published` ya `failed` hai** (client, D-116: _"in bulk there
 * are only 2 things failed and published"_). Koi bhi blocker = `failed`, aur us row ka **kuch save
 * nahi hota** — client doc theek karke Past imports ka `Retry again` dabata hai.
 *
 * ~~`draft` — package ban gaya par publish nahi hua (4 Sep: _"rok do publish mat karo … draft ban
 * jayega"_)~~ — **Superseded by D-116**. `DRAFT` enum me **bacha hai** sirf purane run ki rows ke liye
 * (DB me pade hain, screen unhe badge ke saath dikhati hai). Naya code ise kabhi nahi likhta.
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
  /**
   * ⚠️ **Khaali ho sakta hai, aur wo D-107 se hai.** Teen purane target me har row ek Google Doc
   * hai; SEO wale target me koi doc hota hi nahi — wahan row ki pehchaan `path` hai. Isliye
   * `min(1)` nahi lagti, warna poori SEO wali run validation pe girti.
   */
  docUrl: z.string().max(2000).default(''),
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

/**
 * Import kis cheez ka hai — package ya blog post (spec 008, client 10 Sep).
 *
 * ⚠️ **`package` default hai, aur wo sirf suvidha nahi hai.** Purane `importRuns` me ye field
 * hai hi nahi (wo is faisle se pehle bane the), aur unhe padhte waqt kuch to maanna hi padega.
 * `package` maanna sach hai — us waqt import package ka hi hota tha. Isi wajah se **koi
 * migration nahi lagi**.
 *
 * ⚠️ Ye `mode` se alag cheez hai aur dono ek saath chalte hain: `target` kehta hai **kya** ban
 * raha hai, `mode` kehta hai **naya ya purana**.
 */
export const IMPORT_TARGET = Object.freeze({
  PACKAGE: 'package',
  POST: 'post',
  PAGE: 'page',
  /**
   * SEO ka bulk upload (D-107) — baaki teen se **alag kism ka** target.
   *
   * Teen jaan-boojh kar ulte niyam: ye koi page **banata nahi** (sirf maujooda page ka SEO
   * badalta hai), iski sheet me Google Doc ke link **nahi** hote (maal row me hi hota hai), aur
   * ye kisi ek `entryType` ka nahi hai — package, post, page, tour, blog aur home **sab** isme
   * aate hain.
   */
  SEO: 'seo',
})

export const IMPORT_TARGETS = Object.freeze(Object.values(IMPORT_TARGET))

/**
 * Har target ka naam — **ek hi jagah, dono taraf ke liye**.
 *
 * API ke error message me `"A post with the URL … choose New posts"` likha hota hai, aur admin
 * ke radio pe literally `New posts` likha hota hai. Do jagah haath se likhne ka matlab hota ki
 * ek din ek badle aur doosra na badle — aur tab error client ko ek aisa button dhoondhne bhejta
 * jo us naam se hai hi nahi.
 *
 * Yahi wajah `TAXONOMY_REF_KEY` aur `ENTRY_LIST_MAX_LIMIT` pe pehle likhi ja chuki hai: jo
 * number ya naam dono taraf dikhta hai, wo dono taraf **import** hona chahiye.
 *
 * `plural` sirf dikhane ke liye hai (dropdown, column), `many` vaakya ke andar jaata hai.
 */
export const IMPORT_TARGET_LABEL = Object.freeze({
  [IMPORT_TARGET.PACKAGE]: { one: 'package', many: 'packages', plural: 'Packages' },
  [IMPORT_TARGET.POST]: { one: 'post', many: 'posts', plural: 'Blog posts' },
  /** Saade page — `page-template-text.html` (client, 14 Sep, D-95). */
  [IMPORT_TARGET.PAGE]: { one: 'page', many: 'pages', plural: 'Pages' },
  /**
   * `plural` client ke apne shabd hain (_"dropdown name: meta upload"_, 21 Sep) — isliye wo
   * baaki teen ki tarah type ka naam nahi hai. Wahi naam dropdown pe aur Past imports ke tab pe
   * jaata hai.
   */
  [IMPORT_TARGET.SEO]: { one: 'page', many: 'pages', plural: 'Meta upload' },
})

export const startImportSchema = z
  .object({
    sheetUrl: z.string().min(1, 'Paste the Google Sheet link').max(2000),
    mode: z.enum(IMPORT_MODES).default(IMPORT_MODE.NEW),
    target: z.enum(IMPORT_TARGETS).default(IMPORT_TARGET.PACKAGE),
  })
  .strict()

/**
 * Past imports ki list — `target` ho to sirf us type ke run (client, 11 Sep).
 *
 * Na ho to dono type saath — wahi jo 10 Sep se hota aaya hai.
 */
export const importRunQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  target: z.enum(IMPORT_TARGETS).optional(),
})

/** Ek run me kitni rows — 20 aam hai; ye hadd bhaagti hui sheet se bachati hai. */
export const MAX_IMPORT_ROWS = 200
