import mongoose from 'mongoose'

import {
  csvCell,
  DEFAULT_SITE_ID,
  deriveEnquiryColumns,
  emptyForm,
  ENQUIRY_STATUSES,
} from '@cms/shared'

import { notFound, unprocessable } from '../../core/errors.js'
import { logger } from '../../core/logger.js'
import { revalidateTags } from '../../core/revalidate.js'
/**
 * ⚠️ Circular nahi hai — `entries/service.js` forms ko import nahi karti. Sirf ek query chahiye:
 * kaunse pages ke sections is form ko use karte hain (D-96).
 */
import { pathTagsForForm } from '../entries/service.js'
import { Enquiry, Form } from './model.js'

/**
 * Enquiry forms ka business logic — R1.
 *
 * Do hisse hain aur dono ka bhaar alag hai:
 *
 * - **Forms ka CRUD** — admin side, authed, master lists jaisa saada
 * - **Submit** — public side, **bina auth ke**, aur yahi is module ki asli jokhim hai
 */

const scope = (siteId = DEFAULT_SITE_ID) => ({ siteId })

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function toApi(doc) {
  if (!doc) return null
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, __v, ...rest } = plain

  return { ...rest, id: String(_id) }
}

// ── reads ────────────────────────────────────────────────────────────────────

/** List — server-side pagination day 1 se (R14). */
export async function listForms(query, siteId = DEFAULT_SITE_ID) {
  const { page, limit, q, status, placement } = query

  const filter = scope(siteId)
  if (q) filter.name = new RegExp(escapeRegex(q), 'i')
  // Sirf known keys — `req.query` kabhi seedha Mongoose query me spread nahi hoti (R9)
  if (status) filter.status = status
  if (placement) filter.placement = placement

  const [docs, total] = await Promise.all([
    Form.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Form.countDocuments(filter),
  ])

  return { forms: docs.map(toApi), meta: { page, limit, total } }
}

/** Har status ka number ek hi call me — list ke tabs (`All · Active · Draft`). */
export async function formCounts(siteId = DEFAULT_SITE_ID) {
  const base = scope(siteId)

  const [all, active, draft] = await Promise.all([
    Form.countDocuments(base),
    Form.countDocuments({ ...base, status: 'active' }),
    Form.countDocuments({ ...base, status: 'draft' }),
  ])

  return { all, active, draft }
}

export async function getForm(id, siteId = DEFAULT_SITE_ID) {
  const doc = await Form.findOne({ _id: id, ...scope(siteId) }).lean()
  if (!doc) throw notFound('Form not found')

  return toApi(doc)
}

/**
 * Ek submission ki ginti — form delete karne se pehle.
 *
 * Bina iske client ek aisa form mita deta jispe 96 enquiries aa chuki hain, aur unka
 * `formId` kisi aisi cheez ko point karta jo hai hi nahi. Wahi invariant jo destination pe
 * hotels ka guard hai (`countHotelsForDestination`).
 */
export async function countEnquiriesForForm(formId, siteId = DEFAULT_SITE_ID) {
  return Enquiry.countDocuments({ ...scope(siteId), formId: String(formId) })
}

// ── writes ───────────────────────────────────────────────────────────────────

/**
 * Naya form **bhara hua** banta hai — design ke das default fields ke saath.
 *
 * Khaali table dekh kar client ko pehle ye sochna padta ki ek enquiry form me hota kya hai.
 * Wahi wajah jo Section Headings ke bhare hue form pe likhi hai (D-65).
 */
export async function createForm(input, siteId = DEFAULT_SITE_ID) {
  const base = emptyForm()
  const doc = await Form.create({
    ...base,
    ...input,
    /** Client ne fields bheje hi na hon to defaults — khaali array uska apna jawab hai. */
    fields: input.fields ?? base.fields,
    ...scope(siteId),
  })

  await revalidateTags(['type:package'])

  return toApi(doc)
}

export async function updateForm(id, input, siteId = DEFAULT_SITE_ID) {
  const current = await Form.findOne({ _id: id, ...scope(siteId) }).lean()
  if (!current) throw notFound('Form not found')

  const updated = await Form.findOneAndUpdate({ _id: id }, { $set: input }, { new: true })

  /**
   * Form package pages pe chhapta hai, isliye har package ka page stale ho jaata hai.
   *
   * `type:package` hi sahi tag hai, `entry:{id}` nahi — badla hua data kisi **ek** entry ka
   * nahi hai (D-43 §4 ka sabak).
   *
   * ⚠️ **Aur jin pages ke section me ye form chuna gaya hai unke `path:` tag** (D-96) — home ka
   * hero. Bina iske button label ya fields badalne ke baad home ek ghante tak purana form dikhata.
   *
   * ⚠️ **`settings` bhi — `Enquiries ▸ Popup` ka form usi payload me resolve hota hai** (D-103).
   * Wo `pathTagsForForm()` me nahi aata: popup kisi ek page ka nahi, settings ka hissa hai.
   * Bina iske popup ka form ek ghante tak purana rehta — theek wahi A-26 wala rog, aur uska
   * lakshan phir wahi "save nahi hua" jaisa hota.
   */
  await revalidateTags(['type:package', 'settings', ...(await pathTagsForForm(id, siteId))])

  return toApi(updated)
}

/**
 * Delete — **permanent**, aur enquiries hon to rok.
 *
 * Trash yahan nahi hai (D-25 content pe lagta hai, client ki configuration pe nahi), par
 * bhari hui enquiries ka reference toot-na content ka nuksaan hai. Isliye rok, delete nahi.
 */
export async function deleteForm(id, siteId = DEFAULT_SITE_ID) {
  const current = await Form.findOne({ _id: id, ...scope(siteId) }).lean()
  if (!current) throw notFound('Form not found')

  const enquiries = await countEnquiriesForForm(id, siteId)
  if (enquiries > 0) {
    throw unprocessable(
      `This form has ${enquiries} ${enquiries === 1 ? 'enquiry' : 'enquiries'} against it — set it to Draft instead of deleting it`,
    )
  }

  await Form.deleteOne({ _id: id })
  /** Delete ke baad section ka form `null` hai aur card gayab hona chahiye — wahi pages saaf. */
  await revalidateTags(['type:package', 'settings', ...(await pathTagsForForm(id, siteId))])

  return { id: String(id) }
}

// ── public submit ────────────────────────────────────────────────────────────

/**
 * Jo form package pages pe chhapta hai — public payload ke liye.
 *
 * Ek se zyada active form ho to **sabse haal ka** chalta hai. Koi bhi niyam chahiye tha aur
 * ye kam se kam samajh me aata hai: client jo abhi banaya, wahi lagta hai. Us din jab wo
 * kaafi na ho, per-package chunav ki baat hogi (design me uska zikr hai — "pick it on a
 * package under Enable enquiry form").
 *
 * ⚠️ Sirf wo fields bahar jaate hain jo `show` hain, aur `hidden` type ka koi label nahi
 * chhapta. Theme ko chhaanne ka kaam nahi dena chahiye: ek jagah chhoot jaane pa chhupa hua
 * field page pe dikh jaata.
 */
export async function getPublicPackageForm(siteId = DEFAULT_SITE_ID) {
  const doc = await Form.findOne({ ...scope(siteId), status: 'active', placement: 'packages' })
    .sort({ updatedAt: -1 })
    .lean()

  return toPublicForm(doc)
}

/**
 * Ek **chuna hua** form — sidebar ke `enquiryForm` widget ke liye (D-88).
 *
 * ⚠️ Ye `getPublicPackageForm()` se **alag rasta** hai aur wo takrav nahi hai: `placement`
 * sirf package pages ko serve karta hai (jo hardcoded hi rahenge, D-88 #7), aur ye sirf
 * `page`/`tourPage` ki sidebar ko. Dono kabhi ek hi page pe nahi milte.
 *
 * ⚠️ **`draft` form pe `null`** — wahi rok jo `placement` wale rasta pe hai. Bina uske client
 * ek draft form sidebar me chun leta aur wo live page pe chhap jaata, jabki `submitEnquiry()`
 * uski har submission ko theek se reject karti — form dikhta, kaam na karta.
 *
 * Bekaar id pe bhi `null`, CastError nahi.
 */
export async function getPublicFormById(id, siteId = DEFAULT_SITE_ID) {
  if (!id || !mongoose.isValidObjectId(id)) return null

  const doc = await Form.findOne({ _id: id, ...scope(siteId), status: 'active' }).lean()

  return toPublicForm(doc)
}

/**
 * Form ka public shape — **ek hi jagah**.
 *
 * Do copies ka nateeja is repo me pehle ho chuka hai: `bestFor` similar cards pe chhoot gaya
 * tha (Slice B), aur `cancellationText` payload me ja hi nahi raha tha (31 Aug). Isliye
 * projection yahan ek baar likhi hai, aur dono raaste isi se guzarte hain.
 */
function toPublicForm(doc) {
  if (!doc) return null

  return {
    id: String(doc._id),
    name: doc.name,
    afterSubmit: doc.afterSubmit ?? { mode: 'message', value: '' },
    /** Button ke neeche ki chhoti line — reference ka `<small>`. */
    footnote: doc.footnote ?? '',
    /** Khaali pe theme apna default likhti hai — wo fallback theme ka hai, payload ka nahi. */
    submitLabel: doc.submitLabel ?? '',

    /**
     * Sidebar ke "Talk to a planner" card ka email — **form ka `emailTo`** (client, 2 Sep).
     *
     * Wahi pata jispe enquiries jaani hain, wahi customer ko dikhta hai. Ek hi cheez do jagah
     * rakhne ka matlab hota ki ek din wo alag ho jaate — client sales ka pata badalta aur
     * page purana dikhata rehta.
     *
     * ⚠️ **Sirf pehla pata** bahar jaata hai. `emailTo` comma se ek se zyada le sakta hai
     * (`sales@x.com, ops@x.com`) — wo **routing** ki baat hai, dikhane ki nahi. Poori list
     * chhapna har us pate ko spam ke saamne khada kar deta jo sirf CC pe tha.
     */
    contactEmail: String(doc.emailTo ?? '')
      .split(',')[0]
      .trim(),
    fields: (doc.fields ?? [])
      .filter((field) => field.show !== false)
      .map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: Boolean(field.required),
        options: field.options ?? [],
        source: field.source,
        placeholder: field.placeholder ?? '',
        width: field.width ?? 'full',
      })),
  }
}

/**
 * Ek enquiry darj karo — **bina auth ke** raasta, isliye har rok yahin hai.
 *
 * Teen cheezein dekhi jaati hain, aur teenon Zod se nahi ho saktin (sabko form ka document
 * chahiye):
 *
 * 1. Form maujood hai **aur active hai** — draft form pe submission nahi
 * 2. Har `required` aur `show` wala field bhara hai
 * 3. Koi **anjaan key** nahi aayi
 *
 * Teesra sabse zyada maayne rakhta hai: uske bina koi bhi `values` me kuch bhi bhej kar
 * document me maal chipka sakta tha. Zod ne shape rok li hai (sirf string/number/boolean),
 * par naam nahi — wo sirf form ka document jaanta hai.
 */
export async function submitEnquiry(input, siteId = DEFAULT_SITE_ID) {
  /**
   * Honeypot bhara hua = bot. **200 lauta do, store kuch mat karo.**
   *
   * Error dena bot ko batana hai ki wo pakda gaya, aur wo agla tareeka dhoondh leta hai.
   * Chup-chaap girana usse sabse mehnga padta hai.
   */
  if (input.hp) return { ok: true }

  const form = await Form.findOne({ _id: input.formId, ...scope(siteId) }).lean()
  if (!form || form.status !== 'active') throw notFound('Form not found')

  const fields = (form.fields ?? []).filter((field) => field.show !== false)
  const byKey = new Map(fields.map((field) => [field.key, field]))

  for (const key of Object.keys(input.values ?? {})) {
    if (!byKey.has(key)) throw unprocessable(`This form has no field called "${key}"`)
  }

  const values = {}
  for (const field of fields) {
    const value = input.values?.[field.key]
    /** Checkbox pe `false` bhi ek jawab hai — `!value` use khaali maan leta. */
    const filled = value !== undefined && value !== null && value !== ''

    if (field.required && (!filled || value === false)) {
      throw unprocessable(`${field.label} is required`)
    }

    if (filled) values[field.key] = value
  }

  const doc = await Enquiry.create({
    ...scope(siteId),
    formId: String(form._id),
    /** Naam copy hota hai — form rename ya delete ho jaaye to bhi enquiry apna source jaanti hai. */
    formName: form.name,
    /** Payload ka apna khaana — form ke fields se aazad (2 Sep). */
    sourcePath: input.sourcePath ?? '',
    values,
  })

  /**
   * Bhari hui enquiry API ke terminal me — **sirf dev me**.
   *
   * Abhi ise dekhne ki koi screen nahi hai (All Enquiries baaki hai, D-72), aur client ko
   * chahiye ki form bharte hi dikh jaaye ki kya aaya. DB me wo pehle se ja rahi thi; ye sirf
   * dekhne ka raasta hai.
   *
   * ⚠️ **`isProd` ka guard hataana mat.** Isme naam, email aur phone jaate hain — yaani asli
   * customer ka data. Production me wo har log line ke saath disk pe, aur aage chal kar kisi
   * log service pe pahunch jaata, jahan se use hataana aasan nahi hota. Dev me terminal
   * band karte hi khatam.
   *
   * ⚠️ Ye All Enquiries screen ki **jagah nahi** hai — wo abhi bhi banni hai. Us din ye chaar
   * line hat jaayengi.
   */
  if (process.env.NODE_ENV !== 'production') {
    logger.info({ form: form.name, path: doc.sourcePath, values }, 'Nayi enquiry')
  }

  return { ok: true, id: String(doc._id) }
}

// ── enquiries inbox ──────────────────────────────────────────────────────────

/**
 * Inbox ke saare read/write yahan hain (R1).
 *
 * ⚠️ **Trash hi delete hai** (R12) — har read `deletedAt: null` pe chhanta hai. Permanent
 * delete ka koi raasta jaan-boojh kar nahi hai: enquiry kisi asli grahak ki bhari hui hai,
 * aur uska mit-na sabse mehnga undo hota.
 */
const liveEnquiries = (siteId) => ({ ...scope(siteId), deletedAt: null })

/**
 * List aur export dono ka filter — **ek hi jagah** (client, 3 Sep).
 *
 * Export apni query nahi banata, yahi function use karta hai. Isliye "jo list me dikh raha
 * hai wahi CSV me aayega" apne aap sach rehta hai; do jagah do niyam likhne ka matlab hota
 * ki ek din wo chup-chaap alag ho jaate.
 *
 * ⚠️ `to` ka matlab **poora din** hai. `2026-09-03` likhne wala "3 tarikh tak" kehta hai,
 * "3 tarikh ki raat 12:00:00 tak" nahi — isliye range me agle din ki subah tak jaate hain
 * (`$lt`, `$lte` nahi). Bina iske 3 tarikh ki har enquiry chhoot jaati.
 */
function enquiryFilter(query, siteId) {
  const { status, formId, search, from, to } = query
  const filter = liveEnquiries(siteId)

  // Sirf known keys — `req.query` kabhi seedha query me spread nahi hoti (R9)
  if (status) filter.status = status
  if (formId) filter.formId = formId
  if (search) filter.searchText = new RegExp(escapeRegex(search.toLowerCase()), 'i')

  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`)
    if (to) {
      const next = new Date(`${to}T00:00:00.000Z`)
      next.setUTCDate(next.getUTCDate() + 1)
      filter.createdAt.$lt = next
    }
  }

  return filter
}

export async function listEnquiries(query, siteId = DEFAULT_SITE_ID) {
  const { page, limit, sort, order } = query

  const filter = enquiryFilter(query, siteId)

  const [docs, total] = await Promise.all([
    Enquiry.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Enquiry.countDocuments(filter),
  ])

  /**
   * Har row ke saath uske **apne form** ke derived column jaate hain.
   *
   * Column list me admin nahi nikaalta — wo yahin nikalte hain, taaki list, detail aur CSV
   * teenon **ek hi niyam** pe chalein. Teen jagah teen shakl banna wahi galti hai jo D-58
   * (hotels table) me pakdi gayi thi.
   *
   * ⚠️ Ek page me kai form ki rows ho sakti hain, isliye ye per-form hai, poori list ke liye
   * ek nahi. Form fetch **ek hi baar** hoti hai (`$in`), row ke hisaab se nahi — warna 20
   * rows ki list 20 query maar deti.
   */
  const formIds = [...new Set(docs.map((doc) => doc.formId))]
  const forms = await Form.find({ _id: { $in: formIds }, ...scope(siteId) }).lean()
  const columnsByForm = new Map(forms.map((form) => [String(form._id), deriveEnquiryColumns(form)]))

  const enquiries = docs.map((doc) => ({
    ...toApi(doc),
    /** Form delete ho chuka ho to `null` — row phir bhi dikhti hai, khaane khaali. */
    columns: columnsByForm.get(String(doc.formId)) ?? null,
  }))

  return { enquiries, meta: { page, limit, total } }
}

/**
 * Har status ki ginti — list ke tabs ke liye, ek hi call me.
 *
 * `ENQUIRY_STATUSES` pe ghoomta hai, hardcoded list pe nahi: naya status jodne pe tab apne
 * aap aa jaayega aur ye jagah chhoot nahi sakti.
 */
export async function enquiryCounts(siteId = DEFAULT_SITE_ID) {
  const base = liveEnquiries(siteId)

  const [all, byStatus] = await Promise.all([
    Enquiry.countDocuments(base),
    Enquiry.aggregate([{ $match: base }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ])

  const counts = { all }
  for (const status of ENQUIRY_STATUSES) counts[status] = 0
  for (const row of byStatus) {
    if (row._id in counts) counts[row._id] = row.n
  }

  return counts
}

export async function getEnquiry(id, siteId = DEFAULT_SITE_ID) {
  const doc = await Enquiry.findOne({ _id: id, ...liveEnquiries(siteId) }).lean()
  if (!doc) throw notFound('Enquiry not found')

  /**
   * Detail ke khaane form ke **type** se derive hote hain, key/label se nahi
   * (`deriveEnquiryColumns`). Isliye form bhi saath jaata hai.
   *
   * ⚠️ Form delete ho chuka ho to `columns` khaali jaata hai — aur theme/admin phir bhi
   * `values` ka poora maal dikhati hai. **Data kabhi chhupta nahi**, bas sundar labels nahi
   * milte.
   */
  const form = await Form.findOne({ _id: doc.formId, ...scope(siteId) }).lean()

  return {
    enquiry: toApi(doc),
    columns: form ? deriveEnquiryColumns(form) : null,
    form: form ? { id: String(form._id), name: form.name, fields: form.fields ?? [] } : null,
  }
}

/**
 * Sirf **status** badalta hai (client, 3 Sep).
 *
 * `values` yahan se **kabhi** nahi badalte — wo submission ka apna sach hai
 * (`updateEnquirySchema` `.strict()` hai).
 */
export async function updateEnquiry(id, input, siteId = DEFAULT_SITE_ID) {
  const doc = await Enquiry.findOneAndUpdate(
    { _id: id, ...liveEnquiries(siteId) },
    { $set: { status: input.status } },
    { new: true },
  ).lean()

  if (!doc) throw notFound('Enquiry not found')

  return toApi(doc)
}

/**
 * Bulk — status badlo ya trash me daalo.
 *
 * `/entries/bulk` ka hi shape, taaki admin ka pattern ek jaisa rahe.
 */
export async function bulkEnquiries({ ids, action }, siteId = DEFAULT_SITE_ID) {
  const filter = { _id: { $in: ids }, ...liveEnquiries(siteId) }

  const update =
    action.kind === 'delete'
      ? { $set: { deletedAt: new Date() } }
      : { $set: { status: action.status } }

  const result = await Enquiry.updateMany(filter, update)

  return { matched: result.matchedCount, modified: result.modifiedCount }
}

/**
 * CSV export.
 *
 * Column wahi hain jo list me dikhte hain (derived), **aur uske baad** har wo field jo form
 * me hai par kisi derived column me nahi gaya. Yaani export list se zyada deta hai, kam
 * nahi — spreadsheet me adhoora data bhejna sabse chup nuksaan hota.
 *
 * ⚠️ Har cell `csvCell()` se guzarta hai: `=`, `+`, `-`, `@` se shuru hone wali value Excel
 * me **formula** ban jaati hai (CSV injection). Enquiry ka text bahar se aata hai, isliye ye
 * ehtiyaat yahan zaroori hai, sundar nahi.
 *
 * ⚠️ **`csvCell()` ab `packages/shared` me hai** (D-107) — wo yahin likha hua tha, aur SEO wale
 * export ko bilkul wahi chahiye tha. Do copies ka nateeja is repo me teen baar dekha ja chuka
 * hai (`htmlToText`, `bestFor`, aur D-86 ka slug), aur is ek pe wo sabse mehnga hota: ek copy
 * me injection guard theek ho aur doosri me na ho, to farak kisi ko dikhta hi nahi.
 */
export async function exportEnquiriesCsv(query, siteId = DEFAULT_SITE_ID) {
  /**
   * Wahi filter jo list pe lagta hai — date range, status, form aur search sab.
   *
   * Isiliye client ke liye niyam saada hai: **jo list me dikh raha hai, wahi CSV me aayega.**
   */
  const filter = enquiryFilter(query, siteId)

  const docs = await Enquiry.find(filter).sort({ createdAt: -1 }).limit(5000).lean()
  const forms = await Form.find(scope(siteId)).lean()
  const formById = new Map(forms.map((form) => [String(form._id), form]))

  /** Saare forms ke field mila kar ek hi header banti hai — warna do form ki rows na milti. */
  const extraKeys = []
  for (const form of forms) {
    const derived = new Set(
      Object.values(deriveEnquiryColumns(form))
        .filter(Boolean)
        .map((column) => column.key),
    )
    for (const field of form.fields ?? []) {
      if (!derived.has(field.key) && !extraKeys.includes(field.key)) extraKeys.push(field.key)
    }
  }

  const header = [
    'Received',
    'Status',
    'Form',
    'Name',
    'Email',
    'Phone',
    'Package',
    'Travel date',
    'Pax',
    'Budget',
    'Message',
    'Source page',
    ...extraKeys,
  ]

  const rows = docs.map((doc) => {
    const form = formById.get(String(doc.formId))
    const columns = form ? deriveEnquiryColumns(form) : null
    const at = (name) => (columns?.[name] ? (doc.values?.[columns[name].key] ?? '') : '')

    return [
      doc.createdAt?.toISOString() ?? '',
      doc.status ?? '',
      doc.formName ?? '',
      at('name'),
      at('email'),
      at('phone'),
      at('package'),
      at('travelDate'),
      at('pax'),
      at('budget'),
      at('message'),
      doc.sourcePath ?? '',
      ...extraKeys.map((key) => doc.values?.[key] ?? ''),
    ]
  })

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}
