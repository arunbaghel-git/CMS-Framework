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
