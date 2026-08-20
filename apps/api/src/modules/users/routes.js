import { Router } from 'express'

import { requireAuth } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/me` — **apni** profile. Ye "dusron ko manage karna" se alag cheez hai
 * (architecture §8.3), isliye yahan `requirePermission()` nahi hai: har logged-in
 * user apna naam badal sakta hai, chahe uska role kuch bhi ho.
 *
 * Users **management** ke routes (`/api/users`) Users screens ke saath aayenge —
 * unme se har ek pe `requirePermission('user.*')` lagega.
 */
export const meRoutes = Router()

meRoutes.get('/', requireAuth, controller.getMe)
meRoutes.patch('/', requireAuth, controller.updateMe)
