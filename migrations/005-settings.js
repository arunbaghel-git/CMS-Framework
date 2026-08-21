import { DEFAULT_SITE_ID, defaultSettings } from '@cms/shared'

/**
 * `settings` collection — index + pehla document.
 *
 * **Do kaam ek saath, jaan-boojh kar.**
 *
 * Index isliye migration me hai ki `autoIndex` production me off rehta hai aur index
 * build deploy-time ka kaam hai (migration 001 dekho).
 *
 * Document isliye yahan hai ki **seed sirf naye instance pe chalti hai**. Chalu
 * instances pe settings kabhi banti hi nahi, aur admin ka Settings screen khaali khulta
 * — ya 404. Chalu instances tak pahunchne ka raasta `pnpm cms migrate` hi hai. Ye theek
 * wahi galti hai jo `ensureDefaultRoles()` ke saath ho chuki hai (D-36) — `user.delete`
 * permission kisi chalu instance tak pahunchi hi nahi thi.
 */

export async function up({ db }) {
  /**
   * `siteId` pe unique — yahi "ek instance, ek settings document" ko **sach me** enforce
   * karta hai. Iske bina do documents ban jaane pe `findOne()` "jo pehle mil jaaye"
   * lautata hai, aur admin ke save random taur pe gayab hone lagte hain.
   */
  await db
    .collection('settings')
    .createIndexes([{ key: { siteId: 1 }, name: 'siteId_unique', unique: true }])

  const existing = await db.collection('settings').findOne({ siteId: DEFAULT_SITE_ID })
  if (existing) return

  const now = new Date()
  await db
    .collection('settings')
    .insertOne({ ...defaultSettings(), createdAt: now, updatedAt: now })
}

export async function down({ db }) {
  // Index maujood na ho to ignore — down() idempotent rehna chahiye
  await db
    .collection('settings')
    .dropIndex('siteId_unique')
    .catch(() => {})

  /**
   * Document **jaan-boojh kar nahi hataya**.
   *
   * Rollback ka matlab "schema wapas le jao" hai, "client ka data uda do" nahi. Yahan
   * site ka naam, contact number aur social links pade hote hain — wo admin ne haath se
   * bhare hain. Index dobara ban jaata hai; ye nahi.
   */
}
