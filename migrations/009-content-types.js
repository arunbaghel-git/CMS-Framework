/**
 * `contentTypes` + `revisions` ke indexes — D-46, spec 007 Slice 1.
 *
 * Collection ka shape 02-ARCHITECTURE §3 se:
 *
 *   contentTypes  siteId, key, label, labelPlural, icon, fields[], hasBuilder,
 *                 hierarchical, isBuiltIn, urlPattern, archiveBase, hasArchive, supports[]
 *   revisions     entryId, snapshot, createdBy, createdAt, label, kind
 *
 * `entries` ke indexes yahan **nahi** hain — wo migration 001 me pehle se hain. Ye wahi
 * "day 1 se reserve" wali soch thi (§3.1): collection tab bani hi nahi thi, par uske
 * indexes tabhi likh diye gaye the.
 *
 * Mongo schema enforcement model/service me hai. Migration ka kaam deploy-time indexes
 * banana hai, kyunki production me Mongoose `autoIndex` off rehta hai.
 */

export async function up({ db }) {
  const contentTypes = db.collection('contentTypes')
  const revisions = db.collection('revisions')

  await contentTypes.createIndexes([
    /**
     * Ek key ka ek hi content type. Ye lookup har entry write pe chalti hai (path
     * resolve karne ke liye), isliye ye equality index hot path pe hai.
     *
     * `locale` yahan jaan-boojh kar **nahi** hai — content type site ka structure hai,
     * uska content nahi. Hindi wali site pe bhi `package` type ek hi rehta hai; jo
     * translate hoti hai wo uski `label` hai, uski `key` nahi.
     */
    { key: { siteId: 1, key: 1 }, name: 'siteId_key_unique', unique: true },
  ])

  await revisions.createIndexes([
    /**
     * Ek entry ka revision history — naya sabse upar.
     *
     * `siteId` yahan nahi hai (02-ARCHITECTURE §3): revision apne parent entry se scope
     * hoti hai, aur `entryId` khud hi ek site ka hai. Wahi rule `refreshTokens` aur
     * `submissions` pe bhi lagta hai.
     */
    { key: { entryId: 1, createdAt: -1 }, name: 'entryId_createdAt' },
  ])
}

export async function down({ db }) {
  // Index maujood na ho to ignore — down() idempotent rehna chahiye
  await db
    .collection('contentTypes')
    .dropIndex('siteId_key_unique')
    .catch(() => {})
  await db
    .collection('revisions')
    .dropIndex('entryId_createdAt')
    .catch(() => {})
}
