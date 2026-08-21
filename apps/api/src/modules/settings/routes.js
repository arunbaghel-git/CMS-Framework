import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/settings` — ek hi document, isliye koi `:id` nahi.
 *
 * Read aur update ki permissions **alag** hain: `editor` settings padh sakta hai (uske
 * bina wo date format ya site title jaise cheezein dekh hi nahi paata) par badal nahi
 * sakta (spec 001).
 *
 * `settings.scripts.update` yahan **nahi** hai — wo alag permission hai kyunki
 * `<script>` inject karna role escalation hai, settings field nahi. Wo Scripts screen
 * ke saath aayegi (Phase 4).
 */
export const settingsRoutes = Router()

settingsRoutes.get('/', requireAuth, requirePermission(PERMISSION.SETTINGS_READ), controller.get)

// PATCH hai, POST nahi — partial update hi asli behaviour hai
settingsRoutes.patch(
  '/',
  requireAuth,
  requirePermission(PERMISSION.SETTINGS_UPDATE),
  controller.update,
)
