import { toPublicUser } from '@cms/shared'

import * as usersService from './service.js'
import { updateMeSchema } from './validation.js'

/** Patla controller — validate → service → response. */

export async function getMe(req, res) {
  res.json({ data: { user: toPublicUser(req.user, req.permissions) } })
}

export async function updateMe(req, res, next) {
  try {
    const input = updateMeSchema.parse(req.body)
    const user = await usersService.updateMe(String(req.user._id), input)
    res.json({ data: { user: { ...user, permissions: req.permissions } } })
  } catch (err) {
    next(err)
  }
}
