import { PERMISSION } from '@cms/shared'

import { env } from '../../core/env.js'
import { forbidden } from '../../core/errors.js'
import * as formService from './service.js'
import {
  bulkEnquirySchema,
  createFormSchema,
  formListQuerySchema,
  listEnquiriesQuerySchema,
  submitEnquirySchema,
  updateEnquirySchema,
  updateFormSchema,
} from './validation.js'

/** Patla controller — validate → service → response (R1). */

/** CSV ke shuru me lagne wala byte-order mark — `exportCsv` me kyun, wahin likha hai. */
const BOM = String.fromCharCode(0xfeff)

export const formController = {
  async list(req, res, next) {
    try {
      const query = formListQuerySchema.parse(req.query)
      const [{ forms, meta }, counts] = await Promise.all([
        formService.listForms(query),
        formService.formCounts(),
      ])

      /**
       * Counts list ke saath hi jaate hain, alag call se nahi — screen ke tabs
       * (`All · Active · Draft`) list ke saath render hote hain, aur do requests ka matlab
       * hai do alag waqt ke jawab (wahi tark jo `entryCounts()` pe hai).
       */
      res.json({ data: { forms, counts }, meta })
    } catch (err) {
      next(err)
    }
  },

  async get(req, res, next) {
    try {
      res.json({ data: { form: await formService.getForm(req.params.id) } })
    } catch (err) {
      next(err)
    }
  },

  async create(req, res, next) {
    try {
      const input = createFormSchema.parse(req.body)

      res.status(201).json({ data: { form: await formService.createForm(input) } })
    } catch (err) {
      next(err)
    }
  },

  async update(req, res, next) {
    try {
      const input = updateFormSchema.parse(req.body)

      res.json({ data: { form: await formService.updateForm(req.params.id, input) } })
    } catch (err) {
      next(err)
    }
  },

  async remove(req, res, next) {
    try {
      res.json({ data: await formService.deleteForm(req.params.id) })
    } catch (err) {
      next(err)
    }
  },
}

/**
 * Enquiry kis page se aayi — uska **poora** pata (client, 9 Sep).
 *
 * ⚠️ **Sirf `sourcePath` bhejna wahi chup bug hai jo `entries` pe 4 Sep ko pakda gaya tha**
 * (`withUrl`, wahan ka comment padho): admin apne hi origin pe chalta hai (`:5173`), to browser
 * `/packages/discover-andaman` ko **admin ka** pata samajh leta hai. Detail screen pe wo ek aisa
 * text hai jise copy karke koi khol hi nahi sakta.
 *
 * `env.SITE_URL` se banta hai, kisi setting se nahi — wahi pattern jo `entries/controller.js`
 * aur `settings/controller.js` pe hai. Settings se lene ka matlab hota `settings.read` ke peeche
 * chala jaana, jo `salesAgent` ke paas hai hi nahi — aur usi ke liye ye screen bani hai (D-29).
 *
 * ⚠️ `sourcePath` **hataya nahi gaya** — wo list ke `enq-src` column me abhi bhi chhota dikhta
 * hai, aur wahan poora URL bemaani hota.
 */
const withSourceUrl = (enquiry) =>
  enquiry?.sourcePath
    ? { ...enquiry, sourceUrl: `${env.SITE_URL.replace(/\/$/, '')}${enquiry.sourcePath}` }
    : enquiry

/**
 * Public submit — **bina auth ke**.
 *
 * Yahan koi permission check nahi hai aur na ho sakta hai: bharne wala site ka visitor hai.
 * Saari rok service me hai (form active hai?, required bhare hain?, koi anjaan key to nahi?)
 * aur route pe rate limit lagti hai.
 */
export const enquiryController = {
  async submit(req, res, next) {
    try {
      const input = submitEnquirySchema.parse(req.body)

      res.status(201).json({ data: await formService.submitEnquiry(input) })
    } catch (err) {
      next(err)
    }
  },

  // ── inbox (authed) ─────────────────────────────────────────────────────────

  async list(req, res, next) {
    try {
      const query = listEnquiriesQuerySchema.parse(req.query)
      const [{ enquiries, meta }, counts] = await Promise.all([
        formService.listEnquiries(query),
        formService.enquiryCounts(),
      ])

      /** Counts list ke saath — do request ka matlab do alag waqt ke jawab (formController.list). */
      res.json({ data: { enquiries, counts }, meta })
    } catch (err) {
      next(err)
    }
  },

  async get(req, res, next) {
    try {
      const data = await formService.getEnquiry(req.params.id)

      res.json({ data: { ...data, enquiry: withSourceUrl(data.enquiry) } })
    } catch (err) {
      next(err)
    }
  },

  async update(req, res, next) {
    try {
      const input = updateEnquirySchema.parse(req.body)

      res.json({
        data: { enquiry: await formService.updateEnquiry(req.params.id, input) },
      })
    } catch (err) {
      next(err)
    }
  },

  async bulk(req, res, next) {
    try {
      const input = bulkEnquirySchema.parse(req.body)

      /**
       * ⚠️ Bulk do alag kaam karta hai aur unki permission bhi alag hai.
       *
       * Route pe sirf `submission.update` lagti hai (status badalna), par isi endpoint se
       * `delete` bhi ho sakta hai — aur wo editor ke paas hai hi nahi. Bina is check ke
       * bulk **delete ka pichhla darwaza** ban jaata: gate route pe lagta aur asli kaam usse
       * bhaari hota. Conditional permission middleware me nahi ho sakti, isliye yahan hai.
       */
      if (
        input.action.kind === 'delete' &&
        !req.permissions?.includes(PERMISSION.SUBMISSION_DELETE)
      ) {
        throw forbidden(`Missing permission: ${PERMISSION.SUBMISSION_DELETE}`)
      }

      res.json({ data: await formService.bulkEnquiries(input) })
    } catch (err) {
      next(err)
    }
  },

  async exportCsv(req, res, next) {
    try {
      const query = listEnquiriesQuerySchema.parse(req.query)
      const csv = await formService.exportEnquiriesCsv(query)
      const stamp = new Date().toISOString().slice(0, 10)

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="enquiries-${stamp}.csv"`)
      /**
       * Shuru me BOM (U+FEFF) — iske bina Excel CSV ko apni local encoding me kholta hai
       * aur `₹` jaise chinh aur non-ASCII naam toot kar dikhte hain.
       *
       * `fromCharCode` se banaya hai, file me literal character likh kar nahi: wo character
       * editor me dikhta hi nahi (isliye galti se hat jaana bahut aasaan hai) aur lint use
       * "irregular whitespace" batata hai.
       */
      res.send(BOM + csv)
    } catch (err) {
      next(err)
    }
  },
}
