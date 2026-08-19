#!/usr/bin/env node
import { connectDb, disconnectDb } from './core/db.js'
import { migrate, rollback, status } from './core/migrations/runner.js'

/**
 * `pnpm cms <command>` — 06-OPERATIONS.md §3.
 *
 * Migrations deploy step pe chalti hain, app boot se **pehle**.
 */

const COMMANDS = {
  migrate: 'Saari pending migrations chalao',
  'migrate:status': 'Kaunsi applied hai, kaunsi pending',
  'migrate:down': 'Aakhri migration rollback karo (ek baar me ek)',
}

function usage() {
  console.log('\n  pnpm cms <command>\n')
  for (const [name, desc] of Object.entries(COMMANDS)) {
    console.log(`    ${name.padEnd(18)} ${desc}`)
  }
  console.log('')
}

function printStatus(result) {
  if (result.rows.length === 0) {
    console.log('\n  Koi migration nahi mili (migrations/ khaali hai)\n')
    return
  }

  const icon = { applied: '✓', pending: '·', modified: '!', missing: '?' }

  console.log('')
  for (const row of result.rows) {
    const when = row.appliedAt
      ? new Date(row.appliedAt).toISOString().slice(0, 16).replace('T', ' ')
      : ''
    console.log(`  ${icon[row.state]} ${row.name.padEnd(40)} ${row.state.padEnd(10)} ${when}`)
  }
  console.log('')

  if (result.modified > 0) {
    console.log(`  ! ${result.modified} migration apply hone ke baad edit ho chuki hai.`)
    console.log('    Applied migration kabhi edit mat karo — nayi banao.\n')
  }
  if (result.missing > 0) {
    console.log(`  ? ${result.missing} migration ledger me hai par disk pe nahi.\n`)
  }
  if (result.pending > 0) {
    console.log(`  ${result.pending} pending. Chalane ke liye: pnpm cms migrate\n`)
  }
}

const command = process.argv[2]

if (!command || !COMMANDS[command]) {
  if (command) console.error(`\n  Unknown command: ${command}`)
  usage()
  process.exit(command ? 1 : 0)
}

await connectDb()

try {
  if (command === 'migrate') {
    await migrate({ log: console.log })
  } else if (command === 'migrate:status') {
    printStatus(await status())
  } else if (command === 'migrate:down') {
    await rollback({ log: console.log })
  }
} catch (err) {
  console.error(`\n  ✗ ${err.message}\n`)
  await disconnectDb()
  process.exit(1)
}

await disconnectDb()
process.exit(0)
