import { describe, expect, it } from 'vitest'
import { PERMISSION } from '@cms/shared'

import { NAV, permissionForRoute, visibleNav } from './nav.js'

/**
 * Nav registry ke test.
 *
 * Ye "UI dikhta hai ya nahi" wali baat lagti hai par asal me **D-37 ka contract** hai:
 * kis role ko Users ke andar kya milta hai, aur kaunsa route kis permission ke peeche
 * hai. Ye galat hua to sidebar aur route guard alag-alag sach bolne lagte hain.
 */

/** `can` ka fake — asli wala `useAuth()` se aata hai. */
const canWith = (...permissions) => {
  const set = new Set(permissions)
  return (permission) => set.has(permission)
}

const ADMIN = canWith(PERMISSION.USER_READ, PERMISSION.USER_INVITE, PERMISSION.USER_UPDATE)
/** Editor ke paas koi `user.*` permission nahi hai — sirf apni profile. */
const EDITOR = canWith()

const usersGroup = (can) => visibleNav(can).find((item) => item.id === 'users')
const labels = (group) => group.children.map((c) => c.label)

describe('Users ka menu (D-37)', () => {
  it('administrator ko teenon item deta hai', () => {
    expect(labels(usersGroup(ADMIN))).toEqual(['All Users', 'Add User', 'Profile'])
  })

  it('baaki roles ko sirf Profile deta hai', () => {
    expect(labels(usersGroup(EDITOR))).toEqual(['Profile'])
  })

  /**
   * Group khud kabhi chhupna nahi chahiye — apni profile har role ki hai. Agar kabhi
   * `Profile` pe galti se koi permission lag gayi to poora Users group hi gayab ho
   * jaayega, aur editor ke paas apna password badalne ka koi raasta nahi bachega.
   */
  it('Users group har role ko dikhta hai', () => {
    expect(usersGroup(EDITOR)).toBeTruthy()
    expect(usersGroup(canWith())).toBeTruthy()
  })

  it('sirf All Users dikhta hai jab invite ki permission na ho', () => {
    expect(labels(usersGroup(canWith(PERMISSION.USER_READ)))).toEqual(['All Users', 'Profile'])
  })

  /**
   * Roles ka submenu jaan-boojh kar nahi hai — role builder Phase 7 ka kaam hai.
   * Ye test isliye hai ki wo galti se wapas na aa jaaye.
   */
  it('Roles ka koi submenu nahi hai', () => {
    const everything = JSON.stringify(NAV)
    expect(everything).not.toContain('/users/roles')
    expect(labels(usersGroup(ADMIN))).not.toContain('Roles')
  })
})

describe('route guards', () => {
  it('users ke routes permission ke peeche hain', () => {
    expect(permissionForRoute('/users')).toBe(PERMISSION.USER_READ)
    expect(permissionForRoute('/users/new')).toBe(PERMISSION.USER_INVITE)
    expect(permissionForRoute('/users/:id')).toBe(PERMISSION.USER_UPDATE)
    expect(permissionForRoute('/users/:id/delete')).toBe(PERMISSION.USER_DELETE)
  })

  /** Apni profile har logged-in user ki hai — iske peeche permission aani hi nahi chahiye. */
  it('/profile pe koi permission nahi', () => {
    expect(permissionForRoute('/profile')).toBeNull()
  })

  it('anjaan path pe null deta hai, undefined nahi', () => {
    expect(permissionForRoute('/kuch-bhi')).toBeNull()
  })

  /**
   * Sidebar ka har link kisi na kisi guard se mel khaana chahiye — ya to permission
   * wahi ho, ya route khula ho. Ulta hua to menu item dikhta hai aur click karne pe
   * "ye section aapke liye nahi hai" milta hai.
   */
  it('menu ke link aur route guard ek dusre se takraate nahi', () => {
    for (const item of visibleNav(ADMIN)) {
      for (const child of item.children ?? []) {
        const guard = permissionForRoute(child.to)
        if (guard) expect(child.permission).toBe(guard)
      }
    }
  })
})

describe('visibleNav', () => {
  it('separator kabhi shuru, aakhir ya jodi me nahi chhodta', () => {
    const items = visibleNav(ADMIN)

    expect(items.at(0).separator).toBeFalsy()
    expect(items.at(-1).separator).toBeFalsy()
    expect(items.some((item, i) => item.separator && items[i - 1]?.separator)).toBe(false)
  })

  it('NAV ko khud nahi badalta', () => {
    const before = JSON.stringify(NAV)
    visibleNav(EDITOR)
    expect(JSON.stringify(NAV)).toBe(before)
  })
})
