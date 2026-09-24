import { createHash } from 'node:crypto'

/**
 * Doc me image na ho to **default pool** se ek image (client, 24 Sep, D-119).
 *
 * Pool admin me hai — package ke liye `Itinerary Settings ▸ Default banner images`, blog ke liye
 * `Blog settings ▸ Default featured images`. Client: _"sheet me 20 doc hain aur 16 me image nahi,
 * to un 16 ko un images me se random milein."_
 *
 * ## Ye alag file kyun
 *
 * Niyam `importRow()` ke andar likha jaata to uska test likha hi nahi ja sakta (D-92 §11, D-105).
 * Yahan koi DB nahi — pool aur row ki jagah andar, id bahar.
 *
 * ## Pure random nahi, **ghuma ke baantna**
 *
 * 16 row pe har baar pure random chunne se kuch images 5 baar aati hain aur kuch ek baar bhi nahi —
 * aur listing me ek jaisi images saath-saath baithti hain. Isliye pool **ek baar shuffle** hota hai
 * aur row apni jagah (`rowIndex`) ke hisaab se agli image leti hai: 6 image aur 16 row pe har image
 * ~3 baar.
 *
 * ⚠️ **Shuffle ka beej run ki id hai, memory ka counter nahi.** Rows queue worker se ek-ek karke
 * chalti hain, alag tick me, restart ke baad bhi (`processImportQueue()`). Memory ka counter restart
 * pe shuru se ginta aur `Retry again` pe row ko doosri image deta. Run id + row ki jagah se wahi row
 * hamesha wahi image leti hai — aur har naye run ka kram alag hota hai.
 *
 * @param {string[]} pool media ids
 * @param {{ runId: string, rowIndex: number }} where
 * @returns {string | null}
 */
export function pickDefaultImage(pool, { runId, rowIndex }) {
  const ids = [...new Set((pool ?? []).filter(Boolean).map(String))]
  if (ids.length === 0) return null

  const order = shuffled(ids, String(runId ?? ''))
  const index = Number.isInteger(rowIndex) && rowIndex >= 0 ? rowIndex : 0

  return order[index % order.length]
}

/** Beej se tay shuffle — har id ka `sha1(beej:id)`, us hisaab se sort. */
function shuffled(ids, seed) {
  const key = (id) => createHash('sha1').update(`${seed}:${id}`).digest('hex')

  return ids
    .map((id) => ({ id, key: key(id) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((entry) => entry.id)
}
