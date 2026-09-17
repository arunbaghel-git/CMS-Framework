import * as redirectService from './service.js'
import {
  createRedirectSchema,
  redirectListQuerySchema,
  updateRedirectSchema,
} from './validation.js'

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

export async function create(req, res, next) {
  try {
    const input = createRedirectSchema.parse(req.body)
    res.status(201).json({ data: { redirect: await redirectService.createRedirect(input) } })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const input = updateRedirectSchema.parse(req.body)
    res.json({ data: { redirect: await redirectService.updateRedirect(req.params.id, input) } })
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
