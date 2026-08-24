import path from 'node:path'

import { badRequest } from '../../core/errors.js'
import { MEDIA_MIME } from './model.js'

export const ALLOWED_UPLOAD_MIME = MEDIA_MIME

const MIME_EXTENSION = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
})

/**
 * Client ka filename storage key nahi banta (D-41), par metadata me dikhna hai. Isliye
 * path hatao, unsafe chars normalize karo, aur khaali result pe predictable naam do.
 *
 * @param {string} filename
 */
export function sanitizeFilename(filename) {
  const base = path.basename(String(filename || '').replaceAll('\\', '/'))
  const ext = path
    .extname(base)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
  const rawName = base.slice(0, base.length - ext.length)

  const name = rawName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const safeName = name || 'upload'
  const safeExt = ext && ext !== '.' ? ext : ''

  return `${safeName}${safeExt}`.slice(0, 120)
}

/**
 * Magic-byte based MIME detection. Header pe bharosa nahi karna (D-41).
 *
 * @param {Buffer|Uint8Array} bytes
 */
export function detectImageMime(bytes) {
  const buffer = Buffer.from(bytes ?? [])

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }

  return null
}

/** @param {string} mime */
export function assertAllowedMime(mime) {
  if (!ALLOWED_UPLOAD_MIME.includes(mime)) {
    throw badRequest(`Unsupported media type: ${mime || 'unknown'}`)
  }
}

/**
 * @param {number} sizeBytes
 * @param {number} maxUploadMb
 */
export function assertUploadSize(sizeBytes, maxUploadMb) {
  const maxBytes = maxUploadMb * 1024 * 1024

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw badRequest('Uploaded file is empty')
  }

  if (sizeBytes > maxBytes) {
    throw badRequest(`Uploaded file is too large. Max size is ${maxUploadMb}MB`)
  }
}

/**
 * @param {{ filename: string, declaredMime: string, size: number, bytes: Buffer|Uint8Array, maxUploadMb: number }} input
 */
export function validateUploadFile({ filename, declaredMime, size, bytes, maxUploadMb }) {
  assertAllowedMime(declaredMime)
  assertUploadSize(size, maxUploadMb)

  const detectedMime = detectImageMime(bytes)
  if (!detectedMime) {
    throw badRequest('Uploaded file is not a supported image')
  }

  if (detectedMime !== declaredMime) {
    throw badRequest('Uploaded file type does not match its contents')
  }

  return {
    filename: ensureExtension(sanitizeFilename(filename), detectedMime),
    mime: detectedMime,
    size,
  }
}

/**
 * Sanitized naam me extension na ho ya galat ho to detected MIME se stable extension do.
 *
 * @param {string} filename
 * @param {string} mime
 */
export function ensureExtension(filename, mime) {
  const wanted = MIME_EXTENSION[mime]
  const parsed = path.parse(filename)
  if (!wanted) return filename

  if (parsed.ext.toLowerCase() === `.${wanted}`) return filename
  if (mime === 'image/jpeg' && parsed.ext.toLowerCase() === '.jpeg') return filename

  return `${parsed.name}.${wanted}`
}
