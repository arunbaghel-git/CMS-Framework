import { updateIntegrationsSchema, updateMailSchema, updateSettingsSchema } from '@cms/shared'

/** Shape `packages/shared` me hai (R8) — admin ka form aur API ek hi schema pe. */
export { updateIntegrationsSchema, updateMailSchema, updateSettingsSchema }

/**
 * ⚠️ `POST /api/settings/mail/test` ka **koi body schema nahi hai, aur wo jaan-boojh kar**.
 *
 * Wo route body leta hi nahi — test mail hamesha **logged-in user ke apne email** pe jaata
 * hai (`req.user.email`). Ek `to` field lene ka matlab hota ki `settings.update` wala koi
 * bhi user kisi bhi address pe mail bhej sake, yaani apni site ke naam pe ek chhota mail
 * relay. R9 ("har input pe Zod") isse toot-ta nahi — jo input liya hi nahi jaata, use
 * validate karne ki zaroorat nahi hoti.
 */
