import * as packageDefaultsService from './service.js'
import { updatePackageDefaultsSchema } from './validation.js'

/** Patla controller — validate → service → response (R1). */

export async function get(_req, res, next) {
  try {
    res.json({ data: { packageDefaults: await packageDefaultsService.getPackageDefaults() } })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const input = updatePackageDefaultsSchema.parse(req.body)

    res.json({
      data: { packageDefaults: await packageDefaultsService.updatePackageDefaults(input) },
    })
  } catch (err) {
    next(err)
  }
}
