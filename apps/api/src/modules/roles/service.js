import { ROLE_PERMISSIONS } from '@cms/shared'

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
 * @param {{ force?: boolean }} [options] `force` existing roles ki permissions bhi
 *   reset kar deta hai — custom changes chale jaayenge.
 */
export async function ensureDefaultRoles({ force = false } = {}) {
  const labels = {
    admin: 'Administrator',
    editor: 'Editor',
    author: 'Author',
    contributor: 'Contributor',
    salesAgent: 'Sales Agent',
  }

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

    if (existing && !force) {
      results.push({ key, action: 'skipped' })
      continue
    }

    if (existing) {
      existing.permissions = [...permissions]
      existing.label = labels[key] ?? key
      existing.description = descriptions[key] ?? ''
      await existing.save()
      results.push({ key, action: 'updated' })
      continue
    }

    await Role.create({
      key,
      label: labels[key] ?? key,
      description: descriptions[key] ?? '',
      permissions: [...permissions],
      isBuiltIn: true,
    })
    results.push({ key, action: 'created' })
  }

  invalidateRoleCache()
  return results
}
