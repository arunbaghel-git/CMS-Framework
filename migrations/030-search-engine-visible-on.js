/**
 * `searchEngineVisible` → `true` har chalu site pe — `Settings ▸ SEO & Schema` (client, 24 Sep).
 *
 * ## Ye migration zaroori kyun hai
 *
 * Field spec 004 §3 se `false` default ke saath maujood tha, par **admin me uska koi switch nahi
 * tha aur site pe wo kuch karta bhi nahi tha** — page ka `robots: undefined` layout ka `noindex`
 * mita deta tha. Yaani har site `false` pe baithi thi aur phir bhi Google me thi.
 *
 * 24 Sep se wo sach me chalta hai: `false` = `/robots.txt` me `Disallow: /` + har page pe `noindex`.
 * Bina is migration ke deploy hote hi **live site Google se nikal jaati**. Isliye aaj ka asli
 * haal (index ho rahi hai) DB me likh diya jaata hai; band karna ho to ab admin me checkbox hai.
 *
 * ⚠️ Naye instance ka default **`false` hi hai** (schema) — wo staging se shuru hota hai, launch pe
 * checkbox tick hota hai. Ye migration sirf aaj ke documents chhooti hai.
 *
 * ⚠️ `down()` kuch nahi karta — `false` wapas likhna purane code pe bemaani hai (wahan field kuch
 * karta hi nahi tha), aur naye code pe site ko index se nikaal deta.
 */

export async function up({ db }) {
  await db
    .collection('settings')
    .updateMany({ searchEngineVisible: { $ne: true } }, { $set: { searchEngineVisible: true } })
}

export async function down() {}
