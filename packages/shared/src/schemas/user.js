import { z } from 'zod'
import { PERMISSIONS, ROLES, USER_STATUSES } from '../constants/index.js'

/**
 * User · Role · session ka Zod contract — spec 001 (permissions), spec 004 (seed).
 *
 * Admin aur API DONO yahan se import karte hain (R8) — login form ka validation aur
 * API ka validation ek hi schema se aata hai, warna dono chupchaap alag ho jaate hain.
 */

/**
 * Order maayne rakhta hai: `.trim()` aur `.toLowerCase()` **`.email()` se pehle**.
 *
 * Zod checks usi order me chalte hain jis order me likhe hain. Baad me trim karne se
 * ` admin@site.com` (copy-paste me aam) validation pe hi reject ho jaata tha, aur user
 * ko dikhne wali galti "Email sahi nahi lag raha" hoti — jabki email bilkul sahi hai.
 */
export const emailSchema = z
  .string()
  .min(1, 'Email zaroori hai')
  .max(254)
  .trim()
  .toLowerCase()
  .email('Email sahi nahi lag raha')

/**
 * Password policy — sirf **lambai**, koi "ek capital, ek symbol" wala rule nahi.
 *
 * Composition rules users se `Password1!` jaisa password banwaate hain, jo lambe
 * passphrase se kamzor hai. NIST bhi 2017 se yahi kehta hai.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password kam se kam 10 characters ka ho')
  .max(200, 'Password bahut lamba hai')

/**
 * Login **email** se hota hai, username se nahi. Username display ke liye hai — aur
 * aage author archive URL (`/author/aditya`) me jaayega.
 *
 * Isiliye ye banne ke baad **immutable** hai: URL badalna purane link 404 kar deta hai
 * aur SEO todta hai (D-34).
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username kam se kam 3 characters ka ho')
  .max(60)
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/,
    'Username me sirf chhote letters, numbers, aur . _ - chalte hain',
  )

/**
 * Email se ek shuruaati username banata hai. Ye sirf **suggestion** hai — admin form
 * me ise badal sakta hai, aur uniqueness server check karta hai.
 *
 * Migration ka backfill bhi yahi function use karta hai, taaki purane users ka
 * username wahi bane jo naye users ko suggest hota.
 *
 * @param {string} email
 * @returns {string}
 */
export function suggestUsernameFromEmail(email) {
  const local = String(email ?? '')
    .split('@')[0]
    .toLowerCase()
    // allowed set se bahar ka sab hyphen, phir kinare saaf
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 60)

  // 3 se chhota reh gaya (jaise "a@site.com") to padding — schema warna reject karega
  return local.length >= 3
    ? local
    : `${local || 'user'}${'0'.repeat(Math.max(0, 3 - local.length))}`
}

export const roleKeySchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z][a-zA-Z0-9]*$/, 'Role key camelCase honi chahiye')

export const permissionSchema = z.enum(/** @type {[string, ...string[]]} */ (PERMISSIONS))

/** Stored shape — `roles` collection me role aisa dikhta hai. */
export const roleSchema = z.object({
  key: roleKeySchema,
  label: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  permissions: z.array(permissionSchema).default([]),
  /**
   * Built-in roles delete nahi ho sakte aur unki `key` immutable hai — wahi rule jo
   * built-in content types pe hai (spec 004 §4).
   */
  isBuiltIn: z.boolean().default(false),
})

/** Stored shape — `users` collection. `passwordHash` yahan jaan-boojh kar nahi hai. */
export const userSchema = z.object({
  username: usernameSchema,
  name: z.string().min(1, 'Naam zaroori hai').max(120).trim(),
  email: emailSchema,
  role: roleKeySchema,
  status: z.enum(/** @type {[string, ...string[]]} */ (USER_STATUSES)).default('active'),
  avatarMediaId: z.string().nullable().default(null),
  /** Seed se bana admin aur naya invited user pehle login pe password badalta hai. */
  mustChangePassword: z.boolean().default(false),
  lastLoginAt: z.date().nullable().default(null),
})

export const createUserSchema = userSchema.pick({ name: true, email: true, role: true }).extend({
  password: passwordSchema,
  /**
   * Optional: form ise email se pehle hi bhar deta hai, par khaali aaye to server
   * khud bana leta hai (`suggestUsernameFromEmail` + takraav pe number).
   * Required rakhne se har API caller ko wahi logic dohraana padta.
   */
  username: usernameSchema.optional(),
})

/**
 * Update me `username` jaan-boojh kar **nahi** hai — wo immutable hai (D-34).
 * `.pick()` se list banane ka yahi fayda hai: naya field apne aap editable nahi ho jaata.
 */
export const updateUserSchema = userSchema
  .pick({ name: true, role: true, status: true, avatarMediaId: true })
  .partial()
  .extend({
    /**
     * Admin yahan se user ka password reset karta hai (D-35) — user khud nahi badal
     * sakta, isliye bhoole hue password ka ekmatra raasta yahi hai.
     */
    password: passwordSchema.optional(),
  })

export const loginSchema = z.object({
  email: emailSchema,
  /**
   * Login pe `passwordSchema` **nahi** lagta. Policy badalne pe purane (chhote)
   * password wale users apne hi account se bahar ho jaate. Yahan sirf "khaali nahi".
   */
  password: z.string().min(1, 'Password zaroori hai'),
  rememberMe: z.boolean().default(false),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Abhi ka password zaroori hai'),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'Naya password purane se alag hona chahiye',
  })

export const updateMeSchema = userSchema.pick({ name: true, avatarMediaId: true }).partial()

/**
 * Client ko user ka **yahi** shape jaata hai. `passwordHash` kabhi nahi.
 *
 * Ek hi jagah se banta hai taaki koi naya endpoint galti se poora Mongoose document
 * na bhej de — leak hone wali field usually `passwordHash` hi hoti hai.
 *
 * @param {any} doc Mongoose user document ya plain object
 * @param {string[]} [permissions] role se resolve ki hui permissions
 */
export function toPublicUser(doc, permissions) {
  if (!doc) return null

  return {
    id: String(doc._id ?? doc.id),
    username: doc.username,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    status: doc.status,
    avatarMediaId: doc.avatarMediaId ?? null,
    mustChangePassword: Boolean(doc.mustChangePassword),
    lastLoginAt: doc.lastLoginAt ?? null,
    createdAt: doc.createdAt ?? null,
    ...(permissions ? { permissions } : {}),
  }
}

/** Role key valid hai ya nahi — seed aur validation dono use karte hain. */
export function isKnownRole(key) {
  return ROLES.includes(key)
}
