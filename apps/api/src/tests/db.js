import mongoose from 'mongoose'

/**
 * Test database ka connection.
 *
 * **Har vitest worker ko apna database milta hai.** Vitest test files ko parallel
 * chalata hai; sab ek hi DB pe hon to ek file ka `deleteMany()` doosri file ke beech
 * me uske users uda deta hai. Nateeja: random 401, aur wahi test kabhi pass kabhi
 * fail — debug karne me sabse mushkil tarah ki failure.
 *
 * Naam `VITEST_WORKER_ID` se banta hai, file ke naam se nahi — ek hi worker pe do
 * files sequentially chalti hain, isliye takraav nahi hota.
 */
export function testDbName() {
  const worker = process.env.VITEST_WORKER_ID ?? process.env.VITEST_POOL_ID ?? '1'
  return `${process.env.MONGODB_DB_NAME}_w${worker}`
}

export async function connectTestDb() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: testDbName() })
}

/** Test khatam — DB gira do, connection band karo. */
export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
}
