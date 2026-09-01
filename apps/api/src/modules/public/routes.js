import { Router } from 'express'

import { badRequest } from '../../core/errors.js'
import { publicEnquiryRoutes } from '../forms/routes.js'
import { getPublicMenu } from '../menus/service.js'
import { getPublicPackageDefaults, getPublicSettings, resolvePublicPath } from './service.js'

/**
 * `/api/public/*` — read-only, bina auth ke.
 *
 * Ye module `model.js`/`validation.js` ke bina hai (jaise `roles`) kyunki iska apna koi
 * collection nahi hai — ye doosre modules ke services ka **public projection** hai.
 *
 * Admin aur public routes alag hone ki wajah 02-ARCHITECTURE §10 me hai: public payload
 * ka shape alag hai aur usme kabhi koi admin-only field nahi jaana chahiye.
 *
 * Reads sab GET hain aur sach me read-only hain (R13). **Ek apwaad hai** —
 * `POST /api/public/enquiries`: wo state badalti hai, isliye POST hai. R13 method ka niyam
 * hai, path ka nahi.
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

/**
 * `GET /api/public/resolve?path=/packages/andaman` — poore public site ka ekmatra
 * entry point (D-09, R10).
 *
 * `by-path` ki jagah `resolve` isliye ki ek hi endpoint entry, redirect aur 404 teenon
 * ka jawab de — Next ka catch-all ek hi call me tay kar le ki render kya karna hai.
 *
 * Redirect pe **204 nahi, 200 + payload** jaata hai: HTTP redirect `apps/web` bhejta hai,
 * API nahi. API ka kaam batana hai, browser ko ghumana nahi — warna har server-side fetch
 * chup-chaap follow kar leta aur web ko pata hi na chalta ki 301 lagana tha.
 */
publicRoutes.get('/resolve', async (req, res, next) => {
  try {
    const path = typeof req.query.path === 'string' ? req.query.path : ''
    if (!path.startsWith('/')) throw badRequest('path query param zaroori hai')

    const result = await resolvePublicPath(path)
    if (!result) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } })

    res.json({ data: result })
  } catch (err) {
    next(err)
  }
})

/**
 * Enquiry submit — **bina auth ke**, apni rate limit ke saath (`forms/routes.js`).
 *
 * Yahan mount hone ki wajah ye hai ki bharne wala site ka visitor hai, admin nahi. Rok
 * teen jagah hai: honeypot, rate limit, aur service ka apna check (form active hai?,
 * required bhare hain?, koi anjaan key to nahi?).
 */
publicRoutes.use('/enquiries', publicEnquiryRoutes)

/** Packages ke globals — alag endpoint kyunki iska cache tag alag hai (`type:package`). */
publicRoutes.get('/package-defaults', async (_req, res, next) => {
  try {
    res.json({ data: { packageDefaults: await getPublicPackageDefaults() } })
  } catch (err) {
    next(err)
  }
})
