import mongoose from 'mongoose'

/**
 * `refreshTokens` — rotation aur **reuse detection** ka server-side record.
 *
 * Architecture §8.1: reuse detection stateless JWT se ho hi **nahi sakti**. Refresh
 * token rotate hota hai, aur agar koi purana (already rotated) token dobara use hota
 * hai to iska matlab wo chori hua hai — tab poori **family** revoke hoti hai.
 *
 * Ek family = ek login session. Har rotation usi `familyId` me naya `jti` banata hai.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    /** JWT ka `jti` claim. Token khud yahan store nahi hota — sirf uski pehchaan. */
    jti: { type: String, required: true },
    /** Ek login session. Rotation pe same rehta hai. */
    familyId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    expiresAt: { type: Date, required: true },
    /** Set hote hi token dobara use nahi ho sakta — rotate ya revoke, dono me. */
    revokedAt: { type: Date, default: null },
    /** Rotation pe agla `jti`. Audit ke liye — kaun kis se badla. */
    replacedByJti: { type: String, default: null },

    /**
     * Login pe "Remember me" chuna tha ya nahi (D-38).
     *
     * **Yahan isliye hai ki rotation ke baad bhi zinda rahe.** Sirf cookie me rakhne se
     * pata hi na chalta ki user ne kya chuna tha, aur refresh har baar apne hisaab se
     * faisla le leta — theek wahi bug jo pehle tha.
     *
     * Migration nahi chahiye: purane records ise `false` padhte hain (safe direction),
     * aur `refreshTokens` waise bhi TTL index se apne aap saaf ho jaata hai.
     */
    remember: { type: Boolean, default: false },

    /** Forensics — "kis device se login tha". Kabhi auth decision me use nahi hote. */
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: true, collection: 'refreshTokens' },
)

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema)

/**
 * Password reset ka ek link — D-110 (sirf administrator ke liye).
 *
 * ⚠️ **Token khud kabhi store nahi hota, sirf uska SHA-256.** DB ka backup ya dump leak ho jaaye to
 * bhi usse koi password reset nahi kar sakta — wahi soch jo password ke hash pe hai. bcrypt yahan
 * zaroori nahi: token 32 random byte ka hai, use guess karna waise hi namumkin hai; hash sirf
 * "DB padhne wale ke haath me kaam ki cheez na ho" ke liye hai. SHA-256 ka faayda ye ki lookup
 * seedha index pe hota hai.
 *
 * `usedAt` — link **ek hi baar** chalta hai. Atomic `findOneAndUpdate` se lagta hai, taaki do tab
 * me ek saath khola gaya link do baar na chale.
 *
 * Purane record TTL index (`expiresAt`) se apne aap mitte hain — migration 028. Indexes wahin hain,
 * yahan nahi: production `autoIndex: false` pe chalti hai.
 */
const passwordResetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    /** Kis IP se maanga gaya — "changed" wali mail aur jaanch ke liye. */
    ip: { type: String, default: null },
  },
  { timestamps: true, collection: 'passwordResets' },
)

export const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema)
