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

/**
 * SEO ka export (D-107).
 *
 * ⚠️ **`tools.export` naya permission nahi hai** — wo `permissions.js` me 19 Aug se declared
 * pada tha aur aaj tak kisi route ne use use hi nahi kiya, bilkul `tools.import` ki tarah.
 * **Ye chauthi baar hai** ki naye kaam ki cheez pehle se rakhi mili (`.float` D-102,
 * `.sidetab` A-34, `settings.scripts.update` D-106). Naya gadhne se pehle dhoondho.
 *
 * ⚠️ Ye route `/:id` se **pehle** hona chahiye, warna `/export/seo` ko wo `id = "export"`
 * samajh kar 404 de dega. Wahi jaal D-103 me `/enquiries/popup` pe laga tha.
 *
 * GET yahan theek hai — ye sirf padhta hai, kuch badalta nahi (R13).
 */
bulkImportRoutes.get(
  '/export/seo',
  requireAuth,
  requirePermission(PERMISSION.TOOLS_EXPORT),
  bulkImportController.exportSeo,
)

bulkImportRoutes.get(
  '/:id',
  requireAuth,
  requirePermission(PERMISSION.TOOLS_IMPORT),
  bulkImportController.get,
)
