/** Heading ke `id` ke liye — **wahi** `slugify` jo URL banata hai, koi doosri nahi. */
import { slugify } from './path.js'
import { htmlToText } from './schemas/rich-html.js'

/**
 * `On this post` — blog article ki TOC (spec 008, client 9 Sep).
 *
 * ## Ye apni file me kyun hai
 *
 * ⚠️ Pehli koshish ise `schemas/rich-html.js` me rakhne ki thi, aur wo **circular import**
 * bana deti hai:
 *
 * ```
 * rich-html.js → path.js → constants/index.js → package-sections.js → rich-html.js
 * ```
 *
 * Nateeja seedha crash tha — `textToHtml is not a function`, kyunki cycle ke andar module
 * aadha bana hua milta hai. Yahan se dono taraf ka import safe hai: `toc.js` `path.js` aur
 * `rich-html.js` dono ko padhta hai, aur un dono me se koi ise nahi padhta.
 */

/**
 * Article ki HTML se heading nikaalo **aur unhe `id` do** — ek hi pass me.
 *
 * ## Dono kaam ek saath kyun
 *
 * TOC ka link (`#ferries`) aur heading ka `id` **bilkul** match karne chahiye. Do jagah slug
 * banane ka matlab hota ki ek din wo alag ho jaayein aur har link kahin na le jaaye — theek
 * wahi jaal jo `resolvePath()` ke sar pe likha hai (admin ek path dikhata rahe, DB me doosra
 * ho). Isliye ye ek hi function hai aur payload me dono saath jaate hain.
 *
 * ## `id` write pe kyun nahi bhari jaati
 *
 * ⚠️ Ye **read pe** chalta hai, `normalizeContent()` me nahi. Heading ka text badalne pe uska
 * slug badalta hai, aur write pe likhne ka matlab hota ki client ka stored content hum har
 * save pe dobara likhein. Read pe karne se stored HTML client ki likhi hui hi rehti hai, aur
 * koi migration bhi nahi lagti.
 *
 * ⚠️ **Client se `id` likhwana raasta nahi tha** — A-19: `class` teen jagah chup-chaap kho
 * chuki hai (`.wdgl` · `.faq p` · `.tblw`). Jo cheez editor me kho sakti hai, uspe TOC khada
 * karna usi bug ko chauthi jagah dena hota. **Client ne kuch na likha ho tab bhi ye chalta
 * hai** — wahi sawaal jo D-90 ne poochha tha: _"agar client ye class na likhe to kya hoga?"_
 *
 * ## Sirf `<h2>`
 *
 * Reference (`blog-detail-v1.html`) ka `.toc` sirf `h2` ke link rakhta hai, aur wahi theek
 * hai: `h3` tak jaane se ek lambe article ki TOC khud ek article ban jaati hai.
 *
 * Client ke likhe hue `id` **chhue nahi jaate** — jo pehle se hai wahi chalega, taaki uske
 * baante hue purane anchor heading ka text badalne pe bhi zinda rahein.
 *
 * @param {string} html
 * @returns {{ html: string, toc: Array<{ id: string, text: string }> }}
 */
export function withHeadingIds(html) {
  const source = String(html ?? '')
  if (!source) return { html: '', toc: [] }

  /** Ek hi slug do baar na bane — `#cost`, `#cost-2`. */
  const used = new Map()
  const toc = []

  const out = source.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi, (match, attrs, inner) => {
    const text = htmlToText(inner)

    /** Khaali heading ka TOC link ek aisa link hota jispe kuch likha hi nahi. */
    if (!text) return match

    const existing = /\bid\s*=\s*["']([^"']+)["']/i.exec(attrs)
    let id = existing?.[1]?.trim()

    if (!id) {
      /**
       * Devanagari jaisi non-Latin heading pe `slugify()` khaali lauta-ta hai (wo
       * `path.js` me likha hua vyavhaar hai). Us haalat me bhi anchor chahiye, warna TOC
       * ka link kahin nahi jaata — isliye position wala fallback.
       */
      const base = slugify(text) || `section-${toc.length + 1}`
      const seen = (used.get(base) ?? 0) + 1
      used.set(base, seen)
      id = seen === 1 ? base : `${base}-${seen}`
    }

    toc.push({ id, text })

    return existing ? match : `<h2${attrs} id="${id}">${inner}</h2>`
  })

  return { html: out, toc }
}

/**
 * TOC tabhi banti hai jab **teen ya zyada** heading hon.
 *
 * ⚠️ Ye `blogSettings.showToc` ke **upar** nahi, uske **saath** lagta hai: checkbox "dikhao"
 * kehta hai, "zabardasti dikhao" nahi. Ek ya do link wali `On this post` ek khaali dabbe
 * jaisi lagti hai, aur khaali cheez khaali dikhni chahiye — tooti hui nahi (D-30).
 */
export const TOC_MIN_HEADINGS = 3
