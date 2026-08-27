/**
 * `itinerary[].highlights` description me mila diya gaya — client ka faisla, 27 Aug (D-64).
 *
 * Din ke card pe do alag field the: `description` (ek paragraph) aur `highlights[]` (bullet
 * list). Client ne kaha ki alag row nahi chahiye — list description me hi likh denge.
 *
 * **Ye migration isliye zaroori hai ki wo text kho na jaaye.** Field schema se hat raha hai;
 * bina migration ke client ka likha hua har highlight page se chup-chaap gayab ho jaata, aur
 * uska koi record kahin na hota.
 *
 * Har highlight description ke neeche ek `- ` line ban jaata hai — wahi shape jo naya editor
 * padhta hai (`-` se shuru = bullet, baaki paragraph).
 *
 * ⚠️ **`hotelCategory` bhi usi din hata (D-64), par uske liye yahan kuch nahi hai** — wo ek
 * chunav tha, likha hua text nahi. Mongo me bacha hua field muft hai aur ab use koi padhta
 * nahi; use `$unset` karne ka matlab hota bina faayde ke har entry pe ek write.
 */

export async function up({ db }) {
  const entries = db.collection('entries')

  const cursor = entries.find(
    { 'fields.itinerary': { $exists: true, $ne: [] } },
    { projection: { 'fields.itinerary': 1 } },
  )

  for await (const doc of cursor) {
    const days = doc.fields?.itinerary ?? []
    let touched = false

    const next = days.map((day) => {
      const highlights = Array.isArray(day?.highlights) ? day.highlights.filter(Boolean) : []
      if (highlights.length === 0) return day

      touched = true

      /**
       * Description pehle, phir bullets — wahi kram jo card pe dikhta tha.
       *
       * Khaali description pe aage ki khaali line nahi chhodi jaati, warna page pe pehla
       * bullet ek khaali paragraph ke neeche aata.
       */
      const lines = highlights.map((h) => `- ${String(h).trim()}`)
      const description = [String(day.description ?? '').trim(), ...lines]
        .filter(Boolean)
        .join('\n')

      const { highlights: _dropped, ...rest } = day

      return { ...rest, description }
    })

    if (touched) {
      await entries.updateOne({ _id: doc._id }, { $set: { 'fields.itinerary': next } })
    }
  }
}

/**
 * Rollback — `- ` wali lines wapas `highlights[]` me.
 *
 * ⚠️ **Ye poori tarah ulta nahi hai, aur ye jaan-boojh kar hai.** Agar client ne migration ke
 * **baad** description me apne `- ` bullets likhe, to `down()` unhe bhi highlights bana dega
 * — kyunki dono ek jaise dikhte hain aur unme farak karne ka koi nishaan bacha hi nahi.
 *
 * Iska koi saaf hal nahi tha: nishaan chhodne ka matlab hota client ke text me ek chhupa hua
 * marker daalna, jo kisi din uske saamne aa jaata. Rollback ka asli kaam yahan bhi ho jaata
 * hai — text kahin kho-ta nahi, bas do field me baant jaata hai.
 */
export async function down({ db }) {
  const entries = db.collection('entries')

  const cursor = entries.find(
    { 'fields.itinerary': { $exists: true, $ne: [] } },
    { projection: { 'fields.itinerary': 1 } },
  )

  for await (const doc of cursor) {
    const days = doc.fields?.itinerary ?? []
    let touched = false

    const next = days.map((day) => {
      const lines = String(day?.description ?? '').split('\n')
      const items = lines.filter((l) => /^\s*[-•*]\s+/.test(l))
      if (items.length === 0) return day

      touched = true

      return {
        ...day,
        description: lines
          .filter((l) => !/^\s*[-•*]\s+/.test(l))
          .join('\n')
          .trim(),
        highlights: items.map((l) => l.replace(/^\s*[-•*]\s+/, '').trim()),
      }
    })

    if (touched) {
      await entries.updateOne({ _id: doc._id }, { $set: { 'fields.itinerary': next } })
    }
  }
}
