/**
 * `users` · `roles` · `refreshTokens` ke indexes — 02-ARCHITECTURE.md §8.
 *
 * Indexes migration me hain, model me nahi — `autoIndex` production me off rehta hai
 * aur index build deploy-time operation hai, boot-time nahi (migration 001 dekho).
 */

export async function up({ db }) {
  // Email login ka identity hai. Unique index ke bina do users ek hi email pe ban
  // sakte hain aur login "pehla jo mil jaaye" ban jaata hai.
  await db.collection('users').createIndexes([
    { key: { email: 1 }, name: 'email_unique', unique: true },
    // Users list ka default sort + role filter tabs (admin design)
    { key: { role: 1, createdAt: -1 }, name: 'role_createdAt' },
  ])

  await db
    .collection('roles')
    .createIndexes([{ key: { key: 1 }, name: 'key_unique', unique: true }])

  await db.collection('refreshTokens').createIndexes([
    // Har refresh isi lookup se shuru hota hai
    { key: { jti: 1 }, name: 'jti_unique', unique: true },
    // Reuse detect hone pe poori family ek saath revoke hoti hai
    { key: { familyId: 1 }, name: 'familyId' },
    // "Sab devices se logout" + user deactivate hone pe sessions kaatna
    { key: { userId: 1, revokedAt: 1 }, name: 'userId_revokedAt' },
    // TTL — expire hue tokens Mongo khud hata deta hai. Iske bina ye collection
    // sirf badhta rehta hai; har login 7 din ka ek record chhodta hai.
    { key: { expiresAt: 1 }, name: 'expiresAt_ttl', expireAfterSeconds: 0 },
  ])
}

export async function down({ db }) {
  const drops = [
    ['users', 'email_unique'],
    ['users', 'role_createdAt'],
    ['roles', 'key_unique'],
    ['refreshTokens', 'jti_unique'],
    ['refreshTokens', 'familyId'],
    ['refreshTokens', 'userId_revokedAt'],
    ['refreshTokens', 'expiresAt_ttl'],
  ]

  for (const [collection, name] of drops) {
    // Index maujood na ho to ignore — down() idempotent rehna chahiye
    await db
      .collection(collection)
      .dropIndex(name)
      .catch(() => {})
  }
}
