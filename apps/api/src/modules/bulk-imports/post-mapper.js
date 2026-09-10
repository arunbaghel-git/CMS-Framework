import { clamp, FAQ_LIMITS, normalizeName, parseNameList, parseSlug, slugify } from '@cms/shared'

/**
 * Blog doc ka kaccha data → `createEntry()` ka payload (spec 008).
 *
 * ## Ye `mapper.js` se alag file kyun hai
 *
 * Package ka mapper 500 line ka hai aur uska poora kaam pricing · hotels · itinerary hai —
 * teen cheezein jo blog me hain hi nahi. Blog ka mapper uske aadhe se bhi chhota hai aur
 * uske apne teen sawaal hain (category, excerpt, FAQ block). Dono ko ek file me rakhne ka
 * matlab hota har function me `if (type === 'post')`.
 *
 * Jo **sach me saanjha** hai wo `mapper.js` se import hota hai — `blocker`/`note` ki shakl aur
 * `resolveOne`. Wahi wajah jo `doc-parse.js` pe thi.
 *
 * ## ⚠️ Wahi niyam: mapper wo data kabhi na bheje jise service thukra degi
 *
 * `entrySchema` ki apni haddein hain (`title` 300, `excerpt` 1000, `heading` 300, FAQ ka
 * sawaal 300 aur jawab 8000, article ~40KB). Inme se ek bhi paar ho to Zod **poore post** ko
 * gira deta hai, aur client ko sirf *"String must contain at most 300 character(s)"* dikhta —
 * jisse ye pata hi nahi chalta ki galti kis khaane me thi.
 *
 * Isliye har hadd yahan **pehle** dekhi jaati hai: line kaat kar issue likha jaata hai,
 * exception nahi. Yahi soch package ke mapper me `ITINERARY_LIMITS` pe hai.
 */

/** `blocker` publish rok deta hai; `note` sirf batata hai. */
const blocker = (label, value, message) => ({
  level: 'blocker',
  label,
  value: String(value ?? ''),
  message,
})
const note = (label, value, message) => ({
  level: 'note',
  label,
  value: String(value ?? ''),
  message,
})

/** Khaane ka text — na ho to khaali string. */
const textOf = (values, key) => String(values?.[key]?.text ?? '').trim()

/** Khaane ka HTML — na ho to khaali string. */
const htmlOf = (values, key) => String(values?.[key]?.html ?? '').trim()

/**
 * Ek naam se uski id — ya wo galti jo client ko batani hai.
 *
 * ⚠️ **Ek se zyada milna asli khatra hai.** Taxonomy ki uniqueness `slug` pe hai, `name` pe
 * nahi, isliye do category ka naam sach me ek jaisa ho sakta hai. Aise me pehla utha lena
 * chup-chaap **galat topic** pe post daal deta hai.
 *
 * Ye package ke `resolveOne()` ki hoobahoo shakl hai. Dono ko ek file me le jaana **soch kar
 * nahi** kiya gaya: wahan wo `resolveMany()` ke saath baithta hai jo hotel/add-on ki poori
 * duniya se juda hai, aur yahan sirf ek category chahiye. Aaj ise saanjha karne ka matlab
 * hota ki dono taraf ka reference-resolution ek doosre se bandh jaaye — aur is repo me
 * saanjhe code ka faayda tabhi hai jab dono taraf ka **niyam** ek ho, sirf shakl nahi.
 */
function resolveOne(map, rawName, { label, listName }) {
  const name = String(rawName ?? '').trim()
  if (!name) return { id: null, issue: null }

  const found = map.get(normalizeName(name)) ?? []

  if (found.length === 0) {
    return {
      id: null,
      issue: blocker(
        label,
        name,
        `"${name}" is not in the ${listName} list. Add it there, or fix the spelling in the document.`,
      ),
    }
  }

  if (found.length > 1) {
    return {
      id: null,
      issue: blocker(
        label,
        name,
        `"${name}" matches ${found.length} entries in the ${listName} list. Rename one of them so the name is unique.`,
      ),
    }
  }

  return { id: found[0].id, issue: null }
}

/**
 * Doc ki categories → ids.
 *
 * ⚠️ **Khaali `Category` bhi blocker hai**, aur ye package se ulta hai (wahan khaali
 * `Destinations` chup-chaap chal jaata hai). Wajah blog ke apne dhaanche me hai: listing page
 * ka poora navigation topic pe khada hai (`.bfilter` ki pills, sidebar ke Topics, aur
 * `postList.categoryId` wale landing pages). Bina category ke post **kisi bhi topic ke neeche
 * nahi aata** aur uska badge bhi render nahi hota — yaani wo live to ho jaata hai par mila
 * kahin nahi.
 *
 * Wahi "kuch na hona" wala lakshan jo D-86 aur D-89 me baar-baar mila. Publish rok dena usse
 * behtar hai, aur post ka likha hua kuch nahi khota.
 */
function buildCategories(map, values, issues) {
  const raw = textOf(values, 'category')

  if (!raw) {
    issues.push(
      blocker(
        'Category',
        '',
        'No Category was given. A post without a topic never appears under any filter on the blog, so it was not published.',
      ),
    )

    return []
  }

  const ids = []

  for (const name of parseNameList(raw)) {
    const { id, issue } = resolveOne(map ?? new Map(), name, {
      label: 'Category',
      listName: 'Categories',
    })

    if (issue) issues.push(issue)
    else if (id && !ids.includes(id)) ids.push(id)
  }

  return ids
}

/**
 * FAQ ke jode → `faqs` block ke items.
 *
 * ⚠️ **Bina jawab wala sawaal chhod diya jaata hai** — page pe wo ek aisa sawaal banta jise
 * kholne par kuch milta hi nahi. Schema use rok nahi paata (`answer` ka default `''` hai),
 * isliye rok yahan hai, ek note ke saath.
 *
 * ⚠️ Sawaal **plain text** hai aur jawab **HTML** — `faqSchema` yahi kehta hai aur page bhi
 * wahi dikhata hai: sawaal `<summary>` me jaata hai (wahan markup ka koi matlab nahi) aur
 * jawab `<details>` ke andar, jahan paragraph aur bullets dono chalte hain.
 */
function buildFaqItems(faqs, issues) {
  const items = []
  const warnings = []

  for (const faq of faqs ?? []) {
    const question = clamp(
      String(faq?.question?.text ?? '').trim(),
      FAQ_LIMITS.question,
      'FAQ question',
      warnings,
    )

    if (!question) continue

    const answer = String(faq?.answer?.html ?? '').trim()

    if (!answer) {
      issues.push(note('FAQs', question, 'This question has no answer under it, so it was skipped'))
      continue
    }

    items.push({
      question,
      answer: clamp(answer, FAQ_LIMITS.answer, 'FAQ answer', warnings),
    })
  }

  for (const warning of warnings) issues.push(note('FAQs', '', warning))

  return items
}

/** `entrySchema` ki apni haddein — inhe paar karne se poora post 422 khaata hai. */
const LIMITS = Object.freeze({
  title: 300,
  heading: 300,
  excerpt: 1000,
  seoTitle: 200,
  seoDescription: 500,
  /** `htmlSchema` ka `MAX_HTML_BYTES`. */
  content: 40_000,
})

/**
 * Poora payload banao.
 *
 * @param {{ values: object, faqHeading: string, faqs: object[], warnings: string[] }} parsed
 * @param {{ categories: Map<string, Array<{ id: string, name: string }>> }} refs
 * @returns {{ input: object, issues: object[], slug: string, bannerUrl: string }}
 *   `input` **featured image ke bina** hai — wo image resolve hone ke baad service jodti hai
 */
export function toPostEntryInput(parsed, refs) {
  const { values } = parsed
  const issues = []
  const warnings = []

  for (const warning of parsed.warnings ?? []) issues.push(note('Document', '', warning))

  const title = clamp(textOf(values, 'title'), LIMITS.title, 'Blog title', warnings)

  /**
   * ⚠️ `parseSlug()` ke baad `slugify()` **zaroori** hai (D-86).
   *
   * `parseSlug()` sirf URL ka aakhri tukda kaat_ta hai — bade akshar, space aur nishaan waise
   * ke waise chhod deta hai. Client ke package doc me `Andaman-tour-from-dehli-package` likha
   * tha aur wahi aage bheja jaata tha; DB me entry lowercase me banti thi, aur us farak se
   * **har import ek naya duplicate** bana raha tha.
   *
   * `slugify()` wahi function hai jo `resolveSlugAndPath()` chalata hai, aur wo idempotent hai.
   */
  const slug = slugify(parseSlug(textOf(values, 'slug')))

  /**
   * **`Blog URL` ke bina post publish nahi hoga** — D-86 ka hi niyam.
   *
   * `Blog title` ke bina kuch ban hi nahi sakta, isliye wo `Failed` hai. `Blog URL` ke bina
   * post **ban jaata hai**, bas publish rukta hai — wahi soch jo poore importer me hai:
   * *content chala jaaye, sirf publish ruke*.
   *
   * ⚠️ Wajah sirf "khaali khaana" nahi hai. `Blog URL` hi wo **ek cheez** hai jo doc ko uske
   * post se baandhti hai. Uske bina address `Blog title` se banta hai — aur jis din client
   * title thoda sa badal de, us doc ka agla import purane post ko pehchanta hi nahi aur ek
   * **doosra live post** bana deta hai. Wo failure poori tarah chup hoti: dono live, dono
   * theek dikhte.
   */
  if (!slug) {
    issues.push(
      blocker(
        'Blog URL',
        '',
        'No Blog URL was given, so the address was made from the title. Add a Blog URL — otherwise renaming the post later will create a second page.',
      ),
    )
  }

  /** `resolveOne` ko naksha chahiye; use `values` ke saath le jaana sabse chhota raasta hai. */
  const categories = buildCategories(refs.categories, values, issues)

  const contentHtml = clamp(htmlOf(values, 'content'), LIMITS.content, 'Content', warnings)

  if (!contentHtml) {
    issues.push(
      blocker('Content', '', 'This document has no Content, so there would be nothing to read.'),
    )
  }

  /**
   * Blocks ka kram — pehle article, phir FAQs. Wahi kram jo reference (`blog-detail-v1.html`)
   * me hai aur wahi jo editor me dikhega.
   *
   * ⚠️ FAQ ka block **tabhi banta hai jab sach me sawaal hain**. Khaali block editor me ek
   * khaali panel banata aur page pe kuch nahi — D-30 ka ulta.
   */
  const faqItems = buildFaqItems(parsed.faqs, issues)
  const blocks = [{ type: 'richText', props: { html: contentHtml } }]

  if (faqItems.length > 0) {
    blocks.push({
      type: 'faqs',
      props: { heading: String(parsed.faqHeading ?? '').trim(), items: faqItems },
    })
  }

  /**
   * ⚠️ **Ye do `clamp` `warnings` drain hone se PEHLE chalne chahiye.**
   *
   * Pehle ye seedha `input` ke andar likhe the, aur `warnings` ka loop unse upar tha — yaani
   * line kat to jaati thi par uska note **kabhi issue nahi banta**. Client ko 1000 character pe
   * kata hua excerpt milta aur kahin nahi likha hota ki wo kata hai.
   *
   * Test ne ise pakda. Ye theek wahi shakl hai jispe ye poora feature baar-baar kaata gaya
   * hai — kaam hota hua dikhta hai, aur uska batane wala hissa chup-chaap gir jaata hai.
   */
  const excerpt = clamp(textOf(values, 'excerpt'), LIMITS.excerpt, 'Excerpt', warnings)
  const heading = clamp(textOf(values, 'heading'), LIMITS.heading, 'Blog heading', warnings)

  for (const warning of warnings) issues.push(note('Document', '', warning))

  const input = {
    type: 'post',
    title,
    ...(slug ? { slug } : {}),

    excerpt,

    seo: {
      title: textOf(values, 'metaTitle').slice(0, LIMITS.seoTitle),
      description: textOf(values, 'metaDescription').slice(0, LIMITS.seoDescription),
    },

    content: { version: 1, blocks },

    taxonomies: { categories },

    fields: {
      /**
       * ⚠️ **`text`, `html` nahi** — aur wo jaan-boojh kar hai. `fields.heading`
       * `pageHeadingSchema` pe hai, yaani `inlineHtmlSchema`, jisme block tags allowed hi
       * nahi hain. Parser ka `html` hamesha `<p>…</p>` hota hai; use bhejne ka matlab hota ki
       * sanitizer use write pe utaar de aur bacha sirf text — yaani wahi nateeja, ek chakkar
       * ghoom kar. Client ka heading waise bhi ek saadi line hai.
       */
      heading,
    },
  }

  return {
    input,
    issues: issues.slice(0, 50),
    slug,
    bannerUrl: textOf(values, 'bannerImage'),
  }
}
