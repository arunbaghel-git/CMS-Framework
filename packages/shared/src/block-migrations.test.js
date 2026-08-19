import { describe, expect, it } from 'vitest'

import {
  blockMigrations,
  mapBlocks,
  migrateContent,
  needsContentMigration,
  renameBlockType,
} from './block-migrations.js'
import { CURRENT_CONTENT_VERSION } from './schemas/content.js'

const tree = () => [
  {
    id: 'b1',
    type: 'section',
    props: {},
    children: [
      { id: 'b2', type: 'text', props: { body: 'hi' } },
      { id: 'b3', type: 'heading', props: {}, children: [{ id: 'b4', type: 'text', props: {} }] },
    ],
  },
]

describe('migrateContent', () => {
  it('current version pe kuch nahi karta — wahi object wapas', () => {
    const content = { version: CURRENT_CONTENT_VERSION, blocks: [] }
    expect(migrateContent(content)).toBe(content)
  })

  it('missing migration pe saaf error deta hai, chup nahi rehta', () => {
    expect(() => migrateContent({ version: 0, blocks: [] })).toThrow(/migration missing/i)
  })

  it('needsContentMigration purane content ko pakadta hai', () => {
    expect(needsContentMigration({ version: 0, blocks: [] })).toBe(true)
    expect(needsContentMigration({ version: CURRENT_CONTENT_VERSION, blocks: [] })).toBe(false)
    expect(needsContentMigration(undefined)).toBe(false)
  })

  it('version bump na karne wali migration pe rukta hai — infinite loop nahi', () => {
    blockMigrations[0] = (c) => ({ ...c }) // version nahi badhaya
    expect(() => migrateContent({ version: 0, blocks: [] })).toThrow(/version bump nahi/i)
    delete blockMigrations[0]
  })

  it('chain me multiple steps chalata hai', () => {
    blockMigrations[-2] = (c) => ({ ...c, version: -1 })
    blockMigrations[-1] = (c) => ({
      ...c,
      version: CURRENT_CONTENT_VERSION,
      blocks: [{ id: 'x', type: 'a', props: {} }],
    })

    const out = migrateContent({ version: -2, blocks: [] })

    expect(out.version).toBe(CURRENT_CONTENT_VERSION)
    expect(out.blocks).toHaveLength(1)

    delete blockMigrations[-2]
    delete blockMigrations[-1]
  })
})

describe('mapBlocks', () => {
  it('nested tree ke har block pe chalta hai', () => {
    const touched = []
    mapBlocks(tree(), (b) => {
      touched.push(b.id)
      return b
    })

    expect(touched).toEqual(['b1', 'b2', 'b3', 'b4'])
  })

  it('original tree mutate nahi karta', () => {
    const original = tree()
    mapBlocks(original, (b) => ({ ...b, type: 'changed' }))

    expect(original[0].type).toBe('section')
  })
})

describe('renameBlockType', () => {
  it('nested level pe bhi rename karta hai', () => {
    const renamed = renameBlockType(tree(), 'text', 'paragraph')

    expect(renamed[0].children[0].type).toBe('paragraph')
    expect(renamed[0].children[1].children[0].type).toBe('paragraph')
    expect(renamed[0].type).toBe('section')
  })
})
