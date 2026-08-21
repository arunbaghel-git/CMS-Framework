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
