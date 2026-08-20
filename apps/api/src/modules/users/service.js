import { USER_STATUS, toPublicUser } from '@cms/shared'

import { notFound, unprocessable } from '../../core/errors.js'
import { hashPassword, revokeAllSessions } from '../auth/service.js'
import { getRolePermissions } from '../roles/service.js'
import { User } from './model.js'

/**
 * Users ka business logic — R1.
 *
 * Abhi sirf apni profile (`/api/me`). Users **manage** karne wale endpoints (list,
 * invite, deactivate) Users screens ke saath aayenge — tab tak yahan add mat karo
 * bina `requirePermission()` ke.
 */

/**
 * @param {string} userId
 * @param {{ name?: string, avatarMediaId?: string|null }} input
 */
export async function updateMe(userId, input) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: input },
    { new: true, runValidators: true },
  )
  if (!user) throw notFound('User nahi mila')

  const permissions = await getRolePermissions(user.role)
  return toPublicUser(user, permissions)
}

/**
 * Naya user banata hai. Password hash yahan hota hai — model hook me nahi, kyunki
 * `findOneAndUpdate` hooks skip kar deta hai aur ek din koi update path se password
 * set karega to wo **plain text me** DB me chala jaayega (R1).
 *
 * @param {{ name: string, email: string, role: string, password: string }} input
 * @param {{ mustChangePassword?: boolean, status?: string }} [options]
 */
export async function createUser(input, { mustChangePassword = false, status } = {}) {
  const existing = await User.findOne({ email: input.email }).lean()
  if (existing) throw unprocessable('Is email se ek user pehle se hai')

  const user = await User.create({
    name: input.name,
    email: input.email,
    role: input.role,
    passwordHash: await hashPassword(input.password),
    status: status ?? USER_STATUS.ACTIVE,
    mustChangePassword,
  })

  return toPublicUser(user)
}

/**
 * Deactivate — user hataya nahi jaata (uska content orphan ho jaata), sirf uske
 * login band hote hain. Chalu sessions bhi turant kaat diye jaate hain, warna
 * deactivate hone ke baad bhi wo 15 minute kaam karta rehta.
 */
export async function deactivateUser(userId) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { status: USER_STATUS.INACTIVE } },
    { new: true },
  )
  if (!user) throw notFound('User nahi mila')

  await revokeAllSessions(userId)
  return toPublicUser(user)
}

/**
 * Seed ka admin — **idempotent** (spec 004). Exist karta ho to chhoo ke nahi jaata,
 * warna `pnpm seed` dobara chalane se admin ka password reset ho jaata.
 *
 * @param {{ name: string, email: string, password: string }} input
 */
export async function ensureAdminUser(input) {
  const existing = await User.findOne({ email: input.email }).lean()
  if (existing) return { action: 'skipped', user: toPublicUser(existing) }

  const user = await createUser(
    { ...input, role: 'admin' },
    // Seed ka password `.env` me plain text me padha hai — pehle login pe badalna hi hai
    { mustChangePassword: true },
  )

  return { action: 'created', user }
}
