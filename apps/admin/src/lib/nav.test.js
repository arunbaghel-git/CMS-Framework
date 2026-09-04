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
   *
   * ⚠️ **Ye test pehle aadha andha tha.** Wo sirf `item.children` ghoomta tha, yaani
   * **top-level flat item** (jispe seedha `to` aur `permission` hoti hai) kabhi check hota
   * hi nahi tha. Aisa pehla item Bulk Upload hai; Media aur Reviews pe bhi wahi shakl hai.
   * Un teenon pe guard aur permission alag ho jaate to ye test khush rehta.
   *
   * Aur ye `visibleNav()` pe nahi, seedha `NAV` pe chalta hai: invariant registry ka hai,
   * kisi ek user ke view ka nahi. `visibleNav(ADMIN)` se chalane pe wahi item chhoot jaate
   * hain jinki permission us fake `can` me nahi hai — yaani jaanch wahin kamzor pad jaati
   * hai jahan sabse zaroori hai.
   */
  it('menu ke har link ka permission uske route guard se milta hai', () => {
    const links = NAV.flatMap((item) => item.children ?? (item.to ? [item] : []))

    expect(links.length).toBeGreaterThan(0)

    for (const link of links) {
      const guard = permissionForRoute(link.to)
      if (guard) expect(link.permission, link.to).toBe(guard)
    }
  })
})

/**
 * Bulk Upload — client ka faisla tha "sidebar me menu banana hai **not submenu**" (3 Sep).
 */
describe('Bulk Upload ka menu (D-81)', () => {
  const bulk = (can) => visibleNav(can).find((item) => item.id === 'bulkUpload')

  it('top-level item hai, kisi ka submenu nahi', () => {
    const item = bulk(canWith(PERMISSION.TOOLS_IMPORT))

    expect(item).toBeTruthy()
    expect(item.children).toBeUndefined()
    expect(item.to).toBe('/bulk-upload')
  })

  it('tools.import na ho to bilkul nahi dikhta', () => {
    expect(bulk(canWith())).toBeUndefined()
  })

  it('nateeje wali screen bhi usi permission ke peeche hai', () => {
    // Wahan client ke package ke naam, URL aur galtiyaan dikhti hain — wo khuli nahi ho sakti
    expect(permissionForRoute('/bulk-upload')).toBe(PERMISSION.TOOLS_IMPORT)
    expect(permissionForRoute('/bulk-upload/:id')).toBe(PERMISSION.TOOLS_IMPORT)
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
