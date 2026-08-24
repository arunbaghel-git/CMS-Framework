import { describe, expect, it } from 'vitest'

import {
  blankGroup,
  itemTypeLabel,
  moveItem,
  removeAt,
  replaceAt,
  withColumnCount,
  withLayout,
  withMenuType,
} from './menu-tree.js'

/**
 * Editor ke tree helpers — spec 006 §6.4.
 *
 * Ye tests isliye hain ki editor aur server **ek hi rule** pe chalein. Jahan wo alag
 * hote hain wahan user ko galti Save dabaane par hi pata chalti hai — aur tab tak wo
 * kaafi kaam kar chuka hota hai.
 */

const megaItem = () => withMenuType({ label: 'X', link: {}, className: '' }, 'mega')

describe('withMenuType', () => {
  it('mega chunte hi columns[] columnCount ke barabar ban jaate hain', () => {
    const item = megaItem()

    expect(item.mega.columnCount).toBe(4)
    expect(item.mega.columns).toHaveLength(4)
  })

  it('dropdown chunte hi children[] ban jaata hai', () => {
    expect(withMenuType({ label: 'X' }, 'dropdown').children).toEqual([])
  })

  it('type badalne pe purana kaam nahi udta', () => {
    const dropdown = withMenuType({ label: 'X', children: [{ label: 'child' }] }, 'dropdown')
    const asMega = withMenuType(dropdown, 'mega')
    const backToDropdown = withMenuType(asMega, 'dropdown')

    expect(backToDropdown.children).toHaveLength(1)
  })
})

describe('withColumnCount', () => {
  it('columns[] ko count ke barabar rakhta hai — server ka hi rule (§2.2)', () => {
    const mega = withColumnCount(megaItem().mega, 6)

    expect(mega.columns).toHaveLength(6)
  })

  it('ghatane pe aakhri columns hat-te hain', () => {
    let mega = withColumnCount(megaItem().mega, 4)
    mega.columns[0].groups = [blankGroup()]
    mega = withColumnCount(mega, 2)

    expect(mega.columns).toHaveLength(2)
    expect(mega.columns[0].groups).toHaveLength(1)
  })
})

describe('withLayout', () => {
  it('wide se sm jaane pe column count valid range me aa jaata hai', () => {
    const wide = withColumnCount(megaItem().mega, 6)
    const small = withLayout(wide, 'sm')

    // `sm` pe sirf 2 columns valid hain — warna Save pe 400 milta
    expect(small.columnCount).toBe(2)
    expect(small.columns).toHaveLength(2)
  })

  it('valid count ho to wahi rehta hai', () => {
    const mega = withLayout(withColumnCount(megaItem().mega, 3), 'md')

    expect(mega.columnCount).toBe(3)
  })
})

describe('array helpers', () => {
  it('moveItem range se bahar kuch nahi karta', () => {
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
    expect(moveItem([1, 2, 3], 2, 3)).toEqual([1, 2, 3])
    expect(moveItem([1, 2, 3], 1, 1)).toEqual([1, 2, 3])
  })

  it('moveItem uthata hai aur nayi jagah rakhta hai — swap nahi karta', () => {
    // 'a' ko 0 se 3 pe le jaao: beech wale sab ek khaana peeche khisakne chahiye
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['b', 'c', 'd', 'a'])
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('moveItem original ko nahi chhoota', () => {
    const list = [1, 2, 3]

    expect(moveItem(list, 0, 2)).toEqual([2, 3, 1])
    expect(list).toEqual([1, 2, 3])
  })

  it('replaceAt aur removeAt original ko chhoote nahi', () => {
    const list = [1, 2, 3]

    expect(replaceAt(list, 1, 9)).toEqual([1, 9, 3])
    expect(removeAt(list, 1)).toEqual([1, 3])
    expect(list).toEqual([1, 2, 3])
  })
})

describe('itemTypeLabel', () => {
  it('design ki wording deta hai, internal naam kabhi nahi (R11)', () => {
    expect(itemTypeLabel({ menuType: 'link' })).toBe('Custom link')
    expect(itemTypeLabel({ menuType: 'mega' })).toBe('Mega menu')
    expect(itemTypeLabel({ menuType: 'dropdown', children: [1] })).toBe('Dropdown · 1 item')
    expect(itemTypeLabel({ menuType: 'dropdown', children: [1, 2] })).toBe('Dropdown · 2 items')
  })
})
