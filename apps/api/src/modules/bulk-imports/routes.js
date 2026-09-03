import { PERMISSION } from '@cms/shared'
import { Router } from 'express'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import { bulkImportController } from './controller.js'

/**
 * Bulk Upload ke routes (D-81).
 *
 * ⚠️ `tools.import` **naya permission nahi hai** — wo `permissions.js` me pehle se declared tha
 * (`TOOLS_IMPORT`), bas aaj tak kisi route ne use use hi nahi kiya. Naya gadhne ki zaroorat
 * nahi thi; us file ka apna niyam bhi yahi kehta hai ki "aage sirf ADD karo".
 *
 * ⚠️ Import shuru karna **POST** hai, GET nahi — wo state badalta hai (R13/rule 10). Ek GET
 * pe wo har refresh, har prefetch aur har crawler pe chal jaata.
 */
export const bulkImportRoutes = Router()

bulkImportRoutes.post(
  '/',
  requireAuth,
  requirePermission(PERMISSION.TOOLS_IMPORT),
  bulkImportController.start,
)

bulkImportRoutes.get(
  '/',
  requireAuth,
  requirePermission(PERMISSION.TOOLS_IMPORT),
  bulkImportController.list,
)

bulkImportRoutes.get(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.TOOLS_IMPORT),
  bulkImportController.get,
)
