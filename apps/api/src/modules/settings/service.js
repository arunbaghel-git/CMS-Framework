import { DEFAULT_SITE_ID, defaultSettings, toPublicSettings } from '@cms/shared'

import { badRequest } from '../../core/errors.js'
import { revalidateTags } from '../../core/revalidate.js'
import { mediaExists } from '../media/service.js'
import { menuExists } from '../menus/service.js'
import { syncPostUrlPattern } from '../entries/service.js'
import { Settings } from './model.js'

/**
 * Settings ka business logic — R1.
 *
 * Poora module ek hi document ke aas-paas ghoomta hai, isliye har function `siteId`
 * leta hai. Aaj wo hamesha `default` hota hai (D-01).
 */

/**
 * Settings **hamesha** milti hain — na hon to bana kar deta hai.
 *
 * Ye "self-healing read" jaan-boojh kar hai. Seed sirf naye instance pe chalti hai, aur
 * migration 005 chalu instances pe document daalti hai — par dono me se koi chhoot jaaye
 * (jaise migration chalana bhool gaye) to admin ko **404 nahi**, defaults milne chahiye.
 * Settings ke bina admin panel ka koi screen khulta hi nahi.
 *
 * @param {string} [siteId]
 */
export async function ensureSettings(siteId = DEFAULT_SITE_ID) {
  const existing = await Settings.findOne({ siteId })
  if (existing) return existing

  return Settings.create(defaultSettings({ siteId }))
}

/** @param {string} [siteId] */
export async function getSettings(siteId = DEFAULT_SITE_ID) {
  return toPublicSettings(await ensureSettings(siteId))
}

/**
 * Media ki id store karne wale fields, aur unka user-facing naam (R17 — message English).
 */
const MEDIA_ID_FIELDS = Object.freeze({
  logoMediaId: 'logo',
  faviconMediaId: 'favicon',
  footerLogoMediaId: 'footer logo',
})

/**
 * Media ki id save hone se **pehle** check karo ki wo media asli me hai (D-42 §1).
 *
 * Bina iske koi bhi string `logoMediaId` me baith jaati hai, aur wo galti chup-chaap DB
 * me pahunch kar Slice 0 me header pe phootti — upload ke hafton baad, jahan wajah
 * dhoondhna mushkil hai. Ek `exists()` se wo entry point pe hi ruk jaati hai.
 *
 * `null` (aur khaali string) hamesha valid hai — wo "logo hata do" hai, na ki koi
 * reference.
 *
 * @param {object} input
 * @param {string} siteId
 */
async function assertMediaRefsExist(input, siteId) {
  for (const [field, label] of Object.entries(MEDIA_ID_FIELDS)) {
    const id = input[field]
    if (id === undefined || id === null || id === '') continue

    if (!(await mediaExists(id, siteId))) {
      throw badRequest(`The selected ${label} could not be found. Upload it again.`)
    }
  }
}

/**
 * Footer column ka `menuId` bhi save se **pehle** check hota hai — wahi soch jo D-42 §1
 * ki hai, sirf media ki jagah menu.
 *
 * Bina iske koi bhi string `menuId` me baith jaati hai aur footer chup-chaap khaali
 * column render karta rehta hai — admin ko lagta hai menu assign ho gaya.
 *
 * Ye `menus` module ko import karta hai. Ulta rasta (menus → settings) bhi maujood hai
 * (menu delete hone pe reference clear karna), par circular nahi banta: dono taraf sirf
 * chhote helper hain, koi shared state nahi.
 *
 * @param {object} input
 * @param {string} siteId
 */
async function assertFooterMenusExist(input, siteId) {
  if (!Array.isArray(input.footerColumns)) return

  const ids = [...new Set(input.footerColumns.map((c) => c?.menuId).filter(Boolean))]

  for (const id of ids) {
    if (!(await menuExists(id, siteId))) {
      throw badRequest('One of the footer columns points to a menu that no longer exists.')
    }
  }
}

/**
 * Menu delete hone pe uska reference footer se hata do — `menus` service yahan se
 * bulati hai.
 *
 * Ye wahi kaam hai jo pehle `MenuLocation.updateMany({ menuId }, { menuId: null })`
 * karta tha. D-44 me assignment yahan aa gayi, to cleanup bhi yahan aana chahiye —
 * warna column ek marey hue menu ko point karta reh jaata aur footer bina wajah bataye
 * khaali rehta.
 *
 * **Column khud delete nahi hota**, sirf uska `menuId` `null` hota hai: column ki
 * heading aur text blocks client ka content hain, aur unhe menu ke saath uda dena galat
 * hoga.
 *
 * @param {string} menuId
 * @param {string} [siteId]
 * @returns {Promise<boolean>} kuch badla ya nahi — caller isse cache invalidate karta hai
 */
export async function clearFooterMenuReferences(menuId, siteId = DEFAULT_SITE_ID) {
  const res = await Settings.updateOne(
    { siteId, 'footerColumns.menuId': menuId },
    { $set: { 'footerColumns.$[col].menuId': null } },
    { arrayFilters: [{ 'col.menuId': menuId }] },
  )

  return (res.modifiedCount ?? 0) > 0
}

/**
 * Ye menu kisi footer column me use ho raha hai kya?
 *
 * Cache ke liye chahiye: footer ka data ab `settings` payload me aata hai, isliye ek
 * footer menu badalne pe `menu:*` nahi, **`settings`** tag stale hota hai (D-44 §5).
 *
 * @param {string} menuId
 * @param {string} [siteId]
 */
export async function isMenuUsedInFooter(menuId, siteId = DEFAULT_SITE_ID) {
  return Boolean(await Settings.exists({ siteId, 'footerColumns.menuId': menuId }))
}

/**
 * Sirf wahi fields likhta hai jo `updateSettingsSchema` se pass hui hain.
 *
 * `$set` ke saath **dot-notation** use hoti hai nested `social` ke liye — poora object
 * `$set` karne se wo fields ud jaati hain jo request me nahi aayi thin. Admin form aaj
 * teenon social links bhejta hai, par koi doosra caller (ya kal ka partial save) ek hi
 * bheje to baaki do khaali ho jaate.
 *
 * @param {object} input `updateSettingsSchema` se paas hua hua
 * @param {string} [siteId]
 */
export async function updateSettings(input, siteId = DEFAULT_SITE_ID) {
  await assertMediaRefsExist(input, siteId)
  await assertFooterMenusExist(input, siteId)
  await ensureSettings(siteId)

  const $set = {}
  for (const [key, value] of Object.entries(input)) {
    if (key === 'social' && value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) $set[`social.${k}`] = v
    } else {
      $set[key] = value
    }
  }

  const updated = await Settings.findOneAndUpdate({ siteId }, { $set }, { new: true })

  /**
   * ⚠️ **`postUrlMode` badalne pe har post ka URL badalta hai** (spec 008, client 10 Sep).
   *
   * Ye ek saada setting nahi hai — ye ek **bulk rename** hai: `post` type ka `urlPattern`
   * badalta hai, har post ka `path` dobara likha jaata hai, aur har purane path se **301**
   * banti hai. Poora tark `entries/service.js` me `syncPostUrlPattern()` ke upar hai.
   *
   * ⚠️ **`$set` ke baad chalta hai, pehle nahi** — wo function nayi value **DB se** padhta hai.
   * Pehle chalane ka matlab hota ki wo purane mode pe kaam kare aur naya mode kabhi lage hi
   * nahi. Wahi kism ka bug jo D-86 me tha: dono taraf ka code sahi dikhta hai.
   *
   * Mode na badla ho to ye function khud kuch nahi karta (pattern pehle se wahi hota hai).
   */
  if (input.blogSettings !== undefined) await syncPostUrlPattern(siteId)

  /**
   * Settings har page pe hai — logo, site name, footer copyright sab header/footer me
   * chhapte hain. Isliye ek hi `settings` tag, aur wo har save pe (D-14).
   */
  await revalidateTags(['settings'])

  return toPublicSettings(updated)
}
