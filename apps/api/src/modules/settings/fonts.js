import { createHash } from 'node:crypto'

import { DEFAULT_SITE_ID, FONT_FAMILY_RE, FONT_WEIGHTS } from '@cms/shared'

import { badRequest, unprocessable } from '../../core/errors.js'
import { logger } from '../../core/logger.js'
import { getStorageDriver } from '../media/storage/index.js'

/**
 * Settings ▸ Fonts ki files — Google se download, aur custom WOFF/WOFF2 upload (client, 17 Sep).
 *
 * ## Google font **isi site se** aata hai
 *
 * Save pe server `fonts.googleapis.com` se CSS aur `fonts.gstatic.com` se woff2 laata hai aur apne
 * storage (`/uploads/sites/<site>/fonts/…`) me rakhta hai. Visitor ka browser Google se kuch nahi
 * maangta — speed (D-85: font hi sabse bada farak tha) aur privacy dono. File ka naam content ka hash hai,
 * isliye `/uploads` ka `immutable` cache (D-84) yahan bhi sahi hai.
 *
 * Sirf do host se baat hoti hai, aur CSS ke andar ka har URL `https://fonts.gstatic.com/` se shuru hona
 * chahiye — koi aur URL aaya to wo file li hi nahi jaati (SSRF ka raasta band).
 */

const CSS_HOST = 'https://fonts.googleapis.com/css2'
const FILE_HOST = 'https://fonts.gstatic.com/'
/** Modern browser ka UA — iske bina Google purana TTF bhejta hai, woff2 nahi. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const TIMEOUT_MS = 15_000
const MAX_FONT_BYTES = 2 * 1024 * 1024
/** Sirf Latin — baaki scripts (cyrillic, vietnamese…) is site pe kaam ki nahi, aur har ek ek aur file hai. */
const KEEP_SUBSETS = ['latin', 'latin-ext']

/** Kram maayne rakhta hai — upar wala mile to kam files (variable font = har subset ki ek file). */
const GOOGLE_AXES = [
  ':wght@100..900',
  ':wght@200..900',
  ':wght@300..900',
  ':wght@400..900',
  ':wght@300;400;500;600;700;800;900',
  ':wght@100;200;300;400;500;600;700;800;900',
  ':wght@300;400;500;600;700',
  ':wght@400;500;600;700',
  ':wght@400;700',
  '',
]

/** Test me network nahi — `setFontFetchForTest()` nakli fetch deta hai. */
let fetchImpl = (...args) => globalThis.fetch(...args)
export function setFontFetchForTest(fn) {
  fetchImpl = fn ?? ((...args) => globalThis.fetch(...args))
}

async function get(url, kind) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetchImpl(url, {
      headers: { 'user-agent': UA, accept: kind === 'css' ? 'text/css' : '*/*' },
      redirect: 'error',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const hashOf = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 16)

/**
 * Google CSS se `@font-face` blocks — `/* latin *\/` jaisi comment block ke upar hoti hai.
 * Comment na ho (ek hi subset) to sab rakho.
 */
export function parseGoogleCss(css) {
  const faces = []
  const re = /(?:\/\*\s*([a-z0-9-]+)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/gi
  let m
  while ((m = re.exec(css))) {
    const subset = m[1]
    const body = m[2]
    if (subset && !KEEP_SUBSETS.includes(subset)) continue

    const url = body.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)\s]+)\)/)?.[1]
    if (!url) continue

    const weight = body.match(/font-weight:\s*(\d{3}(?:\s+\d{3})?)/)?.[1] ?? '400'
    const style = /font-style:\s*italic/.test(body) ? 'italic' : 'normal'
    const unicodeRange = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim() ?? ''
    faces.push({ url, weight, style, unicodeRange })
  }
  return faces
}

/**
 * Ek Google family ki files laao aur storage me rakho → `faces` (site ke apne URL ke saath).
 *
 * Google ek bhi na-maujood weight maango to **400** deta hai, aur har family ke weight alag hain. Isliye
 * `GOOGLE_AXES` kram se aazmaye jaate hain — pehle variable range (ek file saare weight), phir static list.
 * Asli Google pe naapa (17 Sep): DM Sans pehli koshish, Merriweather teesri, Playfair chauthi, Poppins chhathi.
 *
 * @returns {Promise<Array<{url:string, weight:string, style:string, unicodeRange:string}>>}
 */
export async function downloadGoogleFont(family, siteId = DEFAULT_SITE_ID) {
  if (!FONT_FAMILY_RE.test(family))
    throw badRequest('Font name can only use letters, numbers and spaces')

  const name = family.trim().replace(/ +/g, '+')
  let css = null
  for (const axis of GOOGLE_AXES) {
    try {
      const res = await get(`${CSS_HOST}?family=${name}${axis}&display=swap`, 'css')
      if (res.ok) {
        css = await res.text()
        break
      }
    } catch (err) {
      /** Network hi nahi — agle axis aazmane ka faayda nahi */
      logger.warn({ err, family }, 'Google Fonts CSS nahi aayi')
      break
    }
  }
  if (!css) {
    throw unprocessable(
      `"${family}" was not found on Google Fonts. Check the spelling on fonts.google.com.`,
    )
  }

  const remote = parseGoogleCss(css)
  if (!remote.length) throw unprocessable(`Google Fonts has no Latin files for "${family}".`)

  const storage = getStorageDriver()
  const saved = new Map()
  const faces = []
  for (const face of remote) {
    if (!face.url.startsWith(FILE_HOST)) continue

    let url = saved.get(face.url)
    if (!url) {
      const res = await get(face.url, 'file')
      if (!res.ok)
        throw unprocessable(`Couldn't download "${family}" from Google Fonts. Try again.`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > MAX_FONT_BYTES || buf.subarray(0, 4).toString('latin1') !== 'wOF2') {
        throw unprocessable(`Google Fonts sent an unexpected file for "${family}".`)
      }
      const key = `sites/${siteId}/fonts/google/${slug(family)}/${hashOf(buf)}.woff2`
      ;({ url } = await storage.putObject({ key, body: buf, contentType: 'font/woff2' }))
      saved.set(face.url, url)
    }
    faces.push({ url, weight: face.weight, style: face.style, unicodeRange: face.unicodeRange })
  }

  return faces
}

/** Naam se weight ka andaaza — admin baad me badal sakta hai. */
export function guessFontWeight(filename) {
  const n = String(filename).toLowerCase()
  if (/extrabold|extra-bold|ultrabold|heavy/.test(n)) return '800'
  if (/black/.test(n)) return '900'
  if (/semibold|semi-bold|demibold|demi-bold/.test(n)) return '600'
  if (/bold/.test(n)) return '700'
  if (/medium/.test(n)) return '500'
  if (/light|thin/.test(n)) return '300'
  return '400'
}

/**
 * Custom font file (Settings ▸ Fonts ▸ Custom font) — naam nahi, **andar ke bytes** dekh kar.
 *
 * `.woff2` naam wali PNG ya script bhi aa sakti hai; asli WOFF2 `wOF2` se aur WOFF `wOFF` se shuru hoti
 * hai. Wahi soch jo media upload ki magic-byte jaanch me hai.
 */
export async function saveCustomFontFile(file, siteId = DEFAULT_SITE_ID) {
  if (!file?.buffer?.length) throw badRequest('Choose a .woff2 or .woff file')
  if (file.buffer.length > MAX_FONT_BYTES) throw badRequest('Font file is too large (max 2MB)')

  const magic = file.buffer.subarray(0, 4).toString('latin1')
  const ext = magic === 'wOF2' ? 'woff2' : magic === 'wOFF' ? 'woff' : null
  if (!ext) throw badRequest('This is not a WOFF or WOFF2 font file')

  const key = `sites/${siteId}/fonts/custom/${hashOf(file.buffer)}.${ext}`
  const { url } = await getStorageDriver().putObject({
    key,
    body: file.buffer,
    contentType: `font/${ext}`,
  })

  const name = String(file.originalname ?? '').slice(0, 120)
  const weight = guessFontWeight(name)
  return {
    url,
    name,
    weight: FONT_WEIGHTS.includes(weight) ? weight : '400',
    style: /italic/i.test(name) ? 'italic' : 'normal',
  }
}
