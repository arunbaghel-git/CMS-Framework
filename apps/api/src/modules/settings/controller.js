import { env } from '../../core/env.js'
import { saveCustomFontFile } from './fonts.js'
import * as settingsService from './service.js'
import { updateIntegrationsSchema, updateSettingsSchema } from './validation.js'

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

/** Settings ▸ Fonts ▸ Custom font — ek WOFF/WOFF2 file, jawab me uska URL (settings me abhi kuch nahi likha jaata). */
export async function uploadFont(req, res, next) {
  try {
    res.status(201).json({ data: { file: await saveCustomFontFile(req.file) } })
  } catch (err) {
    next(err)
  }
}
