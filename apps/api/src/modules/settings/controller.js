import { env } from '../../core/env.js'
import * as settingsService from './service.js'
import { updateSettingsSchema } from './validation.js'

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
