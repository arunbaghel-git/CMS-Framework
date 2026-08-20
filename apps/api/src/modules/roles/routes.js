import { Router } from 'express'
import { PERMISSION } from '@cms/shared'

import { requireAuth, requirePermission } from '../../middleware/auth.js'
import * as controller from './controller.js'

/**
 * `/api/roles` — abhi sirf padhne ke liye (user form ka role dropdown).
 *
 * Role ki permissions **edit** karna Phase 7 ka custom-role builder hai. Tab tak
 * koi write route nahi — permissions badalne ka raasta khula chhodna RBAC ko
 * bypass karne ka sabse seedha tareeka hai.
 */
export const roleRoutes = Router()

roleRoutes.get('/', requireAuth, requirePermission(PERMISSION.ROLE_READ), controller.list)
