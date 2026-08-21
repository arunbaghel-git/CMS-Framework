import { ROLE, USER_STATUS, suggestUsernameFromEmail, toPublicUser } from '@cms/shared'

import { forbidden, notFound, unprocessable } from '../../core/errors.js'
import { hashPassword, revokeAllSessions } from '../auth/service.js'
import { Role } from '../roles/model.js'
import { getRolePermissions } from '../roles/service.js'
import { User } from './model.js'

/**
 * Users ka business logic — R1.
 *
 * Delete ke teen guard yahan hain, controller me nahi: permission middleware sirf
 * "kya ye kaam kar sakte ho" dekhta hai, "kis PE kar sakte ho" nahi — uske liye
 * document chahiye, jo sirf service ke paas hota hai.
 */

/**
 * Role ka wajood check karta hai — **`roles` collection se**, kisi hardcoded list se
 * nahi.
 *
 * Zod sirf shape dekh sakta hai (camelCase hai ya nahi), wajood nahi. Bina is check ke
 * `role: "wizard"` wala user ban jaata tha: create 201 deta, par uski permissions
 * hamesha khaali rehti aur wo har screen pe 403 khaata — koi error kahin nahi dikhta.
 *
 * Enum se check karna galat hota: Phase 7 me custom roles banenge, aur wo enum me nahi
 * honge.
 */
async function assertRoleExists(key) {
  if (!(await Role.exists({ key }))) {
    throw unprocessable(`No such role: ${key}`)
  }
}

/** Ek se zyada jagah use hota hai, isliye ek jagah. */
async function countAdmins(excludeId) {
  const filter = { role: ROLE.ADMIN }
  if (excludeId) filter._id = { $ne: excludeId }
  return User.countDocuments(filter)
}

/**
 * Server-side pagination — R14, day 1 se.
 *
 * @param {object} query `listUsersQuerySchema` se paas hua hua
 */
export async function listUsers(query) {
  const { page, limit, role, status, search, sort, order } = query

  const filter = {}
  if (role) filter.role = role
  if (status) filter.status = status

  if (search) {
    // Regex escape — warna user ka `.` ya `(` query tod dega ya ReDoS bana dega
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rx = new RegExp(safe, 'i')
    filter.$or = [{ name: rx }, { email: rx }, { username: rx }]
  }

  const [docs, total, roleCounts] = await Promise.all([
    User.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
    /**
     * Filter tabs ke counts (`All (9) · Administrator (2) · …`).
     *
     * Ye `filter` se **bahar** hain — jaan-boojh kar. Tabs hamesha poore totals
     * dikhate hain, warna "Editor" tab pe click karte hi baaki tabs 0 ho jaate.
     */
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
  ])

  const counts = { all: 0 }
  for (const row of roleCounts) {
    counts[row._id] = row.count
    counts.all += row.count
  }

  return {
    data: docs.map((d) => toPublicUser(d)),
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1, counts },
  }
}

export async function getUser(id) {
  const user = await User.findById(id).lean()
  if (!user) throw notFound('User not found')

  return toPublicUser(user, await getRolePermissions(user.role))
}

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
  if (!user) throw notFound('User not found')

  return toPublicUser(user, await getRolePermissions(user.role))
}

/**
 * Username khaali chhoda gaya ho to email se bana deta hai, aur takraav pe number
 * lagata hai. Wahi logic jo migration ke backfill me hai.
 */
async function resolveUsername(requested, email) {
  const base = requested || suggestUsernameFromEmail(email)

  let username = base
  let n = 2

  while (await User.exists({ username })) {
    // Admin ne khud username diya tha to chupchaap badalna galat hai — usse batao
    if (requested) throw unprocessable(`Username "${requested}" is already taken`)
    username = `${base}${n++}`
  }

  return username
}

/**
 * Naya user. Password hash **yahan** hota hai, model hook me nahi — `findOneAndUpdate`
 * hooks skip kar deta hai, aur ek din koi update path se password set karega to wo
 * plain text me DB me chala jaayega (R1).
 *
 * @param {{ username?: string, name: string, email: string, role: string, password: string }} input
 * @param {{ mustChangePassword?: boolean, status?: string }} [options]
 */
export async function createUser(input, { mustChangePassword = false, status } = {}) {
  await assertRoleExists(input.role)

  if (await User.exists({ email: input.email })) {
    throw unprocessable('A user with this email already exists')
  }

  const user = await User.create({
    username: await resolveUsername(input.username, input.email),
    name: input.name,
    email: input.email,
    role: input.role,
    passwordHash: await hashPassword(input.password),
    status: status ?? USER_STATUS.ACTIVE,
    /**
     * Default `false` (D-35): admin jo password deta hai, user bas wahi use karta hai.
     *
     * Sirf **seed** ka admin `true` ke saath banta hai — uska password `.env` file me
     * plain text me padha hota hai, isliye wahan badalna zaroori hai.
     */
    mustChangePassword,
  })

  return toPublicUser(user)
}

/**
 * @param {string} userId
 * Password bhi yahin se set hota hai — **user khud apna password nahi badal sakta**
 * (D-35), isliye bhoola hua password reset karne ka ekmatra raasta yahi hai.
 *
 * @param {{ name?: string, role?: string, status?: string, password?: string, avatarMediaId?: string|null }} input
 * @param {any} actor jo ye kaam kar raha hai
 */
export async function updateUser(userId, { password, ...input }, actor) {
  const user = await User.findById(userId)
  if (!user) throw notFound('User not found')

  if (input.role) await assertRoleExists(input.role)

  /**
   * Aakhri admin ka role nahi badal sakta.
   *
   * Iske bina site ko lock kar dena ek dropdown ki doori pe hai: aakhri admin khud ko
   * Editor bana leta hai, aur ab koi bhi users, settings ya roles chhoo nahi sakta.
   * Wapas laane ka koi UI raasta nahi bachta — sirf DB me haath daal ke.
   */
  if (user.role === ROLE.ADMIN && input.role && input.role !== ROLE.ADMIN) {
    if ((await countAdmins(user._id)) === 0) {
      throw unprocessable('This is the last administrator — their role cannot be changed')
    }
  }

  // Deactivate hote hi login band hona chahiye, 15 min baad nahi
  const deactivating = input.status === USER_STATUS.INACTIVE && user.status !== USER_STATUS.INACTIVE

  if (deactivating && String(user._id) === String(actor?._id)) {
    throw unprocessable('You cannot deactivate your own account')
  }

  Object.assign(user, input)

  if (password) {
    user.passwordHash = await hashPassword(password)
    // Password badla hai to purane sessions zinda rakhna galat hai — wo purane
    // password ki umeed pe khule the
    user.mustChangePassword = false
  }

  await user.save()

  if (password || deactivating) await revokeAllSessions(userId)

  return toPublicUser(user)
}

/**
 * Deactivate — login band, record aur content bacha hua.
 *
 * Administrator ko hataane ka **yahi** raasta hai, kyunki delete unpe chalta hi nahi
 * (D-34).
 */
export async function deactivateUser(userId, actor) {
  return updateUser(userId, { status: USER_STATUS.INACTIVE }, actor)
}

/**
 * Us user ka content kisi aur ke naam karta hai.
 *
 * **Abhi kuch nahi karta** — `entries` collection Phase 1 me banega. Ye jagah abhi
 * isliye hai ki delete ka poora flow (confirm screen, dropdown, API contract) aaj ban
 * jaaye, aur Phase 1 me sirf yahi function bharna pade — teen jagah dobara chhune ki
 * zaroorat na ho (D-30).
 *
 * @returns {Promise<{ entries: number }>}
 */
export async function reassignContent(_fromUserId, _toUserId) {
  return { entries: 0 }
}

/**
 * Permanent delete (D-34). Trash nahi — user wapas nahi aata.
 *
 * @param {string} userId
 * @param {{ reassignToId?: string }} options
 * @param {any} actor
 */
export async function deleteUser(userId, { reassignToId } = {}, actor) {
  const user = await User.findById(userId)
  if (!user) throw notFound('User not found')

  // 1. Apna hi account nahi
  if (String(user._id) === String(actor?._id)) {
    throw forbidden('You cannot delete your own account')
  }

  /**
   * 2. Administrator kabhi delete nahi hota (D-34).
   *
   * Demote karke delete karne ka raasta bhi band hai — `updateUser` aakhri admin ka
   * role badalne nahi deta. Ek se zyada admin hon to demote ho sakta hai; wo
   * jaan-boojh kar allowed hai, kyunki tab bhi site ke paas ek admin bacha rehta hai.
   */
  if (user.role === ROLE.ADMIN) {
    throw forbidden('An administrator cannot be deleted. Deactivate them instead.')
  }

  let reassigned = { entries: 0 }

  if (reassignToId) {
    if (String(reassignToId) === String(userId)) {
      throw unprocessable('You cannot reassign content to the user being deleted')
    }

    const target = await User.findById(reassignToId).lean()
    if (!target) throw unprocessable('The user you want to reassign content to was not found')

    reassigned = await reassignContent(userId, reassignToId)
  }

  // Uske saare sessions pehle band — delete ke baad user object hi nahi bachega
  await revokeAllSessions(userId)
  await User.deleteOne({ _id: userId })

  return { deleted: true, reassigned }
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

  // Seed ka password `.env` me plain text me padha hai — pehle login pe badalna hi hai
  const user = await createUser({ ...input, role: ROLE.ADMIN }, { mustChangePassword: true })

  return { action: 'created', user }
}
