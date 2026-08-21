import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createStorageDriver } from './index.js'
import {
  assertSafeStorageKey,
  createLocalStorageDriver,
  resolveUploadDir,
} from './local.js'

const TEST_ROOT = path.resolve(process.cwd(), 'apps/api/.test-uploads')

afterEach(async () => {
  await rm(TEST_ROOT, { recursive: true, force: true })
})

describe('resolveUploadDir', () => {
  it('relative UPLOAD_DIR apps/api root se resolve hota hai, cwd se nahi', () => {
    const apiRoot = path.resolve(process.cwd(), 'apps/api')
    expect(resolveUploadDir('./uploads', apiRoot)).toBe(path.resolve(apiRoot, './uploads'))
  })

  it('absolute UPLOAD_DIR wahi use hota hai', () => {
    const absolute = path.resolve(process.cwd(), 'custom-uploads')
    expect(resolveUploadDir(absolute, path.resolve(process.cwd(), 'apps/api'))).toBe(absolute)
  })
})

describe('safe storage keys', () => {
  it('D-41 key scheme accept karta hai', () => {
    expect(assertSafeStorageKey('sites/default/media/2026/08/abc/thumb.webp')).toBe(
      path.join('sites', 'default', 'media', '2026', '08', 'abc', 'thumb.webp'),
    )
  })

  it('path traversal reject karta hai', () => {
    for (const key of ['../x.webp', 'sites/default/../x.webp', '/abs/x.webp', 'a\\b.webp']) {
      expect(() => assertSafeStorageKey(key)).toThrow(/Unsafe media storage key/)
    }
  })
})

describe('local storage driver', () => {
  it('same D-41 key layout me file likhta hai aur /uploads URL deta hai', async () => {
    const driver = createLocalStorageDriver({
      uploadDir: './uploads',
      publicBaseUrl: '/uploads',
      apiRoot: TEST_ROOT,
    })
    const key = 'sites/default/media/2026/08/abc/thumb.webp'

    await driver.putObject({ key, body: Buffer.from('webp-bytes'), contentType: 'image/webp' })

    expect(await readFile(path.join(TEST_ROOT, 'uploads', key), 'utf8')).toBe('webp-bytes')
    expect(driver.publicUrl(key)).toBe('/uploads/sites/default/media/2026/08/abc/thumb.webp')
  })

  it('deleteObject wahi key delete karta hai', async () => {
    const driver = createLocalStorageDriver({
      uploadDir: './uploads',
      apiRoot: TEST_ROOT,
    })
    const key = 'sites/default/media/2026/08/abc/medium.webp'

    await driver.putObject({ key, body: 'x' })
    await driver.deleteObject({ key })

    await expect(readFile(path.join(TEST_ROOT, 'uploads', key))).rejects.toThrow()
  })

  it('missing file delete idempotent hai', async () => {
    await mkdir(TEST_ROOT, { recursive: true })
    const driver = createLocalStorageDriver({ uploadDir: './uploads', apiRoot: TEST_ROOT })

    await expect(
      driver.deleteObject({ key: 'sites/default/media/2026/08/missing/thumb.webp' }),
    ).resolves.toBeUndefined()
  })
})

describe('storage factory', () => {
  it('local driver banata hai', () => {
    const driver = createStorageDriver({ STORAGE_DRIVER: 'local', UPLOAD_DIR: './uploads' })
    expect(driver.kind).toBe('local')
  })

  it('s3 selected ho to clear fail hota hai, local fallback nahi', () => {
    expect(() =>
      createStorageDriver({
        STORAGE_DRIVER: 's3',
        S3_ENDPOINT: 'https://r2.example.com',
        S3_BUCKET: 'bucket',
        S3_REGION: 'auto',
        S3_ACCESS_KEY: 'key',
        S3_SECRET_KEY: 'secret',
      }),
    ).toThrow(/STORAGE_DRIVER=s3 selected hai/)
  })
})
