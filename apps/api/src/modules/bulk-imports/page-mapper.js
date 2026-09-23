import { clamp, FAQ_LIMITS, imageUrlOf, normalizeName, parseSlug, slugify } from '@cms/shared'

/**
 * Page doc ka kaccha data → `createEntry()` ka payload (D-95, client 14 Sep).
 *
 * Post ke mapper (`post-mapper.js`) ki hi shakl — wahi niyam: **mapper wo data kabhi na bheje jise
 * service thukra degi.** Har hadd yahan pehle dekhi jaati hai aur issue banti hai, exception
 * nahi. Farak sirf page ke apne khaanon ka hai:
 *
 * | Khaana | Kahan jaata hai |
 * | --- | --- |
 * | `Sub heading` | `fields.subheading` (HTML) |
 * | `Button label` / `Button link` | `fields.heroButton` |
 * | `Stat Rail` ke cards | `fields.statRail[]` — optional |
 * | `Parent page` | `parentId` — title se dhoondha jaata hai |
 * | — (doc me nahi) | `fields.sidebar: 'right'` + `Pages Sidebar` — **sirf naye page pe** |
 *
 * Category yahan nahi hai — pages ki category hoti hi nahi.
 */

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

const textOf = (values, key) => String(values?.[key]?.text ?? '').trim()
const htmlOf = (values, key) => String(values?.[key]?.html ?? '').trim()

/**
 * Import hua page kis sidebar ke saath banega — client, 14 Sep: _"Pages Sidebar, right"_.
 *
 * ⚠️ **Naam se dhoondha jaata hai**, id se nahi — har instance ki id alag hai, par naam wahi hai
 * jo client ne `Appearance ▸ Sidebar` me rakha. Naam badla to import hua page bina sidebar ke
 * banega, ek note ke saath (chup-chaap nahi).
 */
export const DEFAULT_PAGE_SIDEBAR_NAME = 'Pages Sidebar'

/** `statSchema` / `pageHeadingSchema` / `subheadingSchema` / `entrySchema` ki haddein. */
const LIMITS = Object.freeze({
  title: 300,
  seoTitle: 200,
  seoDescription: 500,
  subheading: 2000,
  buttonLabel: 80,
  buttonLink: 500,
  statValue: 40,
  statSuffix: 40,
  statLabel: 120,
  stats: 4,
  content: 40_000,
})

/** `Yes` · `true` · `1` · `y` → `true`. Baaki sab (khaali samet) `false`. */
const isYes = (text) => /^(yes|y|true|1)$/i.test(String(text ?? '').trim())

/**
 * Naam se ek id — na mile ya do mile to wo issue jo client ko batana hai.
 *
 * Post ke `resolveOne()` ki shakl; yahan `level` bahar se aata hai kyunki parent na milna
 * blocker hai aur sidebar na milna sirf note.
 */
function resolveByName(items, rawName, { label, listName, level }) {
  const name = String(rawName ?? '').trim()
  if (!name) return { id: null, issue: null }

  const found = (items ?? []).filter((item) => normalizeName(item.name) === normalizeName(name))
  const make = level === 'blocker' ? blocker : note

  if (found.length === 0) {
    return {
      id: null,
      issue: make(
        label,
        name,
        `"${name}" is not in ${listName}. Check the spelling, or create it first.`,
      ),
    }
  }

  if (found.length > 1) {
    return {
      id: null,
      issue: make(
        label,
        name,
        `"${name}" matches ${found.length} items in ${listName}. Rename one of them so the name is unique.`,
      ),
    }
  }

  return { id: found[0].id, issue: null }
}

/**
 * Stat Rail ke cards → `fields.statRail[]`.
 *
 * ⚠️ **Optional hai** (client, 14 Sep) — doc me `Stat Rail` na ho to khaali array, aur page pe
 * rail aati hi nahi. Bina `Value` wala card chhod diya jaata hai (theme bhi use nahi dikhati).
 */
function buildStats(stats, issues) {
  const warnings = []
  const cards = []

  for (const stat of stats ?? []) {
    const value = clamp(textOf(stat, 'value'), LIMITS.statValue, 'Stat value', warnings)
    if (!value) continue

    cards.push({
      value,
      suffix: clamp(textOf(stat, 'suffix'), LIMITS.statSuffix, 'Stat suffix', warnings),
      label: clamp(textOf(stat, 'label'), LIMITS.statLabel, 'Stat label', warnings),
      highlight: isYes(textOf(stat, 'highlight')),
    })
  }

  if (cards.length > LIMITS.stats) {
    issues.push(
      note(
        'Stat Rail',
        `${cards.length} cards`,
        `Only the first ${LIMITS.stats} cards are used — the rail has room for four.`,
      ),
    )
  }

  for (const warning of warnings) issues.push(note('Stat Rail', '', warning))

  return cards.slice(0, LIMITS.stats)
}

/** FAQ ke jode → `faqs` block ke items. Post wali hi rok — bina jawab ka sawaal chhoot-ta hai. */
function buildFaqItems(faqs, issues) {
  const items = []
  const warnings = []

  for (const faq of faqs ?? []) {
    const question = clamp(textOf(faq, 'question'), FAQ_LIMITS.question, 'FAQ question', warnings)
    if (!question) continue

    const answer = htmlOf(faq, 'answer')

    if (!answer) {
      issues.push(note('FAQs', question, 'This question has no answer under it, so it was skipped'))
      continue
    }

    items.push({ question, answer: clamp(answer, FAQ_LIMITS.answer, 'FAQ answer', warnings) })
  }

  for (const warning of warnings) issues.push(note('FAQs', '', warning))

  return items
}

/**
 * Poora payload banao.
 *
 * @param {{ values: object, stats: object[], faqHeading: string, faqs: object[], warnings: string[] }} parsed
 * @param {{ pages: Array<{ id: string, name: string }>, sidebars: Array<{ id: string, name: string }> }} refs
 * @returns {{ input: object, issues: object[], slug: string, bannerUrl: string, newOnlyFields: object }}
 *   `newOnlyFields` — sirf **naye** page pe lagte hain (sidebar); service tay karta hai
 */
export function toPageEntryInput(parsed, refs) {
  const { values } = parsed
  const issues = []
  const warnings = []

  for (const warning of parsed.warnings ?? []) issues.push(note('Document', '', warning))

  const title = clamp(textOf(values, 'title'), LIMITS.title, 'Page title', warnings)

  /** `parseSlug()` ke baad `slugify()` — D-86. Poora URL (`/andaman-beaches/x`) bhi chalta hai. */
  const slug = slugify(parseSlug(textOf(values, 'slug')))

  if (!slug) {
    issues.push(
      blocker(
        'Page URL',
        '',
        'No Page URL was given. Add one — it is what links this document to its page, so renaming the page later does not create a second page.',
      ),
    )
  }

  /**
   * `Parent page` — title se. **Na mile to blocker**: page galat jagah (root pe) publish hota, aur
   * baad me parent lagane pe uska URL badal jaata. 23 Sep se (D-116) row Failed, page nahi banta.
   *
   * ⚠️ Khaali chhodo to `parentId` **bheja hi nahi jaata** — naya page root pe banta hai, aur
   * purane page ka admin me chuna hua parent waisa ka waisa rehta hai.
   */
  const parentName = textOf(values, 'parent')
  const parent = resolveByName(refs.pages, parentName, {
    label: 'Parent page',
    listName: 'Pages',
    level: 'blocker',
  })
  if (parent.issue) issues.push(parent.issue)

  if (
    parent.id &&
    slug &&
    refs.pages?.some((page) => page.id === parent.id && page.slug === slug)
  ) {
    issues.push(blocker('Parent page', parentName, 'A page cannot be its own parent.'))
    parent.id = null
  }

  /** Content — post wali hi rok: kaatna padhe to publish nahi (HTML beech se toot sakti hai). */
  const rawContent = htmlOf(values, 'content')
  const contentHtml = rawContent.slice(0, LIMITS.content)

  if (rawContent.length > LIMITS.content) {
    issues.push(
      blocker(
        'Content',
        `${rawContent.length} characters`,
        `The content is longer than ${LIMITS.content} characters and had to be cut, which can break its formatting. Shorten it in the document, then import again.`,
      ),
    )
  }

  if (!contentHtml) {
    issues.push(
      blocker('Content', '', 'This document has no Content, so there would be nothing to read.'),
    )
  }

  /**
   * Sub heading **HTML** hai (bold/link rehte hain), aur HTML ko character se kaatna khatarnak hai
   * — kaat tag ke beech pad sakti hai. Isliye hadd paar ho to sub heading **chhod** di jaati hai,
   * blocker ke saath; kaati nahi jaati. Page ka baaki content phir bhi aata hai.
   */
  const rawSubheading = htmlOf(values, 'subheading')
  const subheading = rawSubheading.length > LIMITS.subheading ? '' : rawSubheading

  if (rawSubheading.length > LIMITS.subheading) {
    issues.push(
      blocker(
        'Sub heading',
        `${rawSubheading.length} characters`,
        `The Sub heading is longer than ${LIMITS.subheading} characters. Shorten it to one or two sentences, then press Retry again.`,
      ),
    )
  }

  /**
   * Hero button — label aur link **dono** chahiye, warna page pe button nahi aata. Ek hi likha ho
   * to note, taaki client ko pata chale ki button kyun nahi dikha (D-30 wala "kuch na hona").
   */
  const buttonLabel = clamp(
    textOf(values, 'buttonLabel'),
    LIMITS.buttonLabel,
    'Button label',
    warnings,
  )
  const buttonLink = clamp(textOf(values, 'buttonLink'), LIMITS.buttonLink, 'Button link', warnings)

  if (Boolean(buttonLabel) !== Boolean(buttonLink)) {
    issues.push(
      note(
        buttonLabel ? 'Button link' : 'Button label',
        '',
        'The hero button needs both a Button label and a Button link, so it will not appear.',
      ),
    )
  }

  /**
   * ⚠️ **`On this page` ab doc se kahin nahi jaata** (client, 14 Sep shaam, D-95 §12) — wo
   * **Pages ▸ Pages settings** me sab pages ke liye ek hai.
   *
   * Label parser me phir bhi pehchana jaata hai: bina uske ye line pichhle khaane (`Parent page`) me
   * jud jaati aur page draft rehta. Bhara ho to note — chup-chaap girna D-86 wala lakshan hota.
   * Wahi tareeka jo `Blog heading` pe 11 Sep ko laga (D-93).
   */
  const tocText = textOf(values, 'showToc')
  if (tocText) {
    issues.push(
      note(
        'On this page',
        tocText,
        'This line is not used any more — "On this page" is set for all pages in Pages ▸ Pages settings. You can delete it from the document.',
      ),
    )
  }

  const statRail = buildStats(parsed.stats, issues)
  const faqItems = buildFaqItems(parsed.faqs, issues)

  /** Kram — pehle content, phir FAQs. Khaali FAQ block nahi banta (D-30). */
  const blocks = [{ type: 'richText', props: { html: contentHtml } }]

  if (faqItems.length > 0) {
    blocks.push({
      type: 'faqs',
      props: { heading: String(parsed.faqHeading ?? '').trim(), items: faqItems },
    })
  }

  /**
   * Sidebar — **sirf naye page pe** (client: _"Pages Sidebar, right"_). Purane page pe admin me
   * chuni sidebar ko import kabhi nahi chhoota.
   */
  const sidebar = resolveByName(refs.sidebars, DEFAULT_PAGE_SIDEBAR_NAME, {
    label: 'Sidebar',
    listName: 'Appearance ▸ Sidebar',
    level: 'note',
  })

  const newOnlyFields = sidebar.id ? { sidebar: 'right', sidebarId: sidebar.id } : {}
  const sidebarIssue = sidebar.issue
    ? {
        ...sidebar.issue,
        message: `${sidebar.issue.message} A new page is created without a sidebar.`,
      }
    : null

  for (const warning of warnings) issues.push(note('Document', '', warning))

  const input = {
    type: 'page',
    title,
    ...(slug ? { slug } : {}),
    ...(parent.id ? { parentId: parent.id } : {}),

    seo: {
      title: textOf(values, 'metaTitle').slice(0, LIMITS.seoTitle),
      description: textOf(values, 'metaDescription').slice(0, LIMITS.seoDescription),
    },

    content: { version: 1, blocks },

    /**
     * ⚠️ Sirf **doc ke** khaane. `sidebar`/`sidebarId` yahan nahi — service purane page ke `fields`
     * pe inhe **milaata** hai (`TARGET_CONFIG.page.prepare`), warna ek re-import admin me chuni
     * sidebar mita deta (`updateEntry()` `fields` poora badalta hai).
     */
    fields: {
      subheading,
      statRail,
      heroButton: { label: buttonLabel, url: buttonLink },
    },
  }

  return {
    input,
    issues: issues.slice(0, 50),
    slug,
    /** Likha URL, ya doc me daali image (tab tak Media me utar chuki) — D-116 */
    bannerUrl: imageUrlOf(values.bannerImage),
    newOnlyFields,
    newOnlyIssues: sidebarIssue ? [sidebarIssue] : [],
  }
}
