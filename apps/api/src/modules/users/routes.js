import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/me` — **apni** profile. Ye "dusron ko manage karna" se alag cheez hai
 * (architecture §8.3), isliye yahan `requirePermission()` nahi hai: har logged-in user
 * apna naam badal sakta hai, chahe uska role kuch bhi ho.
 */
export const meRoutes = Router()

meRoutes.get('/', requireAuth, controller.getMe)
meRoutes.patch('/', requireAuth, controller.updateMe)

/**
 * `/api/users` — dusron ko manage karna. Har route pe permission (spec 001).
 *
 * `user.delete` sirf admin ke paas hai — `entry.purge` aur `media.purge` wahi rule
 * follow karte hain. Editor user ko deactivate kar sakta hai par mita nahi sakta.
 *
 * Delete ke asli guards (admin protected, apna account nahi) **service me** hain —
 * unke liye document chahiye, jo middleware ke paas hota hi nahi.
 */
export const userRoutes = Router()

userRoutes.get('/', requireAuth, requirePermission(PERMISSION.USER_READ), controller.list)
userRoutes.get('/:id', requireAuth, requirePermission(PERMISSION.USER_READ), controller.getOne)

userRoutes.post('/', requireAuth, requirePermission(PERMISSION.USER_INVITE), controller.create)
userRoutes.patch('/:id', requireAuth, requirePermission(PERMISSION.USER_UPDATE), controller.update)

userRoutes.post(
  '/:id/deactivate',
  requireAuth,
  requirePermission(PERMISSION.USER_DEACTIVATE),
  controller.deactivate,
)

// DELETE hai, GET nahi — state badalne wala GET kabhi nahi (R13)
userRoutes.delete('/:id', requireAuth, requirePermission(PERMISSION.USER_DELETE), controller.remove)
