/**
 * `redirects` collection ke indexes — A-6, D-49.
 *
 * Collection ka shape 02-ARCHITECTURE §3 se:
 *
 *   redirects  siteId, locale, from, to, statusCode(301|302), hits, isAuto
 *
 * Ye collection Phase 4 (SEO) ki hai, par uska **auto wala hissa** Slice 3 me aa gaya:
 * slug badalne pe purana URL zinda rehna chahiye. Cascade Slice 1 me ban chuka tha; bina
 * redirect ke wo aadha kaam tha.
 */

export async function up({ db }) {
  const redirects = db.collection('redirects')

  await redirects.createIndexes([
    /**
     * Ek purane path pe ek hi redirect. Public resolve isi equality query pe chalegi
     * (Phase 3), isliye ye hot path pe hai.
     *
     * **`locale` uniqueness ka hissa hai.** `02-ARCHITECTURE` §3.3 pehle `{siteId, from}`
     * likhta tha — wo bilkul wahi galti ka agla roop hota jo menus pe hui thi aur D-43 me
     * theek karni padi. Test wahi hai jo D-48 §3 me likha hai: jahan unique index hai,
     * wahan `locale` day 1 se.
     */
    { key: { siteId: 1, locale: 1, from: 1 }, name: 'siteId_locale_from_unique', unique: true },

    /**
     * Chain flatten (`to` pe update) aur entry purge (`to` pe delete) dono isi pe chalte
     * hain — dono har path change pe chalti hain.
     */
    { key: { siteId: 1, locale: 1, to: 1 }, name: 'siteId_locale_to' },
  ])
}

export async function down({ db }) {
  // Index maujood na ho to ignore — down() idempotent rehna chahiye
  for (const name of ['siteId_locale_from_unique', 'siteId_locale_to']) {
    await db
      .collection('redirects')
      .dropIndex(name)
      .catch(() => {})
  }
}
