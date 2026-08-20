import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

import mongoose from 'mongoose'
import { Migration } from './model.js'

/**
 * Schema/data migration runner — 06-OPERATIONS.md §3.1.
 *
 * Rules jo ye enforce karta hai:
 *   - Numbered files, strictly sequential order
 *   - `migrations` collection me record, checksum ke saath
 *   - Idempotent — applied migration dobara nahi chalti
 *   - Reversible — har migration me `down()` zaroori hai
 *
 * Ye **block-tree migrations se alag** hai. Wo per-document aur lazy hain
 * (packages/shared/block-migrations.js), kyunki ek page ka content v1 pe ho sakta
 * hai jab site v4 pe hai.
 */

/**
 * Migrations kahan hain.
 *
 * Default `cwd/migrations` hai — client-repo model (D-15) me cwd hi client repo ka
 * root hota hai, isliye wahan ye sahi jagah hai. Monorepo dev me API `apps/api` se
 * chalti hai, isliye wahan `MIGRATIONS_DIR` env var se override hota hai.
 */
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR
  ? path.resolve(process.env.MIGRATIONS_DIR)
  : path.resolve(process.cwd(), 'migrations')

/** `001-add-path-field.js` → sortable, aur `blocks/` ko chhodta hai. */
const FILE_PATTERN = /^\d{3,}-[a-z0-9-]+\.js$/

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

/**
 * Disk se saari migration files padhta hai, order me.
 * @param {string} [dir]
 */
export async function loadMigrations(dir = MIGRATIONS_DIR) {
  if (!existsSync(dir)) {
    /**
     * `MIGRATIONS_DIR` set hai par wahan kuch hai hi nahi = **config galat hai**,
     * "koi migration nahi" nahi.
     *
     * Chup-chaap `[]` lautana yahan ka sabse khatarnaak behaviour tha: `pnpm cms
     * migrate` "Koi pending migration nahi" bol kar exit 0 deta tha, deploy green
     * nikal jaata, aur indexes kabhi bante hi nahi. Path relative ho to ye aur aasaan
     * hai — `../../migrations` cwd ke hisaab se badalta hai.
     */
    if (process.env.MIGRATIONS_DIR) {
      throw new Error(
        `MIGRATIONS_DIR aisi jagah point kar raha hai jo hai hi nahi:\n` +
          `  MIGRATIONS_DIR = ${process.env.MIGRATIONS_DIR}\n` +
          `  resolve hua     = ${dir}\n` +
          `  cwd             = ${process.cwd()}\n` +
          `Relative path cwd ke hisaab se badalta hai — absolute path do.`,
      )
    }

    return []
  }

  const entries = await readdir(dir, { withFileTypes: true })
  const files = entries
    .filter((e) => e.isFile() && FILE_PATTERN.test(e.name))
    .map((e) => e.name)
    .sort()

  const loaded = []

  for (const name of files) {
    const filePath = path.join(dir, name)
    const source = await readFile(filePath, 'utf8')
    const mod = await import(pathToFileURL(filePath).href)

    if (typeof mod.up !== 'function') {
      throw new Error(`Migration ${name} me \`up()\` export nahi hai`)
    }
    if (typeof mod.down !== 'function') {
      throw new Error(
        `Migration ${name} me \`down()\` export nahi hai — rollback ka koi raasta nahi bachta`,
      )
    }

    loaded.push({ name, checksum: sha256(source), up: mod.up, down: mod.down })
  }

  return loaded
}

/**
 * Kya applied hua, kya pending, aur kya edit ho chuka hai.
 * @param {string} [dir]
 */
export async function status(dir = MIGRATIONS_DIR) {
  const onDisk = await loadMigrations(dir)
  const applied = await Migration.find().lean()
  const appliedByName = new Map(applied.map((m) => [m.name, m]))

  const rows = onDisk.map((m) => {
    const record = appliedByName.get(m.name)
    if (!record) return { name: m.name, state: 'pending' }
    if (record.checksum !== m.checksum)
      return { name: m.name, state: 'modified', appliedAt: record.appliedAt }
    return { name: m.name, state: 'applied', appliedAt: record.appliedAt }
  })

  // Ledger me hai par disk pe nahi — koi file delete ho gayi
  for (const record of applied) {
    if (!onDisk.some((m) => m.name === record.name)) {
      rows.push({ name: record.name, state: 'missing', appliedAt: record.appliedAt })
    }
  }

  rows.sort((a, b) => a.name.localeCompare(b.name))

  return {
    rows,
    pending: rows.filter((r) => r.state === 'pending').length,
    modified: rows.filter((r) => r.state === 'modified').length,
    missing: rows.filter((r) => r.state === 'missing').length,
  }
}

/**
 * Saari pending migrations chalata hai, order me.
 *
 * Ek fail hui to wahin rukta hai — aage wali nahi chalti, kyunki wo is wali pe
 * depend kar sakti hai.
 *
 * @param {{ dir?: string, log?: (msg: string) => void }} [opts]
 */
export async function migrate({ dir = MIGRATIONS_DIR, log = () => {} } = {}) {
  const onDisk = await loadMigrations(dir)
  const applied = await Migration.find().lean()
  const appliedByName = new Map(applied.map((m) => [m.name, m]))

  // Applied migration edit ho gayi = do instances chup-chaap alag state pe
  for (const m of onDisk) {
    const record = appliedByName.get(m.name)
    if (record && record.checksum !== m.checksum) {
      throw new Error(
        `Migration ${m.name} apply hone ke baad edit ho chuki hai. ` +
          `Applied migration kabhi edit mat karo — nayi migration banao.`,
      )
    }
  }

  const pending = onDisk.filter((m) => !appliedByName.has(m.name))

  if (pending.length === 0) {
    log('Koi pending migration nahi.')
    return { applied: [] }
  }

  const db = mongoose.connection.db
  const done = []

  for (const m of pending) {
    const startedAt = Date.now()
    log(`→ ${m.name}`)

    try {
      await m.up({ db, mongoose })
    } catch (err) {
      log(`✗ ${m.name} fail — aage wali migrations nahi chalengi`)
      throw err
    }

    const durationMs = Date.now() - startedAt
    await Migration.create({ name: m.name, checksum: m.checksum, durationMs })
    done.push(m.name)
    log(`✓ ${m.name} (${durationMs}ms)`)
  }

  log(`${done.length} migration${done.length === 1 ? '' : 's'} applied.`)
  return { applied: done }
}

/**
 * Aakhri applied migration ko rollback karta hai.
 *
 * Ek baar me ek hi — bulk rollback se galti se poora data ud sakta hai.
 *
 * @param {{ dir?: string, log?: (msg: string) => void }} [opts]
 */
export async function rollback({ dir = MIGRATIONS_DIR, log = () => {} } = {}) {
  const last = await Migration.findOne().sort({ name: -1 }).lean()

  if (!last) {
    log('Rollback ke liye kuch nahi hai.')
    return { rolledBack: null }
  }

  const onDisk = await loadMigrations(dir)
  const migration = onDisk.find((m) => m.name === last.name)

  if (!migration) {
    throw new Error(`${last.name} ledger me hai par disk pe nahi — rollback nahi ho sakta`)
  }

  log(`← ${migration.name}`)
  await migration.down({ db: mongoose.connection.db, mongoose })
  await Migration.deleteOne({ name: migration.name })
  log(`✓ ${migration.name} rolled back`)

  return { rolledBack: migration.name }
}

/**
 * Boot pe pending migrations check karta hai.
 *
 * Yahan **jaan-boojh kar boot nahi rokte** — chalti hui client site ko down karna
 * pending migration se zyada nuksaandeh hai. Loud warning + health endpoint pe
 * surface, aur admin dashboard ke Site Health card me dikhta hai.
 */
export async function checkPending() {
  try {
    const s = await status()
    return { pending: s.pending, modified: s.modified, missing: s.missing }
  } catch {
    return { pending: 0, modified: 0, missing: 0, error: true }
  }
}
