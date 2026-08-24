import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { RefreshToken } from '../auth/model.js'
import { Role } from '../roles/model.js'
import { ensureDefaultRoles, invalidateRoleCache } from '../roles/service.js'
import { User } from '../users/model.js'
import { createUser } from '../users/service.js'
import { connectTestDb, disconnectTestDb } from '../../tests/db.js'
import { Media } from './model.js'
import { buildMediaVariantKey, createMediaFromUpload, mediaExists } from './service.js'

const PASSWORD = 'ek-lamba-sa-passphrase'

async function png(width = 1200, height = 600) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#2f6fed',
    },
  })
    .png()
    .toBuffer()
}

function fakeStorage() {
  const writes = []
  const deletes = []

  return {
    writes,
    deletes,
    async putObject(input) {
      writes.push(input)
      return { key: input.key, url: `/uploads/${input.key}` }
    },
    async deleteObject({ key }) {
      deletes.push(key)
    },
    publicUrl(key) {
      return `/uploads/${key}`
    },
  }
}

let uploader

beforeAll(async () => {
  await connectTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    RefreshToken.deleteMany({}),
    Media.deleteMany({}),
  ])
  invalidateRoleCache()
  await ensureDefaultRoles()

  uploader = await createUser({
    username: 'boss',
    name: 'Boss',
    email: 'admin@test.com',
    role: 'admin',
    password: PASSWORD,
  })
})

describe('buildMediaVariantKey', () => {
  it('D-41 storage key scheme banata hai UTC date se', () => {
    expect(
      buildMediaVariantKey({
        siteId: 'default',
        mediaId: 'abc123',
        date: new Date('2026-08-21T12:00:00.000Z'),
        variantKey: 'thumb',
      }),
    ).toBe('sites/default/media/2026/08/abc123/thumb.webp')
  })
})

describe('createMediaFromUpload', () => {
  it('validate/process/store karke Media document banata hai', async () => {
    const storage = fakeStorage()
    const bytes = await png(1200, 600)

    const media = await createMediaFromUpload(
      {
        filename: '../Hero Image.PNG',
        declaredMime: 'image/png',
        size: bytes.length,
        bytes,
        uploadedBy: uploader.id,
        alt: 'Homepage hero',
        title: 'Hero',
      },
      {
        storage,
        maxUploadMb: 20,
        now: new Date('2026-08-21T12:00:00.000Z'),
      },
    )

    expect(media).toMatchObject({
      filename: 'hero-image.png',
      mime: 'image/png',
      width: 1200,
      height: 600,
      alt: 'Homepage hero',
      title: 'Hero',
      uploadedBy: uploader.id,
    })
    expect(media.variants.map((variant) => variant.key)).toEqual(['thumb', 'medium', 'large'])
    expect(storage.writes.map((write) => write.key)).toEqual([
      `sites/default/media/2026/08/${media.id}/thumb.webp`,
      `sites/default/media/2026/08/${media.id}/medium.webp`,
      `sites/default/media/2026/08/${media.id}/large.webp`,
    ])
    expect(storage.writes.every((write) => write.contentType === 'image/webp')).toBe(true)
    expect(storage.writes.every((write) => write.cacheControl.includes('immutable'))).toBe(true)

    const stored = await Media.findById(media.id).lean()
    expect(stored).toMatchObject({
      filename: 'hero-image.png',
      mime: 'image/png',
      width: 1200,
      height: 600,
      deletedAt: null,
    })
    expect(stored.variants).toHaveLength(3)
  })

  it('validation fail ho to storage write aur DB create nahi hota', async () => {
    const storage = fakeStorage()

    await expect(
      createMediaFromUpload(
        {
          filename: 'logo.svg',
          declaredMime: 'image/svg+xml',
          size: 20,
          bytes: Buffer.from('<svg></svg>'),
          uploadedBy: uploader.id,
        },
        { storage },
      ),
    ).rejects.toMatchObject({ status: 400 })

    expect(storage.writes).toHaveLength(0)
    expect(await Media.countDocuments()).toBe(0)
  })

  it('DB save fail ho to written variants cleanup karta hai', async () => {
    const storage = fakeStorage()
    const bytes = await png(400, 200)

    await expect(
      createMediaFromUpload(
        {
          filename: 'bad.png',
          declaredMime: 'image/png',
          size: bytes.length,
          bytes,
          uploadedBy: 'not-an-object-id',
        },
        { storage, now: new Date('2026-08-21T12:00:00.000Z') },
      ),
    ).rejects.toThrow()

    expect(storage.writes).toHaveLength(3)
    expect(storage.deletes).toEqual(storage.writes.map((write) => write.key))
    expect(await Media.countDocuments()).toBe(0)
  })
})

/**
 * `mediaExists` doosre modules ke liye hai (aaj settings, D-42 §1). Isliye iske
 * contract ka apna test hai: **kabhi throw nahi karta**, sirf haan/naa deta hai.
 */
describe('mediaExists', () => {
  async function seed() {
    const uploader = await User.findOne({ email: 'admin@test.com' }).lean()

    return Media.create({
      filename: 'logo.png',
      mime: 'image/png',
      size: 2048,
      width: 512,
      height: 512,
      variants: [],
      uploadedBy: uploader._id,
    })
  }

  it('maujood media pe true', async () => {
    const media = await seed()
    expect(await mediaExists(String(media._id))).toBe(true)
  })

  it('anjaan ObjectId pe false', async () => {
    expect(await mediaExists('64f000000000000000000001')).toBe(false)
  })

  it('bekaar id pe false — CastError throw nahi karta', async () => {
    expect(await mediaExists('not-an-object-id')).toBe(false)
    expect(await mediaExists('')).toBe(false)
    expect(await mediaExists(null)).toBe(false)
  })

  it('trash me padi media pe false', async () => {
    const media = await seed()
    await Media.updateOne({ _id: media._id }, { $set: { deletedAt: new Date() } })

    expect(await mediaExists(String(media._id))).toBe(false)
  })

  it('doosre site ki media pe false', async () => {
    const media = await seed()
    expect(await mediaExists(String(media._id), 'doosri-site')).toBe(false)
  })
})
