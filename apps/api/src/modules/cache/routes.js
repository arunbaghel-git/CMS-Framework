import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/cache` — topbar ka ⟳ Cache (A-53, client 24 Sep).
 *
 * `roles` ki tarah apwaad: na `model.js` (koi collection nahi), na `validation.js` (body kuch nahi
 * leta). Business logic phir bhi `service.js` me (R1).
 *
 * **POST, GET nahi** — cache saaf karna state badalna hai (R13). GET hota to ek `<img src>` se hi
 * kisi logged-in user ka browser site ka cache udwa deta.
 */
export const cacheRoutes = Router()

cacheRoutes.post('/flush', requireAuth, requirePermission(PERMISSION.CACHE_FLUSH), controller.flush)
