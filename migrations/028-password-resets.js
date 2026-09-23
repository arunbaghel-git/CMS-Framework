/**
 * Password reset — `passwordResets` collection ke indexes (D-110, client 23 Sep).
 *
 * `Lost your password?` ab chalta hai, par **sirf administrator** ke liye: baaki users ka password
 * admin `Users ▸ Edit User` se badal deta hai, aur kami sirf tab thi jab admin khud bhool jaaye.
 *
 * Is migration me **koi data nahi badalta** — collection nayi hai aur khaali hai. Permissions bhi
 * nahi: dono route public hain (login se pehle chalte hain), `requirePermission()` wahan lag hi nahi
 * sakta.
 */

export async function up({ db }) {
  /**
   * ⚠️ Naam `passwordResets` — `model.js` me bhi `collection: 'passwordResets'` pin hai. A-18 isi
   * ek baat se bana tha: migration ne ek naam pe index banaye aur Mongoose doosre naam pe likhta raha.
   */
  const resets = db.collection('passwordResets')

  /**
   * Link kholne pe lookup isi pe hota hai. `unique` — do link ka ek hi hash hona 32 random byte pe
   * namumkin hai, par ho jaaye to ek link doosre user ka password badal deta. Rok DB pe hi.
   */
  await resets.createIndex({ tokenHash: 1 }, { name: 'tokenHash_unique', unique: true })

  /** Naya link maangte hi us user ke purane link band — `deleteMany({ userId })`. */
  await resets.createIndex({ userId: 1 }, { name: 'userId' })

  /**
   * Expire hote hi record Mongo khud mita deta hai — `refreshTokens` wala hi TTL (migration 002).
   * Expiry ka **asli** check service me hai (`expiresAt > now`); TTL ka monitor 60 second me ek baar
   * chalta hai, us bharose link ek minute zyada chal jaata.
   */
  await resets.createIndex({ expiresAt: 1 }, { name: 'expiresAt_ttl', expireAfterSeconds: 0 })
}

export async function down({ db }) {
  await db.collection('passwordResets').dropIndexes()
}
