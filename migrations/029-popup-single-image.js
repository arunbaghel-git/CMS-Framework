/**
 * Popup me ab sirf **ek** image — client ka faisla, 23 Sep (D-103 §10).
 *
 * ```
 *   popupSettings.imageIds: ['a', 'b', 'c']  →  ['a']
 * ```
 *
 * ## Ye migration zaroori kyun hai
 *
 * Chhat schema me hai (`POPUP_MAX_IMAGES = 1`), aur `toPublicSettings()` **har read pe** poore
 * `settings` ko usi schema se parse karta hai. Jis DB me 2–3 image pehle se padi hain, wahan bina
 * is migration ke `GET /settings` hi phat jaata — yaani admin ki Settings screens bhi, aur public
 * site ka header/footer bhi.
 *
 * ⚠️ **Pehli image bachti hai** — client ne jo pehle rakhi thi, wahi popup pe pehle chhapti thi.
 * Baaki ki id DB se jaati hai, par **file Media Library me waisi ki waisi** rehti hai (sirf
 * popup ka hawala hat-ta hai).
 *
 * ⚠️ `down()` kuch wapas nahi laata — kati hui id kahin likhi nahi gayi. Rollback ka asli raasta
 * `mongodump` hai (wahi jo 020/027 pe likha hai). Purana code ek image wale data pe waise bhi
 * chalta hai (uski chhat 3 thi), isliye down ka koi kaam bachta nahi.
 */

export async function up({ db }) {
  const settings = db.collection('settings')

  const cursor = settings.find(
    { 'popupSettings.imageIds.1': { $exists: true } },
    { projection: { 'popupSettings.imageIds': 1 } },
  )

  for await (const doc of cursor) {
    const first = doc.popupSettings.imageIds.slice(0, 1)
    await settings.updateOne({ _id: doc._id }, { $set: { 'popupSettings.imageIds': first } })
  }
}

export async function down() {}
