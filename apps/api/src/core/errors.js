import { ZodError } from 'zod'

/**
 * Error types + Express error handler.
 * Response shape: { error: { code, message, details } } — 07-CONVENTIONS.md §6
 */

export class AppError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} code machine-readable code, jaise ENTRY_CONFLICT
   * @param {string} message user ko dikhne wala message
   * @param {object} [details]
   */
  constructor(status, code, message, details) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (msg, details) => new AppError(400, 'BAD_REQUEST', msg, details)
export const unauthorized = (msg = 'Login zaroori hai') => new AppError(401, 'UNAUTHORIZED', msg)
export const forbidden = (msg = 'Iski permission nahi hai') => new AppError(403, 'FORBIDDEN', msg)
export const notFound = (msg = 'Nahi mila') => new AppError(404, 'NOT_FOUND', msg)

/** Optimistic concurrency — `version` mismatch. */
export const conflict = (msg = 'Ye item beech me kisi aur ne badla hai', details) =>
  new AppError(409, 'CONFLICT', msg, details)

/** Business rule fail — reserved slug, circular parent, etc. */
export const unprocessable = (msg, details) => new AppError(422, 'UNPROCESSABLE', msg, details)

/**
 * Terminal error handler. Har unknown error 500 banta hai aur log hota hai —
 * client ko kabhi stack trace nahi jaata.
 */

export function errorHandler(err, req, res, _next) {
  /**
   * Zod fail = client ne galat input bheja = 400 (07-CONVENTIONS §6).
   *
   * Iske bina har validation error 500 banta hai — matlab client ko "kuch galat ho
   * gaya" milta hai jabki asli baat ye hai ki uska email khaali tha.
   */
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Bheja gaya data sahi nahi hai',
        details: {
          fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
    })
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    })
  }

  req.log?.error({ err }, 'Unhandled error')

  return res.status(500).json({
    error: { code: 'INTERNAL', message: 'Kuch galat ho gaya. Dobara koshish karein.' },
  })
}

/** 404 — koi route match nahi hua. */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route nahi mila: ${req.method} ${req.path}` },
  })
}
