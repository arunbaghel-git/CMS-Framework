import { lookup } from 'node:dns/promises'

import { env } from './env.js'

/**
 * Google se sheet aur doc laana — Bulk Upload ka bahar se baat karne wala hissa (D-81).
 *
 * ## Koi account, koi API key, koi OAuth nahi
 *
 * Ye endpoints wahi hain jo browser me **File → Download** dabane pe chalte hain. Naap kar
 * dekha gaya (3 Sep):
 *
 * | Raasta | Nateeja |
 * | --- | --- |
 * | `docs.google.com/…/export?format=csv` | **200** — bina kisi login ke |
 * | `docs.google.com/…/export?format=html` | **200** — bina kisi login ke |
 * | `sheets.googleapis.com/v4/…` (asli API) | **403** — _"unregistered callers"_ |
 *
 * Isliye asli API chhod kar export wala raasta liya gaya. Shart ek hi hai: file **"anyone with
 * the link"** pe shared ho.
 *
 * ## ⚠️ Shared na ho to Google 200 hi bhejta hai — error nahi
 *
 * Ye is poore feature ka sabse dhokebaaz failure hai. Doc private ho jaaye to Google **404 ya
 * 403 nahi** deta; wo **200 ke saath sign-in ka HTML page** bhej deta hai. Us page me hamara
 * koi label nahi hota, to parser khaali haath lautta hai aur row *"Package Name is missing"*
 * pe fail hoti — ek aisa message jo poori tarah gumraah karta hai.
 *
 * Isliye jawab ko **dekh kar** pehchana jaata hai (`looksLikeSignIn`), sirf status code se nahi.
 */

/** Ek doc ~0.5s me aata hai (naapa gaya). 20s ke baad wo aa hi nahi raha. */
const TIMEOUT_MS = 20_000

/** Ek doc kitna bada ho sakta hai — 6 din ka itinerary ~400KB tak jaata hai. */
const MAX_DOC_BYTES = 5 * 1024 * 1024

/** Sheet chhoti hoti hai — usme sirf URL ki list hai. */
const MAX_SHEET_BYTES = 1 * 1024 * 1024

export class FetchError extends Error {
  constructor(message) {
    super(message)
    this.name = 'FetchError'
  }
}

/** `https://docs.google.com/spreadsheets/d/<id>/edit#gid=0` → `<id>` */
export function sheetIdFromUrl(url) {
  return String(url ?? '').match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? null
}

/** `https://docs.google.com/document/d/<id>/edit?usp=sharing` → `<id>` */
export function docIdFromUrl(url) {
  return String(url ?? '').match(/document\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? null
}

/**
 * Jawab sign-in ka page to nahi hai?
 *
 * Google ka login page har baar in me se kuch na kuch rakhta hai. Ek bhi mil jaaye to ye
 * hamara doc nahi hai.
 */
export function looksLikeSignIn(body, finalUrl = '') {
  if (/accounts\.google\.com/i.test(finalUrl)) return true

  const head = String(body ?? '').slice(0, 4000)

  return /ServiceLogin|accountchooser|<title>\s*(Sign in|Meet Google)/i.test(head)
}

/** Response ko byte cap ke saath text me padho. */
async function readCapped(res, cap, what) {
  const declared = Number(res.headers.get('content-length') ?? 0)
  if (declared > cap) throw new FetchError(`${what} is too large (over ${cap / 1024 / 1024}MB)`)

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length > cap)
    throw new FetchError(`${what} is too large (over ${cap / 1024 / 1024}MB)`)

  return buffer
}

/**
 * Ek GET, timeout ke saath.
 *
 * ⚠️ `AbortSignal.timeout` **zaroori hai**. Is repo ka akela doosra outbound call
 * (`core/revalidate.js`) bina timeout ka hai, par wo fail-soft hai aur ek hi baar chalta hai.
 * Yahan 20 doc ek ke baad ek aate hain — ek atka hua request poore import ko hamesha ke liye
 * rok deta.
 */
async function get(url, { fetchImpl = fetch } = {}) {
  try {
    return await fetchImpl(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; CMS-BulkImport/1.0)' },
    })
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new FetchError('Google did not respond in time — try again')
    }

    throw new FetchError(`Could not reach Google: ${err?.message ?? 'network error'}`)
  }
}

const NOT_SHARED =
  "This file isn't shared publicly. In Google Drive open Share and set it to " +
  '"Anyone with the link — Viewer", then run the import again.'

/**
 * Sheet ka CSV.
 *
 * @param {string} sheetId
 * @returns {Promise<string>}
 */
export async function fetchSheetCsv(sheetId, options = {}) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
  const res = await get(url, options)

  if (!res.ok) {
    throw new FetchError(res.status === 404 ? 'That sheet does not exist' : NOT_SHARED)
  }

  const text = (await readCapped(res, MAX_SHEET_BYTES, 'The sheet')).toString('utf8')

  /**
   * ⚠️ Content-type bhi dekha jaata hai. Sign-in page `text/html` hota hai; asli export
   * `text/csv`. Sirf body dekhne se ek aisi sheet chhoot sakti hai jisme sach me HTML likha ho.
   */
  const type = res.headers.get('content-type') ?? ''
  if (!/csv/i.test(type) || looksLikeSignIn(text, res.url)) throw new FetchError(NOT_SHARED)

  return text
}

/**
 * Doc ka HTML — **saaf kiye bina**. Safai `cleanGoogleHtml()` karta hai.
 *
 * @param {string} docId
 * @returns {Promise<string>}
 */
export async function fetchDocHtml(docId, options = {}) {
  const url = `https://docs.google.com/document/d/${docId}/export?format=html`
  const res = await get(url, options)

  if (!res.ok) {
    throw new FetchError(res.status === 404 ? 'That document does not exist' : NOT_SHARED)
  }

  const html = (await readCapped(res, MAX_DOC_BYTES, 'The document')).toString('utf8')

  if (looksLikeSignIn(html, res.url)) throw new FetchError(NOT_SHARED)

  return html
}

/* ── banner image ─────────────────────────────────────────────────────────── */

/**
 * Private aur andar ki taraf jaane wale pate.
 *
 * ⚠️ **Ye is repo ka pehla user-controlled outbound URL hai, aur wahi ise khatarnak banata
 * hai.** `Banner Image URL` client ke Google Doc se aata hai — yaani us URL ko koi bhi likh
 * sakta hai jise doc pe edit ka haq ho. Bina rok ke wo `http://169.254.169.254/…` (cloud ka
 * metadata, jahan credentials milte hain) ya `http://localhost:4000/api/…` (hamari apni API,
 * server ke andar se — yaani auth ke peeche se) daal sakta hai. Ye SSRF hai.
 *
 * `core/revalidate.js` pe ye khatra nahi tha: uska pata config se aata hai, kisi input se nahi.
 */
const BLOCKED_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^0\./,
]

const isPrivateAddress = (address, family) => {
  if (family === 6) {
    const lower = address.toLowerCase()

    return (
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    )
  }

  return BLOCKED_V4.some((range) => range.test(address))
}

/**
 * URL bahar ki duniya ka hai ya nahi — request bhejne se **pehle**.
 *
 * Hostname resolve kar ke uska asli IP dekha jaata hai. Sirf naam dekhna kaafi nahi:
 * `evil.example.com` bhi `127.0.0.1` pe point kar sakta hai.
 */
export async function assertPublicUrl(rawUrl) {
  let url

  try {
    url = new URL(String(rawUrl))
  } catch {
    throw new FetchError('That is not a valid URL')
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new FetchError('Only http and https links are allowed')
  }

  let resolved

  try {
    resolved = await lookup(url.hostname, { all: true })
  } catch {
    throw new FetchError(`Could not resolve ${url.hostname}`)
  }

  for (const { address, family } of resolved) {
    if (isPrivateAddress(address, family)) {
      throw new FetchError(`${url.hostname} points to a private address, which is not allowed`)
    }
  }

  return url
}

/**
 * Google Drive ke share link ko seedhe download me badlo.
 *
 * `drive.google.com/file/d/<id>/view` **HTML ka page** deta hai, image nahi. Client aksar wahi
 * link paste karta hai, aur bina is badlav ke `createMediaFromUpload` ek samajh se bahar error
 * deta: *"file type does not match its contents"*.
 */
export function directImageUrl(rawUrl) {
  const id = String(rawUrl ?? '').match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]

  return id ? `https://drive.google.com/uc?export=download&id=${id}` : String(rawUrl ?? '')
}

/**
 * Banner image laao — bytes aur uska asli mime.
 *
 * @returns {Promise<{ bytes: Buffer, mime: string, filename: string }>}
 */
export async function fetchImage(rawUrl, options = {}) {
  const target = directImageUrl(rawUrl)
  const url = await assertPublicUrl(target)
  const res = await get(url.href, options)

  if (!res.ok) throw new FetchError(`The image could not be downloaded (HTTP ${res.status})`)

  const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()

  if (!mime.startsWith('image/')) {
    throw new FetchError(
      'That link is not a direct image link — it returned a web page. Use a link that ends in .jpg, .png or .webp.',
    )
  }

  const bytes = await readCapped(res, env.MAX_UPLOAD_MB * 1024 * 1024, 'The image')
  const name = url.pathname.split('/').filter(Boolean).pop() || 'banner'

  return { bytes, mime, filename: name }
}
