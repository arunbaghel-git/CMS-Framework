import crypto from 'node:crypto'

import { env } from './env.js'
import { logger } from './logger.js'

/**
 * Chhoti secrets ko DB me **encrypted** rakhne ka ek hi raasta — D-108.
 *
 * Aaj iska ekmatra grahak SMTP ka password hai (`settings.mail.passwordEnc`), par shakl
 * jaan-boojh kar aam rakhi hai: aage koi bhi third-party credential (S3 secret, payment
 * gateway ki key) isi se guzregi.
 *
 * ## Ye kya bachata hai, aur kya nahi
 *
 * **Bachata hai:** Mongo ka dump, backup ki file, ya DB tak seedhi pahunch. Un teenon me
 * password ab padha nahi ja sakta — key DB me hai hi nahi, wo `.env` me rehti hai.
 *
 * **Nahi bachata:** jiske paas API ka process chal raha ho (ya `.env` ho), uske paas key
 * bhi hai. Ye jaan-boojh kar hai — password ko **wapas plaintext chahiye hi** (SMTP server
 * ko wahi bhejna hota hai), isliye hashing (bcrypt) yahan kaam hi nahi karti. Hashing ek
 * taraf ka raasta hai; yahan do taraf ka chahiye.
 *
 * ⚠️ Isiliye asli pehra sirf encryption nahi hai — password kabhi API ke response me
 * **jaata hi nahi** (`getMailSettings()`), aur `SMTP_PASS` pehle se `REDACTED_KEYS` me hai.
 * Teen parat: response se bahar, log se bahar, DB me encrypted.
 */

/** `aes-256-gcm` — GCM isliye ki wo chhed-chhaad bhi pakadta hai, sirf chhupata nahi. */
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const VERSION = 'v1'

/**
 * Key har baar `JWT_ACCESS_SECRET` se **derive** hoti hai, seedha use nahi hoti.
 *
 * Naya required env var jaan-boojh kar nahi banaya — spec 003 ke hisaab se har naya
 * required var boot pe `process.exit(1)` deta hai, yaani purane deploy naye code pe
 * **chalna band** kar dete. Ek optional var banane ka matlab hota do raaste, aur do
 * raaste ka matlab hai ki ek din koi ek chalta hi na ho.
 *
 * HKDF ka `info` isliye alag hai ki wahi secret JWT sign karne me bhi lagta hai. Alag
 * `info` se nikli key us kaam se **kisi tarah nahi judi** — key reuse ka aam jaal yahin
 * bandh ho jaata hai.
 *
 * ⚠️ `JWT_ACCESS_SECRET` badla to purane encrypted password **khul nahi paayenge**. Wo
 * theek hai aur `decryptSecret()` uske liye taiyaar hai: wo `null` deta hai, phatta nahi —
 * client password dobara bhar deta hai. Secret rotate karna suraksha ka kaam hai; use ek
 * crash me badalna use rokne jaisa hota.
 */
function key() {
  return Buffer.from(
    crypto.hkdfSync('sha256', env.JWT_ACCESS_SECRET, Buffer.alloc(0), 'cms:secrets:v1', 32),
  )
}

/**
 * Plaintext → `v1:<iv>:<tag>:<ciphertext>` (sab base64).
 *
 * Version prefix pehle din se hai taaki kal algorithm badalna ek **padhne wali** cheez ho,
 * andaaza lagane wali nahi (wahi tark jo `content.version` pe hai).
 *
 * @param {string} plain
 * @returns {string} khaali input pe khaali string — "koi password nahi" ko encrypt karne ka
 *   koi matlab nahi, aur khaali hi wo nishaan hai jise `hasPassword` padhta hai
 */
export function encryptSecret(plain) {
  if (!plain) return ''

  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv)
  const ciphertext = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])

  return [
    VERSION,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

/**
 * `v1:…` → plaintext. Na khul paaye to **`null`, throw nahi**.
 *
 * ⚠️ Ye "fail soft" wahi faisla hai jo `revalidateTags()` pe hai aur usi wajah se hai:
 * padhne wala hamesha ek settings screen ya ek mail bhejne ki koshish hai. Throw karne ka
 * matlab hota ki JWT secret rotate karte hi **admin ka poora Email screen 500 deta** —
 * yaani wo jagah hi band ho jaati jahan se client password theek kar sakta tha.
 *
 * Chup nahi hai: har fail `logger.warn` me jaata hai, warna "password save to hua par mail
 * nahi jaata" wala ticket bina surag ke aata (D-86 ka sabak).
 *
 * @param {string} blob
 * @returns {string|null}
 */
export function decryptSecret(blob) {
  if (!blob) return null

  const parts = String(blob).split(':')
  if (parts.length !== 4 || parts[0] !== VERSION) {
    logger.warn({ version: parts[0] }, 'Stored secret is in an unknown format')
    return null
  }

  const [, iv, tag, ciphertext] = parts

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    /**
     * ⚠️ `err` jaan-boojh kar log me nahi jaata. GCM ka fail hona do me se ek matlab rakhta
     * hai — galat key, ya chhed-chhaad — aur dono me se koi bhi detail secret ke baare me
     * batati hai. Ek line kaafi hai.
     */
    logger.warn('Stored secret could not be decrypted — it was likely encrypted with another key')
    return null
  }
}
