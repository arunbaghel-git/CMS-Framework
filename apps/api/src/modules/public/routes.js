import { Router } from 'express'

import { getPublicMenu } from '../menus/service.js'
import { getPublicSettings } from './service.js'

/**
 * `/api/public/*` — read-only, bina auth ke.
 *
 * Ye module `model.js`/`validation.js` ke bina hai (jaise `roles`) kyunki iska apna koi
 * collection nahi hai — ye doosre modules ke services ka **public projection** hai.
 *
 * Admin aur public routes alag hone ki wajah 02-ARCHITECTURE §10 me hai: public payload
 * ka shape alag hai aur usme kabhi koi admin-only field nahi jaana chahiye.
 *
 * Dono GET hain aur dono sach me read-only hain (R13).
 */
export const publicRoutes = Router()

publicRoutes.get('/settings', async (_req, res, next) => {
  try {
    res.json({ data: { settings: await getPublicSettings() } })
  } catch (err) {
    next(err)
  }
})

publicRoutes.get('/menus/:location', async (req, res, next) => {
  try {
    res.json({ data: await getPublicMenu(req.params.location) })
  } catch (err) {
    next(err)
  }
})
