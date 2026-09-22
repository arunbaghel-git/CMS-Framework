import nodemailer from 'nodemailer'

import { env, isTest } from './env.js'
import { logger } from './logger.js'

/**
 * Mail bhejne ka ekmatra raasta — D-108.
 *
 * Ye `core/` me hai, kisi module me nahi, aur uski wajah wahi hai jo `revalidate.js` ki
 * hai: iska koi apna collection nahi, aur ise **kai module** bulaayenge. Aaj sirf
 * `settings` (test email), kal `forms` (enquiry notification) aur `auth` (password reset).
 * Ek module ke andar rakhne ka matlab hota ki `auth` ko `forms` import karna pade.
 *
 * ## Fail soft, par chup nahi
 *
 * Mail fail hone ka matlab hai "notification nahi gaya" — uske liye **caller ka kaam rok
 * dena galat trade hai**. Sabse saaf misaal aage aayegi: enquiry submit hone pe mail
 * jaayega, aur SMTP band hone se **client ki enquiry kho jaana** kabhi theek nahi hai.
 * Isliye `sendMail()` kabhi throw nahi karta — `{ ok: false }` deta hai aur `logger.warn`
 * likhta hai.
 *
 * ⚠️ **`sendTestEmail()` isme apwaad hai aur wo jaan-boojh kar hai** — wahan fail hona hi
 * jawab hai. Us button ka poora kaam hi ye batana hai ki config chalti hai ya nahi.
 */

/**
 * Config kahan se aati hai — **DB pehle, env baad me**.
 *
 * Dono rakhne ki wajah do alag log hain. Client (non-technical) ke liye admin screen hai;
 * `.env` wo kabhi nahi khologa. Par CI, dev aur purane deploy `SMTP_*` pe pehle se khade
 * hain (spec 003, 19 Aug se) aur unhe todna bemaani hai.
 *
 * ⚠️ **Kram palat-na mana hai.** Env ko jitwane ka matlab hota ki client admin me value
 * badle, "Saved." dekhe, aur mail phir bhi purane account se jaaye — yaani wahi **"kuch na
 * hona"** wala lakshan jo is repo ka sabse baar-baar aane wala bug hai (A-41).
 *
 * ⚠️ **Har khaana alag se girta hai, poora object nahi.** `host` DB me ho aur `user` na ho
 * to sirf `user` env se aayega. Poore object ko ek saath badalna ek aadhi bhari hui screen
 * ko chup-chaap poore env pe daal deta.
 *
 * @param {object} [mail] `settings.mail` ka document — `getMailConfig()` deta hai
 */
export function resolveMailConfig(mail = {}) {
  const host = mail.host || env.SMTP_HOST || ''
  const port = mail.port || env.SMTP_PORT || 587
  const user = mail.user || env.SMTP_USER || ''
  const password = mail.password || env.SMTP_PASS || ''
  const fromEmail = mail.fromEmail || env.MAIL_FROM || ''
  const fromName = mail.fromName || ''

  return {
    /**
     * ⚠️ **Sirf `host` ki shart hai, `user`/`password` ki nahi.** Bina auth wale SMTP asli
     * hote hain — dev ka MailDev, aur kai company ke andar ke relay. `user` ko zaroori
     * banane se wo dono haath se nikal jaate.
     */
    configured: Boolean(host),
    host,
    port,
    /**
     * Reference me chhe hi khaane hain, koi "Encryption" dropdown nahi (R15) — isliye ye
     * **port se derive** hota hai. 465 implicit TLS hai (SMTPS); 587 aur 25 plain khulte
     * hain aur `STARTTLS` se upgrade hote hain, jo nodemailer khud kar leta hai.
     *
     * Ye andaaza nahi, convention hai: 465 IANA pe `smtps` hai. Ek khaana bachta hai aur
     * client ko ek aisa sawaal nahi milta jiska jawab use pata hi nahi hota.
     */
    secure: Number(port) === 465,
    auth: user ? { user, pass: password } : undefined,
    /** `"Name" <email>` — naam na ho to sirf address. Nodemailer dono samajhta hai. */
    from: fromName && fromEmail ? `"${fromName}" <${fromEmail}>` : fromEmail,
  }
}

/**
 * @param {ReturnType<typeof resolveMailConfig>} config
 */
function createTransport(config) {
  /**
   * ⚠️ **Test me koi asli connection nahi** — bilkul wahi rok jo `revalidateTags()` me
   * `NODE_ENV === 'test'` pe lagi hai (`core/revalidate.js:31`).
   *
   * `jsonTransport` nodemailer ka apna hai: wo message poora banata hai (headers, from,
   * to, body) par bhejta kahin nahi — `info.message` me JSON laut aata hai. Isse test ye
   * assert kar sakta hai ki **kya bheja ja raha tha**, bina kisi SMTP server ke.
   *
   * Bina iske har mail wala test ek connection timeout ka intezaar karta aur suite minton
   * lambi ho jaati — theek wahi shakl jo A-11 me likhi hai.
   */
  if (isTest) return nodemailer.createTransport({ jsonTransport: true })

  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port),
    secure: config.secure,
    auth: config.auth,
    /**
     * Teenon timeout jaan-boojh kar chhote hain. Bina inke ek galat `host` pe nodemailer
     * OS ke default (kai minute) tak latka rehta hai, aur admin ka `Send Test Email`
     * button ek aisi screen ban jaata hai jo kabhi jawab hi nahi deti.
     */
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
}

/**
 * Mail bhejo. **Kabhi throw nahi karta.**
 *
 * @param {object} args
 * @param {string} args.to
 * @param {string} args.subject
 * @param {string} [args.text]
 * @param {string} [args.html]
 * @param {object} [args.mail] `settings.mail` — na ho to sirf env se kaam chalega
 * @returns {Promise<{ok: boolean, skipped?: boolean, messageId?: string, message?: string}>}
 */
export async function sendMail({ to, subject, text, html, mail }) {
  const config = resolveMailConfig(mail)

  /**
   * ⚠️ **Config na hone pe `warn` nahi, `info`** — aur wo farak mayne rakhta hai. SMTP abhi
   * tak kabhi configure hua hi nahi (Phase 0 se blocked), yaani "configured nahi hai" ek
   * **aam haalat** hai, galti nahi. Use `warn` banane ka matlab hota har enquiry pe ek
   * jhoothi chetavni, aur kuch hi din me log ki wo line padhi jaani band ho jaati.
   */
  if (!config.configured) {
    logger.info({ to, subject }, 'Email not sent — SMTP is not configured')
    return { ok: false, skipped: true }
  }

  try {
    const info = await createTransport(config).sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
    })

    return { ok: true, messageId: info.messageId, message: info.message }
  } catch (err) {
    /**
     * ⚠️ `err.message` log me jaata hai, poora `err` nahi — nodemailer ki kai errors me
     * poora SMTP conversation hota hai, aur usme `AUTH PLAIN` wali line **password ke
     * saath** hoti hai. `SMTP_PASS` ko `REDACTED_KEYS` me rakhna is raaste pe kuch nahi
     * karta, kyunki yahan wo env var nahi, error ka text hota hai.
     */
    logger.warn({ to, subject, host: config.host, err: err.message }, 'Email could not be sent')
    return { ok: false, message: err.message }
  }
}

/**
 * `Send Test Email` ka poora kaam — **ye throw karta hai, aur wahi iska maksad hai**.
 *
 * ⚠️ `verify()` pehle chalta hai aur wo `sendMail()` se ek alag cheez batata hai: `verify()`
 * sirf connection aur login jaanchta hai. Isse do galtiyaan **alag** dikhti hain jo warna
 * ek jaisi lagti: "host/password galat hai" (verify pe fail) aur "login to ho gaya par ye
 * From address bhejne nahi deta" (send pe fail — Brevo/SendGrid ka sabse aam reject).
 *
 * Dono ka ilaaj alag hai, isliye dono ka message alag hona chahiye.
 *
 * @param {object} args
 * @param {string} args.to
 * @param {object} [args.mail]
 * @returns {Promise<{ok: true, to: string, message?: string}>}
 * @throws {Error} nodemailer ki asli error — caller use 422 me badalta hai
 */
export async function sendTestEmail({ to, mail }) {
  const config = resolveMailConfig(mail)
  const transport = createTransport(config)

  await transport.verify()

  const info = await transport.sendMail({
    from: config.from,
    to,
    subject: 'Test email from your website',
    text:
      'This is a test email from your website admin panel.\n\n' +
      'If you can read this, your email settings are working and the site can now send ' +
      'mail — enquiry notifications, password resets and anything else that needs email.\n\n' +
      'You can safely delete this message.',
  })

  return { ok: true, to, message: info.message }
}
