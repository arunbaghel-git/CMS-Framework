import { getImportRun, listImportRuns, startImport } from './service.js'
import { importRunQuerySchema, startImportSchema } from './validation.js'

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
}
