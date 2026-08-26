import * as redirectService from './service.js'
import { redirectListQuerySchema } from './validation.js'

/** Patla controller — validate → service → response (R1). */

export async function list(req, res, next) {
  try {
    const query = redirectListQuerySchema.parse(req.query)
    const { redirects, meta } = await redirectService.listRedirects(query)

    res.json({ data: { redirects }, meta })
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    res.json({ data: await redirectService.deleteRedirect(req.params.id) })
  } catch (err) {
    next(err)
  }
}
