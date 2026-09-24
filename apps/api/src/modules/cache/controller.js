import * as cacheService from './service.js'

/** Patla — body kuch nahi leta, to validate karne ko bhi kuch nahi (R1). */
export async function flush(req, res, next) {
  try {
    res.json({ data: await cacheService.flushCache(req.user) })
  } catch (err) {
    next(err)
  }
}
