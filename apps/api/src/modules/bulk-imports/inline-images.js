import { createHash } from 'node:crypto'

import { DEFAULT_SITE_ID } from '@cms/shared'

import { fetchImage } from '../../core/google-fetch.js'
import { logger } from '../../core/logger.js'
import { Media } from '../media/model.js'
import { createMediaFromUpload } from '../media/service.js'

/**
 * Article ke andar ki images Media library me utaarna — spec 008 (client, 10 Sep).
 *
 * ## ⚠️ Google image ko `data:` URI me bhejta hai — CDN URL me nahi
 *
 * Ye 10 Sep ko asli doc pe naap kar pata chala, aur **pehle yahan iska ulta likha tha**.
 * `export?format=html` ka asli output aisa hai:
 *
 * ```html
 * <img alt="" src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAA…">
 * ```
 *
 * Iske do nateeje hain, aur dono is file ki shakl tay karte hain:
 *
 * 1. **Fetch hoti hi nahi** — bytes doc me hi aa chuke hote hain. `fetchImage()` ise laa bhi
 *    nahi sakti: uska SSRF guard sirf `http`/`https` jaanta hai.
 * 2. **Naam apne aap content ka hash ban jaata hai** — `stemFor()` poori `data:` URI ko hash
 *    karta hai, yaani wahi image hamesha wahi naam. Isliye dobara import pe wo dobara nahi
 *    utarti, aur ye us shak ka bhi jawab hai jo pehle yahan likha tha ("src sthir rahega ya
 *    nahi") — `data:` URI ke saath wo sawaal uthta hi nahi.
 *
 * ⚠️ Bahar ke URL wala raasta phir bhi zinda hai (`fetchImage()` ke saath), kyunki client doc
 * me "Insert → by URL" bhi kar sakta hai aur wo har baar inline nahi hota.
 *
 * Dono soorat me image Media me jaati hai aur `src` hamare apne URL se badal jaata hai. Google
 * ki URI ko DB me chhod dena matlab har post ka HTML **kai sau KB** ka ho jaana, aur ek CDN URL
 * chhod dena matlab kuch hafte baad har image ka toot jaana — D-42 §2 ka seedha ulta.
 *
 * ## ⚠️ Dobara import pe image dobara nahi utarti — aur uska tareeka
 *
 * Client ka faisla (10 Sep): koi naya tracking field nahi banega — wahi soch jo D-79 me
 * `mediaRefs` pe thi. To pehchan **maujooda `filename`** se hoti hai: har source URL ka ek
 * sthir naam banta hai (`doc-image-<sha1 ke 16 akshar>`), aur import se pehle wahi naam Media
 * me dhoondha jaata hai.
 *
 * Iska faayda position se milaane wale tareeke se **bahut zyada** hai: client article ke beech
 * me ek nayi image daal de to baaki sab apni jagah rehti hain. Position se milaane pe wo sab
 * ek-ek khisak jaatin aur **galat image galat jagah** lag jaati — chup-chaap.
 *
 * ⚠️ **Iski ek seema hai, aur wo saaf likhi honi chahiye:** ye tabhi bachata hai jab Google ka
 * `src` do export ke beech wahi rahe. Na rahe to hash badal jaayega aur image dobara utregi —
 * yaani **ek extra media record**, par kabhi **galat image nahi**. Sabse bura nateeja bekaar
 * ka kaam hai, gadbad nahi.
 *
 * ## ⚠️ Har image pe `width`/`height` — 11 Sep, A-21 ke naap ke baad
 *
 * Production build pe Lighthouse ne dikhaya ki article ki bina naap wali image load hote hi
 * neeche ka text khiskaati hai (CLS 0.103). Google apna naap `style` me bhejta hai, jo sanitizer
 * theek hi hata deta hai — to import wali har image bina naap ke thi. Media record me naap pehle
 * se hota hai (`variants[].w/h`), bas use lagaya nahi ja raha tha. Ab `src` ke saath wahi naap
 * lagta hai. D-84 ne baaki site ki images pe yahi kaam kiya tha (12/12).
 */

/** Sirf yahi teen extension ban sakte hain — `MIME_EXTENSION` (`upload-validation.js`). */
const MEDIA_EXTENSIONS = ['jpg', 'png', 'webp']

/**
 * URL hamari **apni** media ki taraf to nahi ja raha?
 *
 * Media ki id URL ke andar hi likhi hoti hai (`buildMediaVariantKey()` ka format), isliye use
 * pehchana ja sakta hai. Client aksar wahi image daalta hai jo pehle se Media me hai — usse
 * download karne ka matlab hota har run pe ek naya record aur teen naye WebP variants.
 *
 * ⚠️ Ye pehle `service.js` me tha. Dono jagah rakhne ka matlab hota ki kal format badle aur ek
 * taraf peeche reh jaaye — wahi D-86 wali khaayi.
 */
export const mediaIdFromUrl = (url) =>
  String(url ?? '').match(/\/uploads\/sites\/[^/]+\/media\/\d{4}\/\d{2}\/([a-f0-9]{24})\//i)?.[1] ??
  null

/** Har `<img …>` tag — band karne wala tag hota hi nahi. */
const IMG_TAG_RE = /<img\b[^>]*>/gi

/**
 * Ek attribute ki value — `"` aur `'` dono chalte hain.
 *
 * ⚠️ Sirf double quotes pakadna wahi chup jaal hai jo `google-html.js` me pehle ek baar ban
 * chuka tha: single quote wala HTML kahin se bhi aa sakta hai, aur tab `src` mil hi nahi
 * paata — yaani image chup-chaap gir jaati.
 */
const attrValue = (tag, name) =>
  tag
    .match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
    ?.slice(2)
    .find((value) => value !== undefined) ?? ''

/** Ek source URL ka sthir naam — wahi URL, wahi naam, har run me. */
const stemFor = (url) =>
  `doc-image-${createHash('sha1').update(String(url)).digest('hex').slice(0, 16)}`

/**
 * Media ka `large` variant — URL **aur naap**. Wahi variant jo public payload chunta hai.
 *
 * Naap usi variant ka hai jiska URL `src` me jaata hai; kisi aur variant ka naap lagana
 * browser ko galat aspect ratio de deta.
 */
const largeOf = (media) => {
  const variants = media?.variants ?? []
  const variant = variants.find((v) => v.key === 'large') ?? variants[0]

  return variant?.url ? { url: variant.url, w: variant.w ?? null, h: variant.h ?? null } : null
}

/**
 * Media tak pahunchne ka raasta — **inject ho sakta hai**.
 *
 * ⚠️ Wajah asli hai, sirf shaili ki nahi: `media.test.js` ki `beforeEach` `UPLOAD_ROOT` ko
 * `rm -rf` karti hai **aur** `Media.deleteMany({})` chalati hai — dono bina `siteId` ke. Vitest
 * files parallel chalata hai, to jo bhi test in dono ko sach me chhuye wo doosri file ke saath
 * race karta hai, aur uska lakshan ek logic bug jaisa dikhta hai (A-11/A-16 wala ilaaka).
 *
 * Yahi convention is module me pehle se hai (`deps.fetchImpl`) aur
 * `createMediaFromUpload(input, { storage })` pe bhi.
 *
 * ⚠️ **Port ke andar sirf DB ka kaam hai — naam banana bahar hai.** `stemFor()` dono taraf
 * production code me hi rehta hai, taaki "dhoondhne ka naam" aur "save karne ka naam" kabhi
 * alag na ho paayein. Wahi ek khaayi D-86 me har import pe duplicate bana rahi thi, aur use
 * test se bahar rakh dena us bug ko dobara jagah de deta.
 */
const mongoMediaPort = {
  async findByFilenames(filenames, siteId) {
    const found = await Media.findOne({
      siteId,
      deletedAt: null,
      filename: { $in: filenames },
    }).lean()

    return found ? { id: String(found._id), variants: found.variants ?? [] } : null
  },

  create: createMediaFromUpload,
}

/**
 * Pehle se utari hui image dhoondho — na mile to `null`.
 *
 * `$in` se exact match hota hai, regex se nahi: ginti teen hi hai (`MEDIA_EXTENSIONS`), aur
 * exact match index ka faayda leta hai. Extension isliye guess karni padti hai ki wo
 * `ensureExtension()` detected mime se lagata hai — aur mime download ke **baad** hi pata
 * chalta hai, jabki dhoondhna download se **pehle** hota hai.
 */
const findImportedMedia = (url, siteId, port) =>
  port.findByFilenames(
    MEDIA_EXTENSIONS.map((ext) => `${stemFor(url)}.${ext}`),
    siteId,
  )

/**
 * `data:image/jpeg;base64,…` → bytes aur mime. Doosri shakl pe `null`.
 *
 * ⚠️ **Yahi shakl asli me sabse zyada aati hai**, aur ye 10 Sep ko naap kar pata chala.
 * `export?format=html` doc me paste ki hui har image ko **inline base64** me bhejta hai, kisi
 * CDN URL me nahi.
 */
const DATA_URI_RE = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i

function decodeDataUri(src) {
  const match = String(src ?? '').match(DATA_URI_RE)

  if (!match) return null

  return { bytes: Buffer.from(match[2], 'base64'), mime: match[1].toLowerCase() }
}

/** Ek image utaar kar Media me daalo — `data:` URI se ya bahar ke URL se. `{ url, w, h }` lautta hai. */
async function importOne(url, actor, siteId, deps) {
  const port = deps.mediaPort ?? mongoMediaPort

  const existing = await findImportedMedia(url, siteId, port)
  if (existing) return largeOf(existing)

  /**
   * ⚠️ `data:` pe **koi fetch nahi hoti** — bytes doc me hi hain.
   *
   * `fetchImage()` ise waise bhi nahi laa sakti: uska SSRF guard sirf `http`/`https` jaanta hai
   * aur `data:` ko theek hi thukra deta. Us raaste par jaane ka matlab hota har image pe ek
   * bemaani error, aur client ko ek aisa message jo uski galti jaisa dikhta — theek wahi shakl
   * jo D-81 me `localhost` wale banner URL pe bani thi.
   */
  const { bytes, mime } = decodeDataUri(url) ?? (await fetchImage(url, deps))

  const media = await port.create(
    {
      filename: stemFor(url),
      declaredMime: mime,
      size: bytes.length,
      bytes,
      uploadedBy: actor.user._id,
    },
    { siteId },
  )

  return largeOf(media)
}

/**
 * `src` badlo aur Media ka naap lagao.
 *
 * ⚠️ Pehle ka `width`/`height` **hataya jaata hai**, sirf naya joda nahi jaata. Do baar likha
 * attribute browser pehla wala padhta hai — yaani Google ya kisi paste ka purana naap jeet
 * jaata aur image galat aspect ratio me khulti.
 *
 * Naap na ho (purana variant, jisme `w`/`h` store hi nahi hua) to sirf `src` badalta hai — wahi
 * jo 11 Sep se pehle hota tha. Galat naap se koi naap na hona behtar hai.
 */
function withImage(tag, src, image) {
  const swapped = tag
    .replace(/\s(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(src, image.url)

  if (!image.w || !image.h) return swapped

  return swapped.replace(/\s*(\/?>)$/, ` width="${image.w}" height="${image.h}"$1`)
}

/**
 * Article ki HTML me har `<img>` ka `src` hamare apne URL se badlo, aur naap lagao.
 *
 * @param {string} html `cleanGoogleHtml()` se guzri hui article HTML
 * @param {{ actor: object, siteId?: string, deps?: object }} options
 * @returns {Promise<{ html: string, issues: object[] }>}
 */
export async function importInlineImages(
  html,
  { actor, siteId = DEFAULT_SITE_ID, deps = {} } = {},
) {
  const source = String(html ?? '')
  const tags = source.match(IMG_TAG_RE) ?? []

  if (tags.length === 0) return { html: source, issues: [] }

  const issues = []

  /**
   * ⚠️ Ek hi image do jagah likhi ho to wo **ek hi baar** utregi.
   *
   * Bina iske ek doc me chaar baar aayi image chaar media record banati. `findImportedMedia()`
   * bhi ise pakad leta par tabhi jab pehli wali **save ho chuki** ho — aur ye sab ek hi run me
   * chalta hai, isliye naksha yahan bhi chahiye.
   *
   * Value `{ url, w, h }` hai, ya `null` jab image hatani ho.
   */
  const resolved = new Map()

  for (const tag of tags) {
    const src = attrValue(tag, 'src').trim()

    if (resolved.has(src)) continue

    /**
     * ⚠️ **Bina `src` wala `<img>` sach me aata hai** — Google ke export me wo `<img>` ki tarah
     * hi likha jaata hai jab image doc me embed na ho payi. Use rakhne ka matlab hai page pe ek
     * toota hua icon; isliye wo tag poora hata diya jaata hai (D-42 §2).
     */
    if (!src) {
      resolved.set(src, null)
      continue
    }

    /** Hamari apni image — download nahi, waisi ki waisi rehne do. */
    if (mediaIdFromUrl(src)) {
      resolved.set(src, { url: src, w: null, h: null })
      continue
    }

    try {
      const image = await importOne(src, actor, siteId, deps)

      resolved.set(src, image)

      if (!image) {
        issues.push({
          level: 'note',
          label: 'Content image',
          value: src,
          message: 'This image was saved but no usable size was produced, so it was removed',
        })
      }
    } catch (err) {
      logger.warn({ err, src }, 'Inline image import failed')

      resolved.set(src, null)

      /**
       * ⚠️ **Note hai, blocker nahi.** Ek image ka na aana poore article ko rok de — wo galat
       * sauda hai. Wahi niyam jo banner pe hai: *image fail ho to sirf image fail ho*.
       */
      issues.push({
        level: 'note',
        label: 'Content image',
        value: src,
        message: `${err?.message ?? 'This image could not be fetched'} — the image was removed from the article`,
      })
    }
  }

  const out = source.replace(IMG_TAG_RE, (tag) => {
    const src = attrValue(tag, 'src').trim()

    if (!resolved.has(src)) return tag

    const image = resolved.get(src)
    if (!image) return ''

    /** Apni image ka tag chhua nahi jaata — uska naap bhi jo hai wahi rahe. */
    return image.url === src ? tag : withImage(tag, src, image)
  })

  return { html: out, issues }
}
