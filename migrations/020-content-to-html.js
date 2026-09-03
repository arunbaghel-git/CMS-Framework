/**
 * Rich text ab **HTML** hai — TipTap ka JSON tree hat gaya (D-80, client 3 Sep).
 *
 * ## Ye pehla migration hai jo client ka LIKHA HUA content badal raha hai
 *
 * Ab tak ke saare migrations ne field jode, hataye, ya index banaye. Ye alag hai: iske andar
 * se client ka apna text guzar raha hai. Isliye:
 *
 * - `mongodump` chalane se **pehle** liya gaya (3 Sep)
 * - `down()` wapas nahi la sakta — HTML se JSON banane ka koi bharosemand raasta nahi
 * - Har page ka rendered HTML pehle capture kiya gaya, taaki baad me milaya ja sake
 *
 * ## Saat jagah badalti hain
 *
 *   entries.content.blocks[].props.doc          → props.html
 *   entries.fields.itinerary[].description      plain → HTML
 *   entries.fields.faqs[].answer                plain → HTML
 *   packageDefaults.sectionLabels[].description doc   → HTML
 *   packageDefaults.cancellationText            plain → HTML
 *   packageDefaults.bookingSteps[].text         plain → HTML
 *   packageDefaults.whatsIncluded.included[] / .excluded[]   plain → inline HTML (escape)
 */

/**
 * HTML me guse hue characters.
 *
 * ⚠️ **Ye is poori migration ka sabse zaroori aur sabse aasaan chhoot jaane wala kadam hai.**
 * Purana text **plain** tha — usme `Kids < 5 years free` bilkul theek line thi. HTML me wo ek
 * adhoora tag ban jaati hai aur uske aage ka poora text **gayab** ho jaata hai. Wo failure
 * chup hoti: koi error nahi, bas aadhi line.
 */
const esc = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/** Link ka `href` — wahi rok jo `RichText.jsx` me thi (`javascript:` kabhi nahi). */
const safeHref = (href) => (/^(https?:|mailto:|tel:|\/|#)/i.test(String(href ?? '')) ? href : '')

/**
 * TipTap ka text node → HTML, uske marks ke saath.
 *
 * ⚠️ Marks ka kram **ulta** lagta hai (`reduce` andar se bahar), taaki `RichText.jsx` jaisa
 * hi nesting bane: wahan har mark pichhle output ko wrap karta tha.
 */
function textToHtml(node) {
  let out = esc(node.text ?? '')

  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') out = `<strong>${out}</strong>`
    else if (mark.type === 'italic') out = `<em>${out}</em>`
    else if (mark.type === 'code') out = `<code>${out}</code>`
    else if (mark.type === 'link') {
      const href = safeHref(mark.attrs?.href)
      if (href) {
        const rel = String(href).startsWith('http') ? ' rel="noopener noreferrer"' : ''
        out = `<a href="${esc(href)}"${rel}>${out}</a>`
      }
    }
  }

  return out
}

/**
 * TipTap doc → HTML.
 *
 * ⚠️ **Ye wahi whitelist hai jo `apps/web/components/package/RichText.jsx` me thi** — usi
 * kram me, usi vyavhaar ke saath (khaali paragraph gir jaata hai, heading 1-6 me clamp,
 * anjaan node ka sirf text bachta hai). Naya converter likhne ka matlab hota do jagah do
 * niyam, aur tab purana content chup-chaap alag dikhne lagta.
 *
 * ⚠️ Renderer har text node ko ek khaali `<span>` me wrap karta tha (React ko key chahiye
 * thi). Wo yahan **nahi** aate: unpe koi CSS lagti hi nahi (verify kiya), wo poori tarah
 * inert the, aur unhe HTML me likhna ek React ki majboori ko data me amar kar dena hota.
 */
function nodesToHtml(nodes) {
  return (nodes ?? []).map(nodeToHtml).join('')
}

function nodeToHtml(node) {
  if (!node) return ''
  if (node.type === 'text') return textToHtml(node)

  const inner = nodesToHtml(node.content)

  switch (node.type) {
    case 'paragraph':
      /** Khaali paragraph render hi nahi hota tha — wo bhi wahi rehna chahiye. */
      return node.content?.length ? `<p>${inner}</p>` : ''
    case 'heading': {
      const level = Math.min(Math.max(node.attrs?.level ?? 2, 1), 6)
      return `<h${level}>${inner}</h${level}>`
    }
    case 'bulletList':
      return `<ul>${inner}</ul>`
    case 'orderedList':
      return `<ol>${inner}</ol>`
    case 'listItem':
      return `<li>${inner}</li>`
    case 'blockquote':
      return `<blockquote>${inner}</blockquote>`
    case 'hardBreak':
      return '<br />'
    case 'horizontalRule':
      return '<hr />'
    default:
      /** Anjaan node — uska text phir bhi bachna chahiye, gayab nahi hona chahiye. */
      return inner
  }
}

const docToHtml = (doc) => (doc?.content?.length ? nodesToHtml(doc.content) : '')

/**
 * Plain text → HTML. Har line ek `<p>`; `-` ya `•` se shuru hone wali line `<li>`.
 *
 * ⚠️ `-` wala niyam **D-64** se aa raha hai — wahan itinerary ki description me `-` wali line
 * bullet banti thi, aur theme us niyam ko **render pe** lagata tha. Ab wo asli `<ul>` ban
 * jaata hai, yaani wo convention data se nikal kar sirf naye input ke converter me reh
 * jaayegi.
 */
function plainToHtml(text) {
  const lines = String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return ''

  const out = []
  let list = null

  for (const line of lines) {
    if (/^[-•]\s*/.test(line)) {
      list ??= []
      list.push(`<li>${esc(line.replace(/^[-•]\s*/, ''))}</li>`)
      continue
    }

    if (list) {
      out.push(`<ul>${list.join('')}</ul>`)
      list = null
    }
    out.push(`<p>${esc(line)}</p>`)
  }

  if (list) out.push(`<ul>${list.join('')}</ul>`)

  return out.join('')
}

/** Pehle se HTML lagti hai? Migration dobara chale to text ko `<p>` me dobara na lapete. */
const looksLikeHtml = (value) =>
  /<\/?(p|ul|ol|li|h[1-6]|blockquote|br|hr|strong|em|a)\b/i.test(String(value ?? ''))

const asHtml = (value) => (looksLikeHtml(value) ? String(value) : plainToHtml(value))

export async function up({ db }) {
  const entries = db.collection('entries')
  /**
   * ⚠️ **`packageDefaults` — camelCase.** Pehle yahan `packagedefaults` likha tha aur is
   * migration ka **aadha hissa chup-chaap chala hi nahi**: Mongo collection ka naam
   * case-sensitive hai, aur galat naam pe `find()` bas khaali cursor deta hai — koi error
   * nahi. Migration "✓" dikha kar nikal gayi thi.
   */
  const defaults = db.collection('packageDefaults')

  // ── entries ────────────────────────────────────────────────────────────────

  for await (const entry of entries.find({}, { projection: { content: 1, fields: 1 } })) {
    const $set = {}

    /**
     * `content.blocks[].props.doc` → `props.html`.
     *
     * Block ka `type` (`richText`) **wahi rehta hai** — wo stored data hai aur use rename
     * karna R4 ke against jaata (D-80). Sirf uske andar ka shape badla hai.
     */
    const blocks = entry.content?.blocks
    if (Array.isArray(blocks) && blocks.some((b) => b?.props && 'doc' in b.props)) {
      $set['content.blocks'] = blocks.map((block) => {
        if (!block?.props || !('doc' in block.props)) return block

        const { doc, ...rest } = block.props

        return { ...block, props: { ...rest, html: docToHtml(doc) } }
      })
    }

    const itinerary = entry.fields?.itinerary
    if (Array.isArray(itinerary)) {
      $set['fields.itinerary'] = itinerary.map((day) =>
        day ? { ...day, description: asHtml(day.description) } : day,
      )
    }

    const faqs = entry.fields?.faqs
    if (Array.isArray(faqs)) {
      $set['fields.faqs'] = faqs.map((faq) => (faq ? { ...faq, answer: asHtml(faq.answer) } : faq))
    }

    if (Object.keys($set).length > 0) {
      await entries.updateOne({ _id: entry._id }, { $set })
    }
  }

  // ── packageDefaults ────────────────────────────────────────────────────────

  for await (const doc of defaults.find({})) {
    const $set = {}

    if (doc.sectionLabels) {
      $set.sectionLabels = Object.fromEntries(
        Object.entries(doc.sectionLabels).map(([key, section]) => {
          if (!section || !('description' in section)) return [key, section]

          const value = section.description

          return [
            key,
            {
              ...section,
              /** Section ki description TipTap doc thi (D-69) — object aaye to convert. */
              description: value && typeof value === 'object' ? docToHtml(value) : asHtml(value),
            },
          ]
        }),
      )
    }

    if (doc.cancellationText !== undefined) {
      $set.cancellationText = asHtml(doc.cancellationText)
    }

    if (Array.isArray(doc.bookingSteps)) {
      $set.bookingSteps = doc.bookingSteps.map((step) =>
        step ? { ...step, text: asHtml(step.text) } : step,
      )
    }

    /**
     * `whatsIncluded` ki lines **shape nahi badalti** — wo `string[]` hi rehti hain, aur
     * ✓/✗ ka icon theme hi lagata rehta hai (D-80: WordPress bhi yahi karta hai).
     *
     * Yahan sirf **escape** hota hai: line ab inline HTML ki tarah render hogi, to purana
     * `Kids < 5 years` waisa ka waisa dikhna chahiye.
     */
    if (doc.whatsIncluded) {
      const line = (value) => (looksLikeHtml(value) ? String(value) : esc(value))

      $set.whatsIncluded = {
        ...doc.whatsIncluded,
        included: (doc.whatsIncluded.included ?? []).map(line),
        excluded: (doc.whatsIncluded.excluded ?? []).map(line),
      }
    }

    if (Object.keys($set).length > 0) {
      await defaults.updateOne({ _id: doc._id }, { $set })
    }
  }
}

export async function down() {
  /**
   * **Wapas nahi ja sakte, aur ye jhooth bolne se behtar hai.**
   *
   * HTML me ab wo cheezein ho sakti hain jo TipTap ke schema me theen hi nahi (table, span
   * pe class, inline style). Unhe JSON tree me lautana matlab client ka likha hua content
   * chup-chaap kaat dena — aur wahi cheez ye migration rok rahi thi.
   *
   * Asli rollback **`mongodump`** hai, jo is migration se pehle liya gaya tha (3 Sep).
   */
  throw new Error(
    'Migration 020 reverse nahi ho sakti — HTML se TipTap JSON banane ka koi bharosemand ' +
      'raasta nahi hai. Rollback ke liye 020 se pehle liya gaya mongodump restore karo.',
  )
}
