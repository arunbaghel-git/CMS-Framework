import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  assertPixelLimit,
  generateWebpVariants,
  MEDIA_VARIANTS,
  readImageMetadata,
} from './image-processing.js'

async function image(width, height, format = 'png') {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#2f6fed',
    },
  })
    .toFormat(format)
    .toBuffer()
}

describe('readImageMetadata', () => {
  it('image dimensions aur format padhta hai', async () => {
    const metadata = await readImageMetadata(await image(1200, 600, 'png'))

    expect(metadata).toMatchObject({
      width: 1200,
      height: 600,
      format: 'png',
      hasAlpha: false,
    })
  })

  it('invalid image pe clear 400 error deta hai', async () => {
    await expect(readImageMetadata(Buffer.from('not-an-image'))).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
    })
  })
})

describe('assertPixelLimit', () => {
  it('limit ke andar image allow karta hai', () => {
    expect(() => assertPixelLimit({ width: 1000, height: 1000 }, 1_000_000)).not.toThrow()
  })

  it('limit ke bahar image reject karta hai', () => {
    expect(() => assertPixelLimit({ width: 1001, height: 1000 }, 1_000_000)).toThrow(
      /too many pixels/,
    )
  })

  it('missing dimensions reject karta hai', () => {
    expect(() => assertPixelLimit({ width: 0, height: 100 }, 1_000_000)).toThrow(/dimensions/)
  })
})

describe('generateWebpVariants', () => {
  it('D-41 thumb/medium/large WebP variants banata hai', async () => {
    const result = await generateWebpVariants(await image(1200, 600, 'png'), { quality: 80 })

    expect(result.original).toMatchObject({ width: 1200, height: 600, format: 'png' })
    expect(result.variants.map((variant) => variant.key)).toEqual(['thumb', 'medium', 'large'])

    expect(result.variants[0]).toMatchObject({ key: 'thumb', mime: 'image/webp', w: 300, h: 150 })
    expect(result.variants[1]).toMatchObject({
      key: 'medium',
      mime: 'image/webp',
      w: 800,
      h: 400,
    })
    expect(result.variants[2]).toMatchObject({
      key: 'large',
      mime: 'image/webp',
      w: 1200,
      h: 600,
    })

    for (const variant of result.variants) {
      expect(Buffer.isBuffer(variant.buffer)).toBe(true)
      expect((await sharp(variant.buffer).metadata()).format).toBe('webp')
    }
  })

  it('chhoti image ko upscale nahi karta', async () => {
    const result = await generateWebpVariants(await image(200, 100, 'jpeg'))

    expect(result.variants).toHaveLength(MEDIA_VARIANTS.length)
    for (const variant of result.variants) {
      expect(variant.w).toBe(200)
      expect(variant.h).toBe(100)
    }
  })

  it('pixel limit processing se pehle enforce karta hai', async () => {
    await expect(
      generateWebpVariants(await image(120, 120, 'png'), { maxPixels: 10_000 }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
    })
  })
})
