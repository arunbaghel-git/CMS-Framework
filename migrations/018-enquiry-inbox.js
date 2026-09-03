/**
 * Enquiries inbox — All Enquiries · Enquiry Detail · Export CSV (client, 3 Sep).
 *
 * `enquiries` 1 Sep se bhar rahi thi par use dekhne ki koi screen nahi thi (D-72: client ne
 * "only Enquiry Forms" kaha tha). Inbox ke saath enquiry pe chaar cheezein judti hain:
 *
 *   status      ab enum hai (`ENQUIRY_STATUSES`) — pehle khula string tha
 *   notes[]     internal notes
 *   deletedAt   delete = trash (R12)
 *   searchText  `values` ka text ek jagah — search ke liye
 *
 * Purani enquiries me ye chaaron **hain hi nahi**, isliye backfill zaroori hai.
 */

import { ENQUIRY_STATUSES, ROLE_PERMISSIONS } from '@cms/shared'

export async function up({ db }) {
  const enquiries = db.collection('enquiries')

  /**
   * `status` — jo document is field ke bina hai, ya jisme koi anjaan value baithi hai, use
   * `new` pe le aao.
   *
   * Anjaan value ka case aaj nahi hai (service ne kabhi kuch aur likha hi nahi), par enum ab
   * model me laga hai: ek anjaan value wala document aage har `save()` pe fail karta, aur
   * wo failure list ke beechon-beech aati.
   */
  await enquiries.updateMany(
    { $or: [{ status: { $exists: false } }, { status: { $nin: [...ENQUIRY_STATUSES] } }] },
    { $set: { status: 'new' } },
  )

  await enquiries.updateMany({ notes: { $exists: false } }, { $set: { notes: [] } })
  await enquiries.updateMany({ deletedAt: { $exists: false } }, { $set: { deletedAt: null } })

  /**
   * `searchText` backfill.
   *
   * Model ka hook sirf `save()` pe chalta hai, aur ye purane documents kabhi dobara save
   * nahi honge — to unka search text yahin banana padega. Bina iske purani enquiries search
   * me **kabhi** nahi milti, aur wo failure poori tarah chup hoti: list bhari hui dikhti hai,
   * bas search khaali laut-ti hai.
   */
  const cursor = enquiries.find(
    { searchText: { $exists: false } },
    { projection: { formName: 1, sourcePath: 1, values: 1 } },
  )

  for await (const doc of cursor) {
    const parts = [doc.formName, doc.sourcePath]
    for (const value of Object.values(doc.values ?? {})) {
      if (value !== null && value !== undefined) parts.push(String(value))
    }

    await enquiries.updateOne(
      { _id: doc._id },
      { $set: { searchText: parts.filter(Boolean).join(' ').slice(0, 4000).toLowerCase() } },
    )
  }

  /**
   * Inbox ka default view — trash chhod kar, nayi pehle.
   *
   * ⚠️ 017 wala `siteId_createdAt` ab kaafi nahi hai: har read `deletedAt: null` pe chhanta
   * hai, aur wo key index me hai hi nahi.
   */
  await enquiries.createIndex(
    { siteId: 1, deletedAt: 1, createdAt: -1 },
    { name: 'siteId_deleted_createdAt' },
  )

  /** Status ke tabs aur unki ginti. */
  await enquiries.createIndex(
    { siteId: 1, deletedAt: 1, status: 1, createdAt: -1 },
    { name: 'siteId_deleted_status_createdAt' },
  )

  /**
   * Built-in roles ki permissions dobara sync — wahi wajah jo 016 aur 017 me likhi hai.
   *
   * Is baar naya naam **`submission.update`** hai (status badalna aur note likhna). Migration
   * 004 chalu instance pe applied ho chuki hai, to naye permission ka koi doosra raasta nahi
   * hai — aur bina iske Enquiries ka menu item **dikhega hi nahi**, koi error diye bina.
   */
  const roles = db.collection('roles')
  for (const [key, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await roles.updateOne({ key, isBuiltIn: true }, { $set: { permissions: [...permissions] } })
  }
}

export async function down({ db }) {
  const enquiries = db.collection('enquiries')

  for (const index of ['siteId_deleted_createdAt', 'siteId_deleted_status_createdAt']) {
    await enquiries.dropIndex(index).catch(() => {})
  }

  /**
   * Field wapas nahi hataye ja rahe.
   *
   * `deletedAt` girane ka matlab hai trash ki hui enquiries **wapas list me aa jaana** — aur
   * wo client ko chup-chaap galat data dikhata. Wahi soch jo migration 013 pe thi: down()
   * index gira sakta hai, data ka matlab nahi badal sakta.
   */
}
