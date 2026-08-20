import { ROLE_PERMISSIONS } from '@cms/shared'

/**
 * Built-in roles ki permissions code ke saath sync karo.
 *
 * **Kyun ye migration hai:** `roles` documents ek baar seed hote hain aur uske baad
 * chhue nahi jaate the. Matlab code me joda gaya naya permission string kisi chalu
 * instance tak kabhi pahunchta hi nahi tha — aur wo failure **chup-chaap** hoti hai:
 * button render nahi hota, koi error nahi aata, aur dhoondhne pe lagta hai ki UI ka
 * bug hai. `user.delete` (D-34) ke saath theek yahi hua.
 *
 * `ensureDefaultRoles()` ab bhi yahi sync karta hai, par wo `pnpm seed` pe chalta hai
 * aur seed sirf naye instance pe chalta hai. Deploy pe `pnpm cms migrate` chalti hai,
 * isliye chalu instances tak pahunchne ka raasta yahi hai.
 *
 * Sirf `isBuiltIn: true` roles — custom roles (Phase 7) ki permissions admin ne set ki
 * hain, unhe ye haath nahi lagata.
 */

export async function up({ db }) {
  const roles = db.collection('roles')

  for (const [key, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await roles.updateOne({ key, isBuiltIn: true }, { $set: { permissions: [...permissions] } })
  }
}

export async function down() {
  /**
   * Kuch nahi.
   *
   * Purani permission list wapas laane ka matlab hota users ka access chheenna — aur
   * wo list kahin store bhi nahi hai. Permissions code se aati hain; rollback ka sahi
   * tareeka hai code ko purane version pe le jaana aur ye migration dobara chalana.
   */
}
