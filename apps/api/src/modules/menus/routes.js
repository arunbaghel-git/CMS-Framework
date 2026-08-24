import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/menus` aur `/api/menu-locations` — admin side, dono authed.
 *
 * Read aur write ki permissions alag hain (spec 001): `author`/`contributor` menu padh
 * sakte hain — uske bina wo link banate waqt dekh hi nahi paate ki menu me kya hai — par
 * badal `editor` aur `admin` hi sakte hain.
 *
 * **Create, update aur delete teenon `menu.update` pe hain.** Alag `menu.delete` jaan-boojh
 * kar nahi banayi: delete yahan soft hai (R12), yaani wo ek update hi hai. `entry.purge`
 * wali admin-only baat wahan lagti hai jahan data sach me mit-ta hai.
 */
export const menuRoutes = Router()

menuRoutes.get('/', requireAuth, requirePermission(PERMISSION.MENU_READ), controller.list)
menuRoutes.get('/:id', requireAuth, requirePermission(PERMISSION.MENU_READ), controller.get)
menuRoutes.post('/', requireAuth, requirePermission(PERMISSION.MENU_UPDATE), controller.create)
menuRoutes.patch('/:id', requireAuth, requirePermission(PERMISSION.MENU_UPDATE), controller.update)
menuRoutes.delete('/:id', requireAuth, requirePermission(PERMISSION.MENU_UPDATE), controller.remove)

export const menuLocationRoutes = Router()

menuLocationRoutes.get(
  '/',
  requireAuth,
  requirePermission(PERMISSION.MENU_READ),
  controller.getLocations,
)

// PUT hai — poora set ek saath likhta hai, partial patch nahi (R13: state-changing GET nahi)
menuLocationRoutes.put(
  '/',
  requireAuth,
  requirePermission(PERMISSION.MENU_UPDATE),
  controller.setLocations,
)
