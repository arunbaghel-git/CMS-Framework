import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAnyPermission, requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/entries` — admin side, sab authed.
 *
 * **`.own` wale raaston pe `requireAnyPermission` hai, `requirePermission` nahi.**
 * Middleware sirf "andar aane do" tay karta hai; asli faisla ("ye tumhara hi item hai?")
 * service me hota hai, kyunki `authorId` compare karne ke liye document chahiye jo
 * middleware ke paas hai hi nahi (spec 001).
 *
 * **Har state-changing raasta POST hai, GET kabhi nahi** (R13). `SameSite=Lax` top-level
 * GET navigation pe cookie bhejta hai — yaani ek state-changing GET seedha CSRF-able hai.
 * Isiliye `/publish`, `/trash`, `/restore` sab POST hain, chahe body khaali ho.
 */
export const entryRoutes = Router()

entryRoutes.get('/', requireAuth, requirePermission(PERMISSION.ENTRY_READ), controller.list)

/**
 * `/counts` `/:id` se **pehle** hai — warna Express `counts` ko ek entry id ki tarah
 * padhta aur har list screen 404 khaati.
 */
entryRoutes.get('/counts', requireAuth, requirePermission(PERMISSION.ENTRY_READ), controller.counts)

/** Dashboard ke cards (A-54) — wahi pehra, `/:id` se pehle. */
entryRoutes.get('/stats', requireAuth, requirePermission(PERMISSION.ENTRY_READ), controller.stats)

/**
 * Revisions ki list `/:id` se **pehle** hai — warna Express `/:id` ko pehle match kar
 * leta aur `revisions` ek entry id ki tarah padha jaata.
 */
entryRoutes.get(
  '/:id/revisions',
  requireAuth,
  requirePermission(PERMISSION.ENTRY_REVISION_READ),
  controller.listRevisions,
)

entryRoutes.get('/:id', requireAuth, requirePermission(PERMISSION.ENTRY_READ), controller.get)

entryRoutes.post('/', requireAuth, requirePermission(PERMISSION.ENTRY_CREATE), controller.create)

/**
 * Bulk — `/:id` wale raaston se **pehle**, warna `bulk` ek id ban jaata hai.
 *
 * Middleware yahan sabse dheeli permission maangta hai (`entry.update` **ya** uska
 * `.own`), aur asli faisla har row pe service me hota hai — trash wali rows pe
 * `entry.delete`, restore wali pe `entry.restore`. Bulk permission ka shortcut nahi hai.
 */
entryRoutes.post(
  '/bulk',
  requireAuth,
  requireAnyPermission(PERMISSION.ENTRY_UPDATE, PERMISSION.ENTRY_UPDATE_OWN),
  controller.bulk,
)

entryRoutes.patch(
  '/:id',
  requireAuth,
  requireAnyPermission(PERMISSION.ENTRY_UPDATE, PERMISSION.ENTRY_UPDATE_OWN),
  controller.update,
)

entryRoutes.post(
  '/:id/publish',
  requireAuth,
  requireAnyPermission(PERMISSION.ENTRY_PUBLISH, PERMISSION.ENTRY_PUBLISH_OWN),
  controller.publish,
)

/** Unpublish ka koi `.own` variant nahi hai — jo live hai wo poori site ki zimmedari hai. */
entryRoutes.post(
  '/:id/unpublish',
  requireAuth,
  requirePermission(PERMISSION.ENTRY_UNPUBLISH),
  controller.unpublish,
)

entryRoutes.post(
  '/:id/submit-review',
  requireAuth,
  requirePermission(PERMISSION.ENTRY_SUBMIT_REVIEW),
  controller.submitReview,
)

entryRoutes.post(
  '/:id/duplicate',
  requireAuth,
  requirePermission(PERMISSION.ENTRY_DUPLICATE),
  controller.duplicate,
)

entryRoutes.post(
  '/:id/trash',
  requireAuth,
  requireAnyPermission(PERMISSION.ENTRY_DELETE, PERMISSION.ENTRY_DELETE_OWN),
  controller.trash,
)

entryRoutes.post(
  '/:id/restore',
  requireAuth,
  requirePermission(PERMISSION.ENTRY_RESTORE),
  controller.restore,
)

entryRoutes.post(
  '/:id/revisions/:revisionId/restore',
  requireAuth,
  requirePermission(PERMISSION.ENTRY_REVISION_RESTORE),
  controller.restoreRevision,
)

/**
 * Permanent delete — `entry.purge`, jo sirf admin ke paas hai (D-26, spec 001).
 *
 * DELETE isliye ki ye sach me mit-ta hai; trash wala raasta POST `/trash` hai. Do alag
 * verb do alag kaam ke liye — R12 ka "delete = trash" isi jodi se enforce hota hai.
 */
entryRoutes.delete('/:id', requireAuth, requirePermission(PERMISSION.ENTRY_PURGE), controller.purge)
