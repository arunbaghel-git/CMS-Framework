import { DEFAULT_SITE_ID, emptyForm } from '@cms/shared'

import { notFound, unprocessable } from '../../core/errors.js'
import { logger } from '../../core/logger.js'
import { revalidateTags } from '../../core/revalidate.js'
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
   */
  await revalidateTags(['type:package'])

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
  await revalidateTags(['type:package'])

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

  if (!doc) return null

  return {
    id: String(doc._id),
    name: doc.name,
    afterSubmit: doc.afterSubmit ?? { mode: 'message', value: '' },
    /** Button ke neeche ki chhoti line — reference ka `<small>`. */
    footnote: doc.footnote ?? '',

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
    sourcePath: typeof values.sourcePage === 'string' ? values.sourcePage : '',
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
