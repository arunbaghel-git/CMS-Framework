import { changePasswordSchema, loginSchema } from '@cms/shared'

/**
 * Auth ke Zod schemas. Asli shape `packages/shared` me hai (R8) — admin ka login form
 * aur API dono wahi schema use karte hain, isliye yahan sirf re-export.
 */
export { loginSchema, changePasswordSchema }
