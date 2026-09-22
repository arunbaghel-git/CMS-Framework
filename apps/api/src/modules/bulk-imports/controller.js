import { exportSeoCsv, getImportRun, listImportRuns, startImport } from './service.js'
import { importRunQuerySchema, startImportSchema } from './validation.js'

/**
 * Excel ka BOM (U+FEFF) — iske bina Excel CSV ko apni local encoding me kholta hai aur `₹`
 * jaise chinh aur non-ASCII naam toot kar dikhte hain.
 *
 * `fromCharCode` se banaya hai, file me literal character likh kar nahi: wo character editor me
 * dikhta hi nahi (isliye galti se hat jaana bahut aasaan hai) aur lint use "irregular
 * whitespace" batata hai. Wahi jodi `forms/controller.js` me hai.
 */
const BOM = String.fromCharCode(0xfeff)

/** Har mutation ka actor — wahi shape jo `entries/controller.js` me hai. */
const actorOf = (req) => ({ user: req.user, permissions: req.permissions ?? [] })

export const bulkImportController = {
  /**
   * Import shuru karo.
   *
   * ⚠️ Ye **turant** lautta hai. Sheet yahin padhi jaati hai (chhoti fetch), par docs baad me
   * ek-ek karke chalte hain — 20 doc me 30-120 second lagte hain aur koi request itni der nahi
   * ruk sakti. Aage ki khabar `GET /:id` se milti hai.
   */
  async start(req, res, next) {
    try {
      const input = startImportSchema.parse(req.body)
      const run = await startImport(input, actorOf(req))

      res.status(201).json({ data: { run } })
    } catch (err) {
      next(err)
    }
  },

  async list(req, res, next) {
    try {
      const query = importRunQuerySchema.parse(req.query)
      const { runs, meta } = await listImportRuns(query)

      res.json({ data: { runs }, meta })
    } catch (err) {
      next(err)
    }
  },

  async get(req, res, next) {
    try {
      res.json({ data: { run: await getImportRun(req.params.id) } })
    } catch (err) {
      next(err)
    }
  },

  /**
   * Poori site ka SEO ek CSV me (D-107).
   *
   * ⚠️ Koi query param nahi hai, aur wo ek faisla hai — client ne "sab types, sirf Published"
   * chuna (21 Sep). Filter jod dene ka matlab hota ki client ek adhoori file utaare, use bhar
   * kar wapas bheje, aur samjhe ki poori site ho gayi.
   */
  async exportSeo(req, res, next) {
    try {
      const csv = await exportSeoCsv()
      const stamp = new Date().toISOString().slice(0, 10)

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="seo-${stamp}.csv"`)
      res.send(BOM + csv)
    } catch (err) {
      next(err)
    }
  },
}
