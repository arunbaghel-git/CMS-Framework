import * as masterListService from './service.js'
import { SCHEMAS, masterListQuerySchema } from './validation.js'

/**
 * Patla controller — validate → service → response (R1).
 *
 * Har handler **list key** leta hai (`hotel` | `addOn` | `transfer` | `review`), taaki
 * chaaron lists ke liye ek hi handler chale. Key routes se aati hai, `req` se kabhi nahi — warna client
 * `?list=` bhej kar doosri list pe likh sakta, aur uski permission bhi galat check hoti.
 */

const handlers = (key) => ({
  async list(req, res, next) {
    try {
      const query = masterListQuerySchema.parse(req.query)
      const { items, meta } = await masterListService.listItems(key, query)

      res.json({ data: { items }, meta })
    } catch (err) {
      next(err)
    }
  },

  async get(req, res, next) {
    try {
      res.json({ data: { item: await masterListService.getItem(key, req.params.id) } })
    } catch (err) {
      next(err)
    }
  },

  async create(req, res, next) {
    try {
      const input = SCHEMAS[key].create.parse(req.body)

      res.status(201).json({ data: { item: await masterListService.createItem(key, input) } })
    } catch (err) {
      next(err)
    }
  },

  async update(req, res, next) {
    try {
      const input = SCHEMAS[key].update.parse(req.body)

      res.json({ data: { item: await masterListService.updateItem(key, req.params.id, input) } })
    } catch (err) {
      next(err)
    }
  },

  async remove(req, res, next) {
    try {
      res.json({ data: await masterListService.deleteItem(key, req.params.id) })
    } catch (err) {
      next(err)
    }
  },
})

export const hotelController = handlers('hotel')
export const addOnController = handlers('addOn')
export const transferController = handlers('transfer')
export const reviewController = handlers('review')
export const videoReviewController = handlers('videoReview')
