import { ROLE_PERMISSIONS } from '@cms/shared'

/**
 * Roles ka sync — naya `cache.flush` permission (topbar ka ⟳ Cache, client 24 Sep, A-53).
 *
 * Wahi wajah jo 004 aur 023 me likhi hai: `roles` ek baar seed hote hain, aur code me juda naya
 * permission chalu instance tak **sirf migration se** pahunchta hai. Bina iske button kisi ko
 * dikhta hi nahi — koi error nahi, bas "kuch na hona".
 *
 * Sirf `isBuiltIn: true` — custom roles (Phase 7) client ke chune hue hain.
 */

export async function up({ db }) {
  const roles = db.collection('roles')

  for (const [key, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await roles.updateOne({ key, isBuiltIn: true }, { $set: { permissions: [...permissions] } })
  }
}

/** Kuch nahi — permissions code se aati hain; rollback = purana code + ye sync dobara (004 dekho). */
export async function down() {}
