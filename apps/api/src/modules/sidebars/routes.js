import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/sidebars` — admin side, authed.
 *
 * Read aur write ki permissions alag hain, bilkul `menus` ki tarah: `author`/`contributor`
 * sidebars **padh** sakte hain — uske bina page edit karte waqt "Which sidebar" ka dropdown
 * khaali rehta, aur wo failure permission jaisi nahi "kuch bana hi nahi" jaisi dikhti — par
 * badal `editor` aur `admin` hi sakte hain.
 *
 * **Create, update aur delete teenon `sidebar.update` pe hain.** Alag `sidebar.delete`
 * jaan-boojh kar nahi banayi: delete yahan soft hai (R12), yaani wo ek update hi hai.
 *
 * ⚠️ **Koi public route yahan nahi hai, aur wo faisla hai.** Sidebar ke widgets page ke apne
 * payload me `resolve` ke saath jaate hain — alag public endpoint banane ka matlab hota har
 * page render pe ek aur round trip, us data ke liye jo usi `path:` tag ke saath aata-jaata
 * hai. Yahi D-83 wala bug dobara banata (Slice B me bhi isi wajah se alag endpoint nahi bana).
 */
export const sidebarRoutes = Router()

sidebarRoutes.get('/', requireAuth, requirePermission(PERMISSION.SIDEBAR_READ), controller.list)
sidebarRoutes.get('/:id', requireAuth, requirePermission(PERMISSION.SIDEBAR_READ), controller.get)
sidebarRoutes.post(
  '/',
  requireAuth,
  requirePermission(PERMISSION.SIDEBAR_UPDATE),
  controller.create,
)
sidebarRoutes.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.SIDEBAR_UPDATE),
  controller.update,
)
sidebarRoutes.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.SIDEBAR_UPDATE),
  controller.remove,
)
