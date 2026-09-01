import * as formService from './service.js'
import {
  createFormSchema,
  formListQuerySchema,
  submitEnquirySchema,
  updateFormSchema,
} from './validation.js'

/** Patla controller — validate → service → response (R1). */

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
}
