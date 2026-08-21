import sharp from 'sharp'

import { badRequest } from '../../core/errors.js'
import { MEDIA_VARIANT_KEY } from './model.js'

export const DEFAULT_MAX_IMAGE_PIXELS = 40_000_000

export const MEDIA_VARIANTS = Object.freeze([
  { key: 'thumb', width: 300 },
  { key: 'medium', width: 800 },
  { key: 'large', width: 1600 },
])

/**
 * Sharp se metadata padhta hai. Pixel limit sharp ko bhi di jaati hai, aur apna guard
 * bhi lagta hai taaki decompression-bomb type images early fail hon (D-41).
 *
 * @param {Buffer|Uint8Array} input
 * @param {{ maxPixels?: number }} [options]
 */
export async function readImageMetadata(input, { maxPixels = DEFAULT_MAX_IMAGE_PIXELS } = {}) {
  try {
    const metadata = await sharp(input, { limitInputPixels: maxPixels }).metadata()

    if (!metadata.width || !metadata.height) {
      throw badRequest('Uploaded image dimensions could not be read')
    }

    assertPixelLimit(metadata, maxPixels)

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      hasAlpha: Boolean(metadata.hasAlpha),
      orientation: metadata.orientation ?? null,
    }
  } catch (err) {
    if (err?.name === 'AppError') throw err
    throw badRequest('Uploaded image could not be processed')
  }
}

/**
 * @param {{ width?: number, height?: number }} metadata
 * @param {number} maxPixels
 */
export function assertPixelLimit(metadata, maxPixels = DEFAULT_MAX_IMAGE_PIXELS) {
  const { width, height } = metadata

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw badRequest('Uploaded image dimensions could not be read')
  }

  if (width * height > maxPixels) {
    throw badRequest('Uploaded image has too many pixels')
  }
}

/**
 * D-41 variants: thumb 300, medium 800, large 1600 — WebP, aspect ratio preserved.
 * Original file ka public buffer/url yahan return nahi hota.
 *
 * @param {Buffer|Uint8Array} input
 * @param {{ maxPixels?: number, quality?: number }} [options]
 */
export async function generateWebpVariants(
  input,
  { maxPixels = DEFAULT_MAX_IMAGE_PIXELS, quality = 82 } = {},
) {
  const metadata = await readImageMetadata(input, { maxPixels })

  const variants = await Promise.all(
    MEDIA_VARIANTS.map(async ({ key, width }) => {
      const buffer = await sharp(input, { limitInputPixels: maxPixels })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer()

      const out = await sharp(buffer).metadata()

      return {
        key,
        buffer,
        mime: 'image/webp',
        w: out.width,
        h: out.height,
      }
    }),
  )

  return {
    original: metadata,
    variants,
  }
}

/**
 * Boot-time sanity: docs/model/test sab ek hi variant keys pe rahein.
 */
if (MEDIA_VARIANTS.some((variant) => !MEDIA_VARIANT_KEY.includes(variant.key))) {
  throw new Error('MEDIA_VARIANTS aur MEDIA_VARIANT_KEY mismatch')
}
