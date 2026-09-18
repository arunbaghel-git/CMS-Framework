/**
 * Settings ▸ Fonts — 17 Sep ke "purane default" DB se hatao (client, 18 Sep: headings common).
 *
 * 18 Sep ko h1/h2/h3 ke default badle (40 · 25 · 16, `packages/shared/src/theme-fonts.js`). Fonts screen
 * pe Save dabane se `themeFonts.scale` me **saare 9 step** likh jaate hain — badle hue bhi aur na badle hue
 * bhi. Jo 17 Sep ke default ke barabar save hua tha (jaise h3 = 21 / 20.5 / 17), wo naye default se alag
 * hai, to site use "client ne badla" samajh kar lagaa deti — har h3 21px.
 *
 * Ye migration **sirf wahi step** hataati hai jo 17 Sep ke default se bilkul milta hai. Client ne jo khud
 * badla (jaise h1 = 41), wo waisa ka waisa. Hataaye hue step pe naya default chalta hai.
 *
 * Idempotent: dobara chale to kuch milta hi nahi.
 */

import { FONT_SCALE_DEFAULTS_17_SEP } from '@cms/shared'

const FIELDS = ['size', 'sizeTablet', 'sizeMobile', 'weight', 'lh', 'ls']

const sameAsOld = (saved, old) => saved && FIELDS.every((f) => String(saved[f]) === String(old[f]))

export async function up({ db }) {
  const settings = db.collection('settings')
  const cursor = settings.find(
    { 'themeFonts.scale': { $exists: true } },
    { projection: { themeFonts: 1 } },
  )

  for await (const doc of cursor) {
    const scale = doc.themeFonts?.scale ?? {}
    const $unset = {}
    for (const [key, old] of Object.entries(FONT_SCALE_DEFAULTS_17_SEP)) {
      if (sameAsOld(scale[key], old)) $unset[`themeFonts.scale.${key}`] = ''
    }
    if (Object.keys($unset).length) await settings.updateOne({ _id: doc._id }, { $unset })
  }
}

/**
 * Wapas: hataaye hue step 17 Sep ke default pe likh do — wahi value jo hati thi (sirf wahi hati thi),
 * isliye jo step abhi DB me nahi hai use purana default dena sahi ulta hai.
 */
export async function down({ db }) {
  const settings = db.collection('settings')
  const cursor = settings.find({ themeFonts: { $exists: true } }, { projection: { themeFonts: 1 } })

  for await (const doc of cursor) {
    const scale = doc.themeFonts?.scale ?? {}
    const $set = {}
    for (const [key, old] of Object.entries(FONT_SCALE_DEFAULTS_17_SEP)) {
      if (!scale[key]) $set[`themeFonts.scale.${key}`] = old
    }
    if (Object.keys($set).length) await settings.updateOne({ _id: doc._id }, { $set })
  }
}
