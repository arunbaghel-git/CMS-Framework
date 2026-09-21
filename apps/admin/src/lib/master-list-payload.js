/**
 * Master list ke form se wo payload jo API ko jaata hai — Hotels · Add Ons · Transfers ·
 * Reviews · Video reviews, paanchon screens ek hi `MasterListScreen` se chalti hain.
 *
 * ## Ye JSX se bahar kyun hai
 *
 * Ye ek **niyam** hai, render nahi: "kaunsa khaali khaana bheja jaaye aur kaunsa nahi".
 * `submit()` ke andar rehne se iska test likha hi nahi ja sakta tha — aur usi wajah se us
 * niyam ki ek galti **do mahine** chup padi rahi (neeche). Wahi sabak D-92 §11 me `wrapTables()`
 * pe mila tha: jo sirf chalane pe dikhta hai, wo live page pe hi pakda jaata hai.
 *
 * ## Khaali ke do matlab, aur wahi asli bug tha
 *
 * Pehle niyam ek hi line ka tha — **koi bhi** khaali value bheji hi nahi jaati thi. Uski wajah
 * theek thi: `destinationId` pe khaali string bhejne ka matlab server pe "ye destination
 * dhoondho" hai, aur wo 422 deta hai.
 *
 * Par us ek line ne har **optional** khaane ko bhi pakad liya, aur uska nateeja ye tha ki
 * bhara hua khaana **kabhi khaali ho hi nahi sakta tha**: client Add-on ka `Where` mita kar
 * Update dabata, API 200 deti, admin _"Add-on updated."_ dikhata — aur DB me purani value
 * baithi rehti. **Koi error kahin nahi.** (Client, 21 Sep: _"in Add Ons why i am not able to
 * update any value"_.) Yahi lakshan D-86 aur D-89 me likha hai.
 *
 * Isliye ab khaali ka matlab **field pe** nirbhar karta hai:
 *
 * | Khaana | Khaali bheja jaata hai? |
 * | --- | --- |
 * | `required` (naam · destination · category · stars · video link) | ❌ — khaali form ki galti hai, server ki baat nahi |
 * | optional text (`price` · `where` · `room` · `note` · `icon` · `month`) | ✅ **sirf edit pe** — matlab "isse hata do" |
 * | `media` | ❌ create pe · ✅ edit pe (`null` jaata hai, warna purani image chipki rehti) |
 *
 * ⚠️ **Create pe khaali ab bhi nahi jaata, aur wo jaan-boojh kar hai.** Nayi row pe "hata do"
 * ki koi baat hi nahi hoti — wahan khaali ka matlab sirf "bhara nahi", aur schema ka apna
 * default (`''`) wahi kaam kar deta hai.
 *
 * @param {Record<string, unknown>} form
 * @param {{ fields: Array<{ key: string, type?: string, required?: boolean }>, editingId?: string|null }} config
 */
export function toMasterListPayload(form, { fields, editingId }) {
  const required = new Set(fields.filter((f) => f.required).map((f) => f.key))
  const mediaKeys = new Set(fields.filter((f) => f.type === 'media').map((f) => f.key))

  return Object.fromEntries(
    Object.entries(form ?? {}).filter(([key, value]) => {
      if (value !== '' && value != null) return true

      /** Image hatayi to `null` jaana chahiye — warna edit pe purani image chup-chaap bachi rehti. */
      if (mediaKeys.has(key)) return Boolean(editingId)

      return Boolean(editingId) && !required.has(key)
    }),
  )
}
