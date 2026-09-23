import { escapeHtml, isEmptyHtml } from './schemas/rich-html.js'

/**
 * Nayi enquiry ki mail — `Email enquiries to` wale pate(on) pe (D-109, A-43 band).
 *
 * Mail **team ko** jaati hai, form bharne wale ko nahi (client, 23 Sep: _"mail will not go to user
 * who fill the form, it will go to the Email enquiries to who is handling the enquiry"_). Subject
 * aur message admin har form pe khud likhta hai, aur usme `{{fullName}}` jaise variable form ke
 * **apne** fields se bharte hain.
 *
 * ## Ye `packages/shared` me kyun hai, `forms/service.js` me kyun nahi
 *
 * Do grahak hain — API (mail banana) aur admin (variables ke chips). Aur ek sabak bhi: D-105 aur
 * D-108 §9 dono me niyam `submit()` ke andar tha, jiska test likha hi nahi ja sakta tha, aur
 * dono baar galti wahin chup padi rahi. Yahan har niyam ek pure function me hai, apne test ke saath.
 *
 * ## Teen suraksha niyam — teenon ka test hai
 *
 * 1. **Bharne wale ki har value HTML-escape hoti hai.** Template admin ka likha hai (write pe
 *    sanitize, R20), par values **bahar** se aati hain. Naam ki jagah `<a href=…>` likh diya to wo
 *    team ke inbox me ek chalta hua link ban jaata — hamare hi domain se.
 * 2. **Subject me newline nahi bachta.** Header me `\r\n` = naya header (email header injection).
 *    Nodemailer khud bhi rokta hai; ye doosra pehra hai, aur isse subject ek line me bhi rehta hai.
 * 3. **Anjaan variable chup-chaap khaali hota hai.** Mail me `{{xyz}}` chhapna tooti hui cheez
 *    jaisa dikhta hai (D-30), aur field hat jaaye to purana template phir bhi chale.
 */

/**
 * Chaar system variable — `snake_case` jaan-boojh kar.
 *
 * Field ki `key` sirf `[a-zA-Z][a-zA-Z0-9]*` ho sakti hai (`formFieldSchema`), yaani usme `_` aa hi
 * nahi sakta. Isliye koi field kabhi `form_name` naam le kar system variable ko dhak nahi sakti.
 */
export const ENQUIRY_MAIL_SYSTEM_VARS = Object.freeze([
  { token: 'all_fields', label: 'Everything they filled in' },
  { token: 'form_name', label: 'Form name' },
  { token: 'page_url', label: 'Page it was sent from' },
  { token: 'enquiry_id', label: 'Enquiry ID' },
])

/**
 * Naye form ka shuruaati template — admin ka form **inse bhara hua** khulta hai (D-65 ka sabak:
 * placeholder pe client kuch hata hi nahi sakta).
 *
 * ⚠️ Khaali subject/message pe bhi yahi chalta hai (`renderEnquiryMail()`). Bina subject ki mail
 * spam filter ka pehla nishana hai, aur khaali message wali mail bemaani — "khaali" ka yahan koi
 * doosra matlab ho hi nahi sakta. Mail band karne ka raasta `Email enquiries to` khaali karna hai.
 */
export const DEFAULT_ENQUIRY_MAIL_SUBJECT = 'New enquiry — {{form_name}}'

export const DEFAULT_ENQUIRY_MAIL_BODY =
  '<p>A new enquiry has come in on the <strong>{{form_name}}</strong> form.</p>' +
  '<p>{{all_fields}}</p>' +
  '<p>Sent from: {{page_url}}</p>' +
  '<p>Reply to this email to answer them directly.</p>'

const TOKEN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g

/**
 * `sales@x.com, ops@x.com` → do pate.
 *
 * `emailTo` ka schema jaan-boojh kar dheela hai (client beech me space ya `;` likh deta hai), isliye
 * parse **bhejne se pehle** hota hai — wahi jagah jahan uske schema ka comment kehta tha. Jo pata
 * email jaisa nahi dikhta wo gir jaata hai; ek galat pate ki wajah se baaki team ko mail na jaaye,
 * ye galat trade hota.
 *
 * @param {unknown} list
 * @returns {string[]}
 */
export function parseEmailList(list) {
  const seen = new Set()

  return String(list ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => {
      const key = s.toLowerCase()
      if (!isEmailLike(s) || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** Seedha-saada — `@` ke dono taraf kuch, domain me ek `.`, koi space/angle bracket nahi. */
export function isEmailLike(value) {
  return /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(String(value ?? ''))
}

/**
 * Admin ke chips — is form ke dikhne wale fields, phir chaar system variable.
 *
 * `hidden` type chhoda jaata hai: wo field admin haath se nahi jodta aur 2 Sep ke baad koi naya
 * form use banata bhi nahi (`FORM_FIELD_TYPES` ka comment).
 *
 * @param {{ fields?: Array<{ key: string, label?: string, type?: string, show?: boolean }> }} form
 * @returns {Array<{ token: string, label: string }>}
 */
export function enquiryMailVariables(form) {
  const fields = (form?.fields ?? [])
    .filter((f) => f && f.show !== false && f.type !== 'hidden')
    .map((f) => ({ token: f.key, label: f.label || f.key }))

  return [...fields, ...ENQUIRY_MAIL_SYSTEM_VARS]
}

/** Checkbox ka `true` mail me `true` nahi, `Yes` padhta hai. */
function displayValue(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (value === null || value === undefined) return ''

  return String(value)
}

/**
 * Bhare hue khaane, form ke kram me — `[label, value]`.
 *
 * Kram form ka hai, `values` ka nahi: team ko mail wahi dikhe jo form pe dikhta hai. Jo khaana
 * bhara nahi gaya uski khaali line nahi (Enquiry Detail bhi yahi karti hai).
 */
function filledRows(form, values) {
  const rows = []
  const seen = new Set()

  for (const field of form?.fields ?? []) {
    if (!field || seen.has(field.key)) continue
    seen.add(field.key)

    const text = displayValue(values?.[field.key])
    if (text) rows.push([field.label || field.key, text])
  }

  /** Form submit ke baad badal gaya ho to bhi koi value mail se **gayab** nahi hoti. */
  for (const [key, value] of Object.entries(values ?? {})) {
    if (seen.has(key)) continue
    const text = displayValue(value)
    if (text) rows.push([key, text])
  }

  return rows
}

/**
 * `{{all_fields}}` ki table — **inline style**, kyunki Gmail/Outlook `<style>` ko bharose se nahi
 * padhte. Har value escape hoti hai, aur textarea ki nayi line `<br>` banti hai.
 */
function fieldsTable(rows) {
  if (!rows.length) return ''

  const cell = 'padding:6px 12px;border:1px solid #e2e4e7;vertical-align:top;text-align:left'
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><th style="${cell};background:#f6f7f7;font-weight:600">${escapeHtml(label)}</th>` +
        `<td style="${cell}">${escapeHtml(value).replace(/\r?\n/g, '<br>')}</td></tr>`,
    )
    .join('')

  return `<table style="border-collapse:collapse;font-size:14px" cellpadding="0" cellspacing="0">${body}</table>`
}

/**
 * HTML → mail ka saada text roop (jo client HTML nahi dikhate unke liye, aur spam score ke liye).
 *
 * `htmlToText()` (`rich-html.js`) yahan kaam nahi karta — wo sab kuch **ek line** me jod deta hai
 * (read time ke liye sahi hai), aur mail me paragraph aur table ki har row alag line pe chahiye.
 */
function htmlToMailText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/t[hd]>\s*<t[hd][^>]*>/gi, ': ')
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) =>
      text.trim() === href ? href : `${text} (${href})`,
    )
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Template → asli mail.
 *
 * @param {{ subject?: string, body?: string }} template form ka `notifyEmail`
 * @param {object} ctx
 * @param {{ name?: string, fields?: Array<object> }} ctx.form
 * @param {Record<string, unknown>} ctx.values bhare hue khaane
 * @param {string} [ctx.pageUrl] poora URL — `sourcePath` nahi (D-90 wala bug)
 * @param {string} [ctx.enquiryId]
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderEnquiryMail(template, { form, values = {}, pageUrl = '', enquiryId = '' }) {
  const rows = filledRows(form, values)
  const table = fieldsTable(rows)

  /** Ek variable ki saada value — subject aur body dono isi se, bas body me escape hoti hai. */
  const plain = (token) => {
    if (token === 'form_name') return form?.name ?? ''
    if (token === 'page_url') return pageUrl
    if (token === 'enquiry_id') return enquiryId
    if (token === 'all_fields') return rows.map(([label, value]) => `${label}: ${value}`).join(', ')

    return displayValue(values?.[token])
  }

  const subjectTemplate = String(template?.subject ?? '').trim() || DEFAULT_ENQUIRY_MAIL_SUBJECT
  const subject = subjectTemplate
    .replace(TOKEN, (_, token) => plain(token))
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 250)

  const bodyTemplate = isEmptyHtml(template?.body)
    ? DEFAULT_ENQUIRY_MAIL_BODY
    : String(template.body)

  const html = bodyTemplate
    /**
     * ⚠️ Editor `{{all_fields}}` ko **`<p>` ke andar** rakhta hai — aur `<p>` ke andar `<table>`
     * galat HTML hai; kai mail client us `<p>` ko table se pehle hi band kar dete hain aur ek khaali
     * line bach jaati hai. Isliye akela `{{all_fields}}` wala paragraph poora table se badalta hai.
     */
    .replace(/<p[^>]*>\s*\{\{\s*all_fields\s*\}\}\s*<\/p>/g, table)
    .replace(TOKEN, (_, token) => {
      if (token === 'all_fields') return table

      /**
       * `page_url` bhi saada escaped text hai, `<a>` nahi — admin use khud link ke andar likh sakta
       * hai (`<a href="{{page_url}}">`), aur tab hamara `<a>` attribute ke andar HTML tod deta. Mail
       * client khule URL ko khud link bana dete hain.
       */
      return escapeHtml(plain(token)).replace(/\r?\n/g, '<br>')
    })

  return { subject, html, text: htmlToMailText(html) }
}
