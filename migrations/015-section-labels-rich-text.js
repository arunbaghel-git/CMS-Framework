/**
 * `packageDefaults.sectionLabels[*].description` — plain string se **TipTap doc** (D-69).
 *
 * Client ne section descriptions me content likhna shuru kiya aur seedhi baat kahi: textarea
 * me bold, heading ya list ban hi nahi sakti. Ab wahan wahi editor hai jo Overview pe hai.
 *
 * **Ye migration isliye zaroori hai ki likha hua text kho na jaaye.** Field ka *type* badal
 * raha hai; bina iske purani strings ek aisi jagah baithi rehtin jahan naya code doc ki
 * ummeed karta hai, aur page pe wo chup-chaap gayab ho jaatin — is repo ka pehchana hua
 * failure mode (D-64, D-65, D-68 ka guard wala).
 *
 * `textToDoc()` wahi helper hai jo defaults pe bhi chalta hai — har line ek paragraph.
 * Do jagah wahi tark likhne ka matlab hota ki ek din wo alag ho jaayein.
 *
 * ⚠️ **`heading` ko haath nahi lagta** — wo ek line ka `<h2>` hai aur plain string hi rehta
 * hai. Usme rich text ka koi matlab nahi.
 *
 * ## Idempotent kaise hai
 *
 * Sirf wahi values chhui jaati hain jo **string** hain. Ek baar doc ban jaane ke baad dobara
 * chalane pe kuch match hi nahi karta. Isliye adhoori chali migration bhi surakshit hai.
 */

import { textToDoc } from '@cms/shared'

const COLLECTION = 'packageDefaults'

/** Sirf strings — doc pehle se ban chuka ho to chhod do. */
function convert(labels) {
  let touched = false
  const next = {}

  for (const [key, value] of Object.entries(labels ?? {})) {
    if (typeof value?.description !== 'string') {
      next[key] = value
      continue
    }

    touched = true
    next[key] = { ...value, description: textToDoc(value.description) }
  }

  return touched ? next : null
}

export async function up({ db }) {
  const cursor = db
    .collection(COLLECTION)
    .find({ sectionLabels: { $exists: true } }, { projection: { sectionLabels: 1 } })

  for await (const doc of cursor) {
    const next = convert(doc.sectionLabels)
    if (!next) continue

    await db.collection(COLLECTION).updateOne({ _id: doc._id }, { $set: { sectionLabels: next } })
  }
}

/**
 * Doc se wapas plain text.
 *
 * ⚠️ **Ye lossy hai, aur hona hi tha** — bold, heading, list aur link plain text me hote hi
 * nahi. `down()` sirf itna vaada karta hai ki *shabd* wapas aa jaayein, sajawat nahi. Bina
 * `down()` ke rollback ka koi raasta hi na bachta (schema-change §3).
 */
export async function down({ db }) {
  const cursor = db
    .collection(COLLECTION)
    .find({ sectionLabels: { $exists: true } }, { projection: { sectionLabels: 1 } })

  for await (const doc of cursor) {
    let touched = false
    const next = {}

    for (const [key, value] of Object.entries(doc.sectionLabels ?? {})) {
      if (typeof value?.description === 'string' || value?.description == null) {
        next[key] = value
        continue
      }

      touched = true

      /** Har top-level node ki apni line — nested text bhi saath aa jaata hai. */
      const text = (value.description.content ?? [])
        .map((node) => flatten(node))
        .filter(Boolean)
        .join('\n')

      next[key] = { ...value, description: text }
    }

    if (!touched) continue

    await db.collection(COLLECTION).updateOne({ _id: doc._id }, { $set: { sectionLabels: next } })
  }
}

/** Kisi bhi node ke andar ka saara text — recursive, kyunki list ke andar list ho sakti hai. */
function flatten(node) {
  if (!node) return ''
  if (node.type === 'text') return String(node.text ?? '')

  return (node.content ?? []).map(flatten).join('')
}
