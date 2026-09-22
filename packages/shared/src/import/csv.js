/**
 * Sheet ka CSV padhna — Bulk Upload (D-81).
 *
 * ## ⚠️ `text.split(',')` yahan chalega nahi
 *
 * Wo sabse pehla khayaal hai aur sabse jaldi tootta hai. Client ki sheet me package ke naam
 * aate hain, aur unme comma hota hai:
 *
 * ```csv
 * Doc File,Status,Published URL
 * https://…/doc1,"Done, published",https://site.com/packages/x
 * ```
 *
 * `split(',')` us row ko **paanch** khaanon me kaat deta hai aur `Published URL` galat jagah
 * chali jaati hai. Isliye poora RFC 4180 padha jaata hai: quoted field, `""` se escape kiya
 * hua quote, quote ke andar newline, aur CRLF.
 *
 * ⚠️ Ek nayi dependency (`papaparse`, `csv-parse`) is chalis line ke liye bhaari hai — R3.
 * `forms/service.js` me CSV **likhne** wala hissa bhi haath se hi likha hai (`csvCell()`), to
 * padhne wala bhi wahin rehna chahiye.
 */

/**
 * CSV text → rows of cells.
 *
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  /**
   * Excel ka BOM.
   *
   * ⚠️ Ye character yahan **naam se** likha gaya hai, seedha nahi. `forms/controller.js` me bhi
   * yahi kiya gaya hai aur wajah wahi hai: seedha likhne pe lint use `irregular whitespace`
   * batata hai.
   *
   * Hataana zaroori hai — bina iske pehla header `Doc File` ki jagah ek anjaan string ban
   * jaata hai aur `Doc File` wala column **kabhi match hi nahi karta**. Google ka CSV export
   * ise hamesha bhejta hai.
   */
  const source = String(text ?? '').replace(new RegExp(`^${String.fromCharCode(0xfeff)}`), '')

  const rows = []
  let row = []
  let field = ''
  let quoted = false
  let index = 0

  const endField = () => {
    row.push(field)
    field = ''
  }

  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  while (index < source.length) {
    const char = source[index]

    if (quoted) {
      if (char === '"') {
        /** `""` ka matlab ek asli quote hai, field ka ant nahi. */
        if (source[index + 1] === '"') {
          field += '"'
          index += 2
          continue
        }

        quoted = false
        index += 1
        continue
      }

      field += char
      index += 1
      continue
    }

    if (char === '"' && field === '') {
      quoted = true
      index += 1
      continue
    }

    if (char === ',') {
      endField()
      index += 1
      continue
    }

    if (char === '\r' || char === '\n') {
      endRow()
      /** CRLF do character ka hai — dono ek saath khaao, warna har row ke beech khaali row banegi. */
      index += char === '\r' && source[index + 1] === '\n' ? 2 : 1
      continue
    }

    field += char
    index += 1
  }

  /** Aakhri row pe newline na ho to bhi wo ek row hai. */
  if (field !== '' || row.length > 0) endRow()

  return rows.filter((cells) => cells.some((cell) => cell.trim()))
}

/** Header ka naam milane ke liye — case aur space maaf. */
const normalizeHeader = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/**
 * Sheet ki rows se doc ke URL nikaalo.
 *
 * ⚠️ Column **naam se** dhoondha jaata hai, position se nahi. Client sheet me column aage-peeche
 * kar sakta hai (aur `Status` / `Published URL` uske apne khaane hain) — position pe tikne ka
 * matlab hota ki ek column khiskte hi importer `Status` ko doc ka URL samajhne lage.
 *
 * Header hi na mile to pehla column liya jaata hai aur ek warning lauti hai — kaam rukta nahi,
 * par chup bhi nahi rehta.
 *
 * @param {string[][]} rows
 * @returns {{ urls: string[], warnings: string[] }}
 */
export function docUrlsFromSheet(rows) {
  const warnings = []

  if (rows.length === 0) return { urls: [], warnings: ['The sheet is empty'] }

  const header = rows[0].map(normalizeHeader)
  let column = header.findIndex(
    (name) => name === 'doc file' || name === 'doc' || name === 'doc url',
  )
  let body = rows.slice(1)

  if (column === -1) {
    column = 0
    warnings.push('No "Doc File" column was found, so the first column was used')
    /** Header hi na ho to pehli row bhi data hai — use chhodna ek doc kha jaata. */
    if (!header.some((name) => name.includes('status') || name.includes('url'))) body = rows
  }

  const urls = body.map((cells) => String(cells[column] ?? '').trim()).filter(Boolean)

  if (urls.length === 0) warnings.push('No document links were found in the sheet')

  return { urls, warnings }
}

/**
 * Ek cell CSV me likhne layak — **aur ye safai sirf sundarta ke liye nahi hai**.
 *
 * `=`, `+`, `-`, `@` se shuru hone wali value Excel me **formula** ban jaati hai (CSV
 * injection). SEO Title/Meta Description client ke apne likhe hue hote hain aur enquiry ka
 * text to bahar se aata hai, isliye dono jagah ye pehra zaroori hai.
 *
 * ⚠️ **Ye pehle `forms/service.js` ke andar rehta tha.** SEO export ko bilkul yahi chahiye tha,
 * aur do copies ka nateeja is repo me teen baar dekha ja chuka hai (`htmlToText`, `bestFor`,
 * aur D-86 ka slug). Isliye wo yahan aa gaya aur `forms` ab yahi padhta hai.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text

  return `"${guarded.replace(/"/g, '""')}"`
}

/**
 * SEO wali sheet ke column ke naam — **export aur import dono yahi padhte hain** (D-107).
 *
 * ⚠️ Do jagah likhna theek wahi galti hoti jo **D-86** me hui thi: wahan dhoondhne ka slug aur
 * save karne ka slug do alag jagah bante the, aur har import duplicate page bana deta tha. Yahan
 * wo galti "export ne `SEO Title` likha, import `Meta Title` dhoondhta raha" ki shakl me aati —
 * aur uska lakshan bhi wahi hota: **kuch na hona**, bina error ke.
 */
export const SEO_COLUMN = Object.freeze({
  URL: 'Page URL',
  TYPE: 'Type',
  TITLE: 'SEO Title',
  DESCRIPTION: 'Meta Description',
})

/**
 * Har column ke wo naam jo padhte waqt maane jaayenge.
 *
 * ⚠️ Saada `title` aur `description` jaan-boojh kar **nahi** hain. Client ki sheet me page ka
 * apna `Title` column hona bilkul aam hai, aur use SEO Title samajh lene ka matlab hota ki
 * import chup-chaap har page ka `<title>` badal de.
 */
const SEO_ALIASES = Object.freeze({
  url: ['page url', 'url', 'path', 'page address', 'page link'],
  title: ['seo title', 'meta title'],
  description: ['meta description', 'seo description'],
})

const findColumn = (header, names) => header.findIndex((name) => names.includes(name))

/**
 * SEO wali sheet ki rows padho — har row ek page.
 *
 * Doc wale import se ye **poori tarah alag** hai: wahan sheet me sirf Google Doc ke link hote
 * hain aur asli maal doc me hota hai; yahan maal **row me hi** hai aur koi doc hai hi nahi.
 *
 * ⚠️ **Column position se nahi, naam se** — wahi wajah jo `docUrlsFromSheet()` pe likhi hai.
 * Par yahan pehle column wala fallback **nahi** hai: teen text column ek jaise dikhte hain, aur
 * galat andaza yahan "har page ka SEO Title me Meta Description bhar dena" ban jaata.
 *
 * @param {string[][]} rows
 * @returns {{ rows: { url: string, title: string|null, description: string|null }[], warnings: string[] }}
 */
export function seoRowsFromSheet(rows) {
  const warnings = []

  if (rows.length === 0) return { rows: [], warnings: ['The sheet is empty'] }

  const header = rows[0].map(normalizeHeader)
  const urlColumn = findColumn(header, SEO_ALIASES.url)
  const titleColumn = findColumn(header, SEO_ALIASES.title)
  const descriptionColumn = findColumn(header, SEO_ALIASES.description)

  if (urlColumn === -1) {
    return {
      rows: [],
      warnings: [
        `No "${SEO_COLUMN.URL}" column was found. Export the current SEO first and edit that file — it already has the right columns.`,
      ],
    }
  }

  if (titleColumn === -1 && descriptionColumn === -1) {
    return {
      rows: [],
      warnings: [
        `Neither a "${SEO_COLUMN.TITLE}" nor a "${SEO_COLUMN.DESCRIPTION}" column was found, so there is nothing to import.`,
      ],
    }
  }

  /**
   * ⚠️ Ek column ka na hona **rukawat nahi** hai — wo us field ko chhoota hi nahi.
   *
   * Client ka faisla (21 Sep): khaali cell ka matlab "is khaane ko chhedo mat" hai. Sirf
   * Meta Description wali sheet bhejna isliye bilkul jaayaz hai, par wo chup nahi rehna
   * chahiye — warna client sochta rahega ki Title kyun nahi badla.
   */
  if (titleColumn === -1) warnings.push(`No "${SEO_COLUMN.TITLE}" column — titles were left as is`)
  if (descriptionColumn === -1) {
    warnings.push(`No "${SEO_COLUMN.DESCRIPTION}" column — descriptions were left as is`)
  }

  const cell = (cells, column) => (column === -1 ? null : String(cells[column] ?? '').trim())

  const body = rows.slice(1).map((cells) => ({
    url: String(cells[urlColumn] ?? '').trim(),
    title: cell(cells, titleColumn),
    description: cell(cells, descriptionColumn),
  }))

  if (body.length === 0) warnings.push('The sheet has a header but no rows')

  return { rows: body, warnings }
}
