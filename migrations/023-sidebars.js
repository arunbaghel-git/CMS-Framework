/**
 * Sidebars — `sidebars` collection ke indexes aur roles ka sync (D-88, client 8 Sep).
 *
 * Client named sidebars banata hai (`Appearance ▸ Sidebar`), aur har page apne edit screen se
 * chunta hai ki kis taraf aur kaunsi. Widgets teen kism ke hain: Enquiry form · Talk to a
 * planner · Custom HTML.
 *
 * Is migration me **koi data nahi badalta** — collection nayi hai aur khaali hai.
 *
 * ⚠️ **Slice A–C me koi migration nahi lagi thi** (`tourPage` naya type tha aur
 * `ensureBuiltInContentTypes()` use khud bana deta hai). Yahan lagti hai kyunki do cheezein
 * seed se nahi aatin: nayi collection ke indexes, aur maujooda install pe roles ka sync.
 */

import { ROLE_PERMISSIONS } from '@cms/shared'

export async function up({ db }) {
  /**
   * ⚠️ **Naam `sidebars` hai — lowercase, wahi jo Mongoose banata hai.**
   *
   * A-18 theek isi ek baat se bana tha: migration 021 ne `importRuns` pe index banaye, service
   * `importruns` me likhti thi (Mongoose collection ka naam lowercase kar deta hai), aur **asli
   * data bina index ke** chalta raha. Kuch toota nahi — bas ek din list dheemi hoti aur wajah
   * samajh na aati. `model.js` me bhi `collection: 'sidebars'` pin kiya gaya hai, taaki naam ek
   * hi jagah se aaye.
   */
  const sidebars = db.collection('sidebars')

  /**
   * Admin ki list — site ke sidebars, haal ke pehle, trash chhod kar.
   *
   * Indexes yahan hain, `model.js` me nahi: production `autoIndex: false` pe chalti hai, to
   * schema me likha index wahan banta hi nahi.
   */
  await sidebars.createIndex(
    { siteId: 1, locale: 1, deletedAt: 1, updatedAt: -1 },
    { name: 'sidebar_list' },
  )

  /**
   * ⚠️ **Roles ka sync — is migration ka sabse chup-chaap zaroori hissa** (021 wali hi baat).
   *
   * `sidebar.read` / `sidebar.update` `permissions.js` me declared hain, par `roles` ke
   * documents sirf `pnpm seed` pe bharte hain aur wo maujooda install pe dobara nahi chalta.
   * Bina is block ke kisi role ke paas `sidebar.read` **pahunchta hi nahi** — yaani
   * `Appearance ▸ Sidebar` kisi ko **dikhta hi nahi**, aur page ka "Which sidebar" dropdown
   * khaali rehta. Koi error bhi nahi aata.
   *
   * ⚠️ Wo khaali dropdown theek wahi shakl hai jo 8 Sep ko package picker pe thi — request 400
   * de rahi thi aur screen pe sirf "koi package nahi" dikhta tha. **Guard ya permission ka na
   * hona kabhi error jaisa nahi dikhta, wo "kuch na hone" jaisa dikhta hai** (D-86).
   *
   * `isBuiltIn: true` custom roles ko chhota hai — unki permissions client ki chuni hui hain.
   */
  const roles = db.collection('roles')

  for (const [key, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await roles.updateOne({ key, isBuiltIn: true }, { $set: { permissions: [...permissions] } })
  }
}

export async function down({ db }) {
  await db.collection('sidebars').dropIndexes()

  /**
   * Permissions wapas nahi hataye jaate — wahi jo 016/017/018/021 me hai.
   *
   * Kaun sa permission is migration se pehle kis role pe tha, ye kahin likha nahi hai. Andaza
   * laga kar hataana kisi ka access chup-chaap chheen sakta hai, aur wo is collection ke
   * indexes girane se kahin zyada nuksaandeh hai.
   */
}
