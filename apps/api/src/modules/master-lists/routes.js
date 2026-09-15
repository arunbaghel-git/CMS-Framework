import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import {
  addOnController,
  hotelController,
  reviewController,
  videoReviewController,
  transferController,
} from './controller.js'

/**
 * `/api/hotels`, `/api/add-ons`, `/api/transfers`, `/api/reviews` — admin side, sab authed.
 *
 * Chaaron ek hi module se aati hain (dekho `model.js`), par **routes chaar alag hain**:
 * client ke liye ye teen alag screens hain aur unki permissions bhi alag (`hotel.*`,
 * `addOn.*`, `transfer.*`). Ek saanjhi `masterList.*` permission rakhne ka matlab hota ki
 * unhe baad me alag karna poora RBAC retrofit ban jaata — spec 001 ka sabse mehnga kaam.
 *
 * **Read teenon pe `contributor` ke paas bhi hai** — bina uske package edit karte waqt
 * add-on aur hotel ke dropdown khaali rehte, aur wo failure "kuch nahi mila" jaisi dikhti
 * hai, permission jaisi nahi.
 *
 * **Delete permanent hai, isliye DELETE** — master list content nahi hai, uska trash
 * nahi hota (D-25 content pe lagta hai).
 */
function listRouter(controller, permissions) {
  const router = Router()

  router.get('/', requireAuth, requirePermission(permissions.read), controller.list)
  router.get('/:id', requireAuth, requirePermission(permissions.read), controller.get)
  router.post('/', requireAuth, requirePermission(permissions.create), controller.create)
  router.patch('/:id', requireAuth, requirePermission(permissions.update), controller.update)
  router.delete('/:id', requireAuth, requirePermission(permissions.remove), controller.remove)

  return router
}

export const hotelRoutes = listRouter(hotelController, {
  read: PERMISSION.HOTEL_READ,
  create: PERMISSION.HOTEL_CREATE,
  update: PERMISSION.HOTEL_UPDATE,
  remove: PERMISSION.HOTEL_DELETE,
})

export const addOnRoutes = listRouter(addOnController, {
  read: PERMISSION.ADD_ON_READ,
  create: PERMISSION.ADD_ON_CREATE,
  update: PERMISSION.ADD_ON_UPDATE,
  remove: PERMISSION.ADD_ON_DELETE,
})

export const transferRoutes = listRouter(transferController, {
  read: PERMISSION.TRANSFER_READ,
  create: PERMISSION.TRANSFER_CREATE,
  update: PERMISSION.TRANSFER_UPDATE,
  remove: PERMISSION.TRANSFER_DELETE,
})

export const reviewRoutes = listRouter(reviewController, {
  read: PERMISSION.REVIEW_READ,
  create: PERMISSION.REVIEW_CREATE,
  update: PERMISSION.REVIEW_UPDATE,
  remove: PERMISSION.REVIEW_DELETE,
})

/** Video reviews — wahi `review.*` permission (D-96 §13): client ke liye dono ek hi "Reviews" hain. */
export const videoReviewRoutes = listRouter(videoReviewController, {
  read: PERMISSION.REVIEW_READ,
  create: PERMISSION.REVIEW_CREATE,
  update: PERMISSION.REVIEW_UPDATE,
  remove: PERMISSION.REVIEW_DELETE,
})
