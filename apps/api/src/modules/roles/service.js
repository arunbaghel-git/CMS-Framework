import { ROLE_LABEL, ROLE_PERMISSIONS } from '@cms/shared'

import { Role } from './model.js'

/**
 * Role → permissions. Source of truth `roles` collection hai (spec 001), shared ka
 * `ROLE_PERMISSIONS` sirf seed ka default hai.
 */

/**
 * Chhota in-process cache.
 *
 * Permissions **har authenticated request pe** chahiye. Bina cache ke har request pe
 * ek extra query lagti, aur roles saal me shayad ek baar badalte hain. TTL isliye hai
 * ki agar kabhi cache invalidate karna bhool jaayein to system apne aap theek ho jaaye
 * — chup-chaap purani permissions pe atka na rahe.
 */
const CACHE_TTL_MS = 60_000
/** @type {Map<string, { permissions: string[], expiresAt: number }>} */
const cache = new Map()

/**
 * @param {string} key role key
 * @returns {Promise<string[]>}
 */
export async function getRolePermissions(key) {
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.permissions

  const role = await Role.findOne({ key }).lean()

  /**
   * Role DB me nahi mila to **koi permission nahi** — shared ke default pe fallback
   * karna galat hoga. Admin ne agar jaan-boojh kar role ki permissions kaat di hain
   * to code ka default use overwrite nahi karna chahiye.
   */
  const permissions = role?.permissions ?? []

  cache.set(key, { permissions, expiresAt: Date.now() + CACHE_TTL_MS })
  return permissions
}

/** Role badalne ke baad turant asar ke liye. TTL akela kaafi nahi — 60s lamba hai. */
export function invalidateRoleCache(key) {
  if (key) cache.delete(key)
  else cache.clear()
}

export async function listRoles() {
  return Role.find().sort({ isBuiltIn: -1, label: 1 }).lean()
}

/**
 * Default roles banata hai — **idempotent** (spec 004). Dobara chale to duplicate
 * nahi banta.
 *
 * **Built-in roles ki permissions hamesha sync hoti hain**, sirf `force` pe nahi.
 *
 * Kyun: pehle existing role poora skip ho jaata tha. Nateeja ye tha ki code me joda
 * gaya naya permission string kisi chalu instance tak pahunchta hi nahi — aur wo
 * failure bilkul chup-chaap hoti hai. Button render nahi hota, koi error nahi aata,
 * aur dhoondhne pe lagta hai ki UI ka bug hai. `user.delete` ke saath theek yahi hua.
 *
 * Built-in roles **code-owned** hain. Custom roles (Phase 7, `isBuiltIn: false`) ko
 * ye haath nahi lagata.
 *
 * @param {{ force?: boolean }} [options] `force` label aur description bhi reset karta
 *   hai — permissions to waise bhi hamesha sync hoti hain.
 */
export async function ensureDefaultRoles({ force = false } = {}) {
  const descriptions = {
    admin: 'Sab kuch — settings, users aur permanent delete',
    editor: 'Saara content publish kar sakta hai. Trash me daal sakta hai, mita nahi sakta',
    author: 'Apna content likhta aur publish karta hai',
    contributor: 'Apna content likhta hai, publish ke liye bhejta hai',
    salesAgent: 'Enquiries handle karta hai, content nahi',
  }

  const results = []

  for (const [key, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const existing = await Role.findOne({ key })

    if (existing) {
      // Custom role (Phase 7) — uski permissions admin ne set ki hain, chhoona nahi
      if (!existing.isBuiltIn && !force) {
        results.push({ key, action: 'skipped' })
        continue
      }

      const added = permissions.filter((p) => !existing.permissions.includes(p))
      const removed = existing.permissions.filter((p) => !permissions.includes(p))
      const changed = added.length > 0 || removed.length > 0

      if (!changed && !force) {
        results.push({ key, action: 'up-to-date' })
        continue
      }

      existing.permissions = [...permissions]
      if (force) {
        existing.label = ROLE_LABEL[key] ?? key
        existing.description = descriptions[key] ?? ''
      }
      await existing.save()
      results.push({ key, action: 'synced', added, removed })
      continue
    }

    await Role.create({
      key,
      label: ROLE_LABEL[key] ?? key,
      description: descriptions[key] ?? '',
      permissions: [...permissions],
      isBuiltIn: true,
    })
    results.push({ key, action: 'created' })
  }

  invalidateRoleCache()
  return results
}
