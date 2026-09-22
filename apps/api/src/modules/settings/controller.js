import { env } from '../../core/env.js'
import { saveCustomFontFile } from './fonts.js'
import * as settingsService from './service.js'
import { updateIntegrationsSchema, updateMailSchema, updateSettingsSchema } from './validation.js'

/**
 * Patla controller — validate → service → response (R1).
 *
 * `siteUrl` response me service se nahi, **env se** jaata hai. Wo deployment ki config
 * hai, content ki nahi: usi value pe CORS allowlist aur canonical URLs khade hain
 * (D-12). Use admin se editable banane ka matlab hota ki ek galat entry poore site ke
 * links aur CORS dono tod de. Screen use read-only dikhati hai.
 */
const withReadOnly = (settings) => ({ ...settings, siteUrl: env.SITE_URL })

export async function get(_req, res, next) {
  try {
    res.json({ data: { settings: withReadOnly(await settingsService.getSettings()) } })
  } catch (err) {
    next(err)
  }
}

export async function update(req, res, next) {
  try {
    const input = updateSettingsSchema.parse(req.body)
    const settings = await settingsService.updateSettings(input)

    res.json({ data: { settings: withReadOnly(settings) } })
  } catch (err) {
    next(err)
  }
}

/**
 * Settings ▸ Integrations (D-106) — alag handler, kyunki uski permission alag hai.
 *
 * ⚠️ Response poori settings deta hai (wahi shakl jo `update` ki hai), taaki admin ki screen ko
 * doosra GET na karna pade.
 */
export async function updateIntegrations(req, res, next) {
  try {
    const input = updateIntegrationsSchema.parse(req.body)
    const settings = await settingsService.updateIntegrations(input)

    res.json({ data: { settings: withReadOnly(settings) } })
  } catch (err) {
    next(err)
  }
}

/**
 * Settings ▸ Email / SMTP (D-108) — teenon handler alag hain, `get`/`update` me nahi mile.
 *
 * ⚠️ **Jawab me poori settings NAHI jaati** (jo `updateIntegrations` karta hai) — sirf mail
 * wala hissa. Poori settings bhejne ka matlab hota `toPublicSettings()` chalana, aur usme
 * `mail` hai hi nahi (Zod use strip kar deti hai). Yaani wo raasta screen ko **khaali** jawab
 * deta aur form save ke baad apne aap khali ho jaata.
 */
export async function getMail(_req, res, next) {
  try {
    res.json({ data: { mail: await settingsService.getMailSettings() } })
  } catch (err) {
    next(err)
  }
}

export async function updateMail(req, res, next) {
  try {
    const input = updateMailSchema.parse(req.body)

    res.json({ data: { mail: await settingsService.updateMailSettings(input) } })
  } catch (err) {
    next(err)
  }
}

/**
 * Test mail **logged-in user ke apne email pe** jaata hai — body kuch leta hi nahi.
 *
 * ⚠️ Agar body se address liya jaata, to `settings.update` wala koi bhi user is route se
 * **kisi bhi** address pe mail bhej sakta — yaani apni site ke naam pe ek chhota mail relay,
 * jo spam bhejne ka taiyaar raasta hai. Apne hi email pe bhejne se wo band rehta hai aur
 * button ka asli kaam (config chalti hai ya nahi) poora ho jaata hai.
 */
export async function sendTestMail(req, res, next) {
  try {
    res.json({ data: await settingsService.sendTestMail(req.user.email) })
  } catch (err) {
    next(err)
  }
}

/** Settings ▸ Fonts ▸ Custom font — ek WOFF/WOFF2 file, jawab me uska URL (settings me abhi kuch nahi likha jaata). */
export async function uploadFont(req, res, next) {
  try {
    res.status(201).json({ data: { file: await saveCustomFontFile(req.file) } })
  } catch (err) {
    next(err)
  }
}
