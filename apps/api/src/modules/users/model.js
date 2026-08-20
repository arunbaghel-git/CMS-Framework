import mongoose from 'mongoose'
import { USER_STATUS, USER_STATUSES } from '@cms/shared'

/**
 * `users` — admin panel me login karne wale log.
 *
 * `deletedAt` yahan **nahi** hai. D-25 (trash) content ke liye hai; user delete karne
 * se uska likha content aur activity log orphan ho jaata, isliye user `inactive` hota
 * hai, hataya nahi jaata.
 */
const userSchema = new mongoose.Schema(
  {
    /**
     * Display ka naam aur aage author archive URL. Login isse **nahi** hota — wo
     * email se hai. Banne ke baad immutable (D-34), isliye koi update path ise
     * chhoota nahi: `updateUserSchema` me ye field hai hi nahi.
     */
    username: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true },
    /**
     * `select: false` — koi bhi `find()` ise **default me nahi** laata. Hash tabhi
     * aata hai jab query explicitly `.select('+passwordHash')` maange (login me).
     * Ye leak ke against aakhri safety net hai, pehla nahi — pehla `toPublicUser()`.
     */
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true },
    status: { type: String, enum: USER_STATUSES, default: USER_STATUS.ACTIVE },
    avatarMediaId: { type: String, default: null },
    /** Seed ka admin aur naya invited user pehle login pe password badalta hai. */
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'users' },
)

/**
 * Email hamesha lowercase + trimmed. Ye **pure normalization** hai, business logic
 * nahi — isliye hook me hona theek hai (R1).
 *
 * Par `findOneAndUpdate` `save` hook chalata hi nahi, isliye wahi normalization
 * update path pe bhi lagayi gayi hai.
 */
userSchema.pre('save', function normalizeEmail(next) {
  if (this.isModified('email') && typeof this.email === 'string') {
    this.email = this.email.trim().toLowerCase()
  }
  if (this.isModified('username') && typeof this.username === 'string') {
    this.username = this.username.trim().toLowerCase()
  }
  next()
})

userSchema.pre('findOneAndUpdate', function normalizeEmailOnUpdate(next) {
  const update = this.getUpdate()
  const email = update?.email ?? update?.$set?.email
  if (typeof email === 'string') {
    const normalized = email.trim().toLowerCase()
    if (update.$set) update.$set.email = normalized
    else update.email = normalized
  }
  next()
})

export const User = mongoose.model('User', userSchema)
