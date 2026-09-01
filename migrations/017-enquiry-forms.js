/**
 * `forms` + `enquiries` — enquiry forms (client, 1 Sep; `admin-design-v2.html`).
 *
 * Collection ka shape 02-ARCHITECTURE §3 se:
 *
 *   forms      siteId, name, emailTo, afterSubmit, placement, status, fields[]
 *   enquiries  siteId, formId, formName, sourcePath, values, status
 *
 * Mongo schema enforcement model/service me hai. Migration ka kaam deploy-time indexes
 * banana hai, kyunki production me Mongoose `autoIndex` off rehta hai.
 *
 * Dono nayi collections hain — koi backfill nahi.
 */

import { ROLE_PERMISSIONS } from '@cms/shared'

export async function up({ db }) {
  const forms = db.collection('forms')
  const enquiries = db.collection('enquiries')

  /**
   * Admin ki list `updatedAt` ke ulte kram me chalti hai (haal ka form pehle), aur uspe
   * `status`/`placement` ke filter lagte hain.
   */
  await forms.createIndex(
    { siteId: 1, status: 1, updatedAt: -1 },
    { name: 'siteId_status_updated' },
  )

  /**
   * Public page ki query — `{ status: 'active', placement: 'packages' }`, phir sabse haal ka.
   *
   * **Ye har package page ke render pe chalti hai**, isliye index ka hona yahan sabse zyada
   * maayne rakhta hai: bina iske ek collection scan har page pe lagta.
   */
  await forms.createIndex(
    { siteId: 1, placement: 1, status: 1, updatedAt: -1 },
    { name: 'siteId_placement_status_updated' },
  )

  /**
   * Enquiries — form delete se pehle ginti (`countEnquiriesForForm`), aur aage inbox ki
   * list. Dono `formId` + waqt pe chalti hain.
   */
  await enquiries.createIndex(
    { siteId: 1, formId: 1, createdAt: -1 },
    { name: 'siteId_form_createdAt' },
  )

  /** Inbox ka default view — sab enquiries, nayi pehle. */
  await enquiries.createIndex({ siteId: 1, createdAt: -1 }, { name: 'siteId_createdAt' })

  /**
   * Built-in roles ki permissions dobara sync — wahi wajah jo migration 016 me likhi hai.
   *
   * `form.*` aaj code me juda hai, par `roles` documents ek baar seed hote hain. Migration
   * 004 chalu instance pe applied ho chuki hai, to naye permission strings ka koi raasta
   * bacha hi nahi tha — aur wo failure chup hai: menu item render nahi hota, koi error nahi
   * (`user.delete` pe yahi hua tha, D-34).
   */
  const roles = db.collection('roles')
  for (const [key, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await roles.updateOne({ key, isBuiltIn: true }, { $set: { permissions: [...permissions] } })
  }
}

export async function down({ db }) {
  // Index maujood na ho to ignore — down() idempotent rehna chahiye
  const drops = [
    ['forms', 'siteId_status_updated'],
    ['forms', 'siteId_placement_status_updated'],
    ['enquiries', 'siteId_form_createdAt'],
    ['enquiries', 'siteId_createdAt'],
  ]

  for (const [collection, index] of drops) {
    await db
      .collection(collection)
      .dropIndex(index)
      .catch(() => {})
  }
}
