import { suggestUsernameFromEmail } from '@cms/shared'

/**
 * `users.username` — naya field + unique index (D-34).
 *
 * **Order maayne rakhta hai:** pehle backfill, phir unique index. Ulta karne pe
 * migration un instances pe fail hogi jinke paas pehle se users hain (sabka
 * `username` `null` hota, aur `null` bhi unique index me duplicate ginta hai).
 *
 * Backfill wahi `suggestUsernameFromEmail()` use karta hai jo admin form use karta
 * hai — taaki purane user ka username wahi bane jo aaj naye ko suggest hota.
 */

/** Cursor + batch — bade `users` collection pe poora `updateMany` memory kha jaata hai. */
const BATCH_SIZE = 100

export async function up({ db }) {
  const users = db.collection('users')

  // Is instance me pehle se kaunse username hain — dobara chalne pe inhe respect karna hai
  const taken = new Set(
    await users.distinct('username', { username: { $type: 'string', $ne: '' } }),
  )

  const cursor = users.find({ username: { $in: [null, ''] } }, { projection: { email: 1 } })

  let batch = []

  async function flush() {
    if (batch.length === 0) return
    await users.bulkWrite(batch, { ordered: false })
    batch = []
  }

  while (await cursor.hasNext()) {
    const doc = await cursor.next()

    // Do users ka email prefix same ho sakta hai (arun@a.com, arun@b.com) — suffix lagao
    const base = suggestUsernameFromEmail(doc.email)
    let username = base
    let n = 2
    while (taken.has(username)) username = `${base}${n++}`
    taken.add(username)

    batch.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { username } } } })
    if (batch.length >= BATCH_SIZE) await flush()
  }

  await flush()

  await users.createIndexes([{ key: { username: 1 }, name: 'username_unique', unique: true }])
}

export async function down({ db }) {
  const users = db.collection('users')

  // Index maujood na ho to ignore — down() idempotent rehna chahiye
  await users.dropIndex('username_unique').catch(() => {})
  await users.updateMany({}, { $unset: { username: '' } })
}
