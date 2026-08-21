import { describe, expect, it } from 'vitest'

import {
  ALLOWED_UPLOAD_MIME,
  detectImageMime,
  ensureExtension,
  sanitizeFilename,
  validateUploadFile,
} from './upload-validation.js'

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const webp = Buffer.from('RIFFxxxxWEBPVP8 ', 'ascii')

describe('allowed upload MIME', () => {
  it('sirf D-41 raster image MIME allow karta hai', () => {
    expect(ALLOWED_UPLOAD_MIME).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})

describe('sanitizeFilename', () => {
  it('path aur unsafe characters hata deta hai', () => {
    expect(sanitizeFilename('../Hero Image (Final).JPG')).toBe('hero-image-final.jpg')
    expect(sanitizeFilename('folder\\Logo @ 2x.PNG')).toBe('logo-2x.png')
  })

  it('khaali naam pe stable fallback deta hai', () => {
    expect(sanitizeFilename('')).toBe('upload')
    expect(sanitizeFilename('$$$.png')).toBe('upload.png')
  })

  it('filename ko bounded rakhta hai', () => {
    expect(sanitizeFilename(`${'a'.repeat(200)}.jpg`)).toHaveLength(120)
  })
})

describe('detectImageMime', () => {
  it('jpeg/png/webp magic bytes detect karta hai', () => {
    expect(detectImageMime(jpeg)).toBe('image/jpeg')
    expect(detectImageMime(png)).toBe('image/png')
    expect(detectImageMime(webp)).toBe('image/webp')
  })

  it('SVG ya unknown bytes reject ke liye null deta hai', () => {
    expect(detectImageMime(Buffer.from('<svg><script></script></svg>'))).toBeNull()
    expect(detectImageMime(Buffer.from('not-image'))).toBeNull()
  })
})

describe('ensureExtension', () => {
  it('missing ya wrong extension ko detected MIME se normalize karta hai', () => {
    expect(ensureExtension('logo', 'image/png')).toBe('logo.png')
    expect(ensureExtension('logo.gif', 'image/webp')).toBe('logo.webp')
  })

  it('jpeg aur jpg dono rakhta hai', () => {
    expect(ensureExtension('photo.jpeg', 'image/jpeg')).toBe('photo.jpeg')
    expect(ensureExtension('photo.jpg', 'image/jpeg')).toBe('photo.jpg')
  })
})

describe('validateUploadFile', () => {
  it('valid file ka normalized metadata deta hai', () => {
    expect(
      validateUploadFile({
        filename: 'Hero Image.PNG',
        declaredMime: 'image/png',
        size: png.length,
        bytes: png,
        maxUploadMb: 20,
      }),
    ).toEqual({
      filename: 'hero-image.png',
      mime: 'image/png',
      size: png.length,
    })
  })

  it('SVG MIME block karta hai', () => {
    expect(() =>
      validateUploadFile({
        filename: 'logo.svg',
        declaredMime: 'image/svg+xml',
        size: 20,
        bytes: Buffer.from('<svg></svg>'),
        maxUploadMb: 20,
      }),
    ).toThrow(/Unsupported media type/)
  })

  it('declared MIME aur magic bytes mismatch pe fail karta hai', () => {
    expect(() =>
      validateUploadFile({
        filename: 'fake.png',
        declaredMime: 'image/png',
        size: jpeg.length,
        bytes: jpeg,
        maxUploadMb: 20,
      }),
    ).toThrow(/does not match/)
  })

  it('empty aur over-limit file reject karta hai', () => {
    expect(() =>
      validateUploadFile({
        filename: 'empty.png',
        declaredMime: 'image/png',
        size: 0,
        bytes: Buffer.alloc(0),
        maxUploadMb: 20,
      }),
    ).toThrow(/empty/)

    expect(() =>
      validateUploadFile({
        filename: 'huge.webp',
        declaredMime: 'image/webp',
        size: 2 * 1024 * 1024,
        bytes: webp,
        maxUploadMb: 1,
      }),
    ).toThrow(/too large/)
  })
})
