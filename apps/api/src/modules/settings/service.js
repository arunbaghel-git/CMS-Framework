import { DEFAULT_SITE_ID, defaultSettings, toPublicSettings } from '@cms/shared'

import { badRequest } from '../../core/errors.js'
import { mediaExists } from '../media/service.js'
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

  return toPublicSettings(updated)
}
