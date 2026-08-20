import { describe, it, expect } from 'vitest'

import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  roleSchema,
  toPublicUser,
  userSchema,
} from './user.js'

describe('emailSchema', () => {
  it('lowercase aur trim karta hai', () => {
    const parsed = loginSchema.parse({ email: '  ADMIN@Site.COM ', password: 'x' })
    expect(parsed.email).toBe('admin@site.com')
  })

  it('galat email reject karta hai', () => {
    expect(() => loginSchema.parse({ email: 'admin-at-site', password: 'x' })).toThrow()
  })
})

describe('loginSchema', () => {
  it('password pe lambai ka rule NAHI lagata', () => {
    // Policy badalne pe purane chhote password wale apne hi account se bahar na ho jaayein
    const parsed = loginSchema.parse({ email: 'a@b.com', password: 'short' })
    expect(parsed.password).toBe('short')
  })

  it('khaali password reject karta hai', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: '' })).toThrow()
  })

  it('rememberMe default false hai', () => {
    expect(loginSchema.parse({ email: 'a@b.com', password: 'x' }).rememberMe).toBe(false)
  })
})

describe('createUserSchema', () => {
  it('10 se chhota password reject karta hai', () => {
    const input = { name: 'A', email: 'a@b.com', role: 'admin', password: 'short123' }
    expect(() => createUserSchema.parse(input)).toThrow()
  })

  it('sahi input accept karta hai', () => {
    const parsed = createUserSchema.parse({
      name: 'Admin',
      email: 'A@B.com',
      role: 'admin',
      password: 'ek-lamba-passphrase',
    })
    expect(parsed.email).toBe('a@b.com')
  })

  it('role key camelCase na ho to reject', () => {
    const input = { name: 'A', email: 'a@b.com', role: 'Sales Agent', password: 'lamba-password' }
    expect(() => createUserSchema.parse(input)).toThrow()
  })
})

describe('changePasswordSchema', () => {
  it('naya password purane jaisa ho to reject', () => {
    const same = { currentPassword: 'wahi-purana-wala', newPassword: 'wahi-purana-wala' }
    expect(() => changePasswordSchema.parse(same)).toThrow()
  })

  it('alag password accept karta hai', () => {
    const ok = { currentPassword: 'purana-wala-pass', newPassword: 'naya-wala-password' }
    expect(changePasswordSchema.parse(ok).newPassword).toBe('naya-wala-password')
  })
})

describe('userSchema', () => {
  it('status default active hai', () => {
    const parsed = userSchema.parse({
      username: 'abc',
      name: 'A',
      email: 'a@b.com',
      role: 'editor',
    })
    expect(parsed.status).toBe('active')
    expect(parsed.mustChangePassword).toBe(false)
  })

  it('galat status reject karta hai', () => {
    const input = {
      username: 'abc',
      name: 'A',
      email: 'a@b.com',
      role: 'editor',
      status: 'deleted',
    }
    expect(() => userSchema.parse(input)).toThrow()
  })
})

describe('roleSchema', () => {
  it('unknown permission string reject karta hai', () => {
    const input = { key: 'editor', label: 'Editor', permissions: ['entry.blowUp'] }
    expect(() => roleSchema.parse(input)).toThrow()
  })

  it('asli permission accept karta hai', () => {
    const parsed = roleSchema.parse({
      key: 'editor',
      label: 'Editor',
      permissions: ['entry.publish'],
    })
    expect(parsed.isBuiltIn).toBe(false)
  })
})

describe('toPublicUser', () => {
  const doc = {
    _id: 'abc123',
    name: 'Admin',
    email: 'admin@site.com',
    role: 'admin',
    status: 'active',
    passwordHash: '$2a$12$secret-hash-should-never-leave-server',
    mustChangePassword: true,
  }

  it('passwordHash kabhi bahar nahi jaata', () => {
    const out = toPublicUser(doc)
    expect(out.passwordHash).toBeUndefined()
    expect(JSON.stringify(out)).not.toContain('secret-hash')
  })

  it('_id ko string id banata hai', () => {
    expect(toPublicUser(doc).id).toBe('abc123')
  })

  it('permissions tabhi jodta hai jab di gayi hon', () => {
    expect(toPublicUser(doc).permissions).toBeUndefined()
    expect(toPublicUser(doc, ['entry.read']).permissions).toEqual(['entry.read'])
  })

  it('null pe null deta hai', () => {
    expect(toPublicUser(null)).toBeNull()
  })
})
