import { describe, expect, it } from 'vitest'

import {
  MEGA_COLUMN_COUNTS,
  MENU_TYPE,
  allowedColumnCounts,
  createMenuSchema,
  megaColumnWidth,
  menuItemSchema,
  toPublicMenu,
} from './menu.js'

/**
 * Menu contract ke tests — spec 006, D-43.
 *
 * Ye contract 15 live instances ke menu data ka shape tay karta hai, isliye har rule ka
 * apna test hai — khaas kar wo jo **chup-chaap** toot sakte hain (layout×columns,
 * className ka behaviour pe asar).
 */

const link = (url = '/x') => ({ type: 'url', url })

const column = (groups = []) => ({ groups })

const group = (heading, links = []) => ({
  heading,
  links: links.map((label) => ({ label, link: link(`/${label}`) })),
})

const mega = (overrides = {}) => ({
  label: 'Travel Guide',
  link: link('/travel'),
  menuType: MENU_TYPE.MEGA,
  mega: {
    layout: 'wide',
    columnCount: 2,
    columns: [column(), column()],
    ...overrides,
  },
})

describe('menu item — mixed types', () => {
  it('ek hi menu me link, dropdown aur mega teenon reh sakte hain', () => {
    const items = [
      { label: 'Home', link: link('/'), menuType: MENU_TYPE.LINK },
      {
        label: 'About',
        link: link('/about'),
        menuType: MENU_TYPE.DROPDOWN,
        children: [{ label: 'Team', link: link('/about/team') }],
      },
      mega(),
    ]

    const parsed = createMenuSchema.parse({ key: 'header', name: 'Header', items })

    expect(parsed.items.map((i) => i.menuType)).toEqual(['link', 'dropdown', 'mega'])
  })
})

describe('mega — columns aur groups', () => {
  it('ek column me kai groups reh sakte hain', () => {
    const parsed = menuItemSchema.parse(
      mega({
        columnCount: 2,
        columns: [
          column([group('Snorkeling', ['Elephant Beach']), group('Sea Walk', ['North Bay'])]),
          column([group('Jet Ski', ['Havelock'])]),
        ],
      }),
    )

    expect(parsed.mega.columns[0].groups).toHaveLength(2)
    expect(parsed.mega.columns[0].groups[0].links[0].label).toBe('Elephant Beach')
  })

  it('group ki heading clickable ho sakti hai', () => {
    const parsed = menuItemSchema.parse(
      mega({
        columnCount: 2,
        columns: [column([{ ...group('Ferry', ['Nautika']), link: link('/ferry') }]), column()],
      }),
    )

    expect(parsed.mega.columns[0].groups[0].link.url).toBe('/ferry')
  })

  it('bina heading ke clickable group reject hota hai', () => {
    const item = mega({
      columnCount: 2,
      columns: [column([{ heading: '', link: link('/x'), links: [] }]), column()],
    })

    expect(() => menuItemSchema.parse(item)).toThrow()
  })

  it('columns[] ki length columnCount se match honi chahiye', () => {
    expect(() => menuItemSchema.parse(mega({ columnCount: 4, columns: [column()] }))).toThrow()
  })
})

describe('mega — layout × columns compatibility (§2.2)', () => {
  it('har layout pe wahi counts allowed hain jo spec me hain', () => {
    expect(allowedColumnCounts('sm')).toEqual([2])
    expect(allowedColumnCounts('md')).toEqual([2, 3, 4])
    expect(allowedColumnCounts('full')).toEqual([2, 3, 4, 5, 6])
    expect(allowedColumnCounts('wide')).toEqual([2, 3, 4, 5, 6])
  })

  it('column ki width kabhi MIN_COLUMN_WIDTH se neeche allow nahi hoti', () => {
    for (const layout of ['sm', 'md', 'full', 'wide']) {
      for (const n of allowedColumnCounts(layout)) {
        expect(megaColumnWidth(layout, n)).toBeGreaterThanOrEqual(160)
      }
    }
  })

  it('sm pe 3 columns reject hote hain — hint nahi, error', () => {
    const item = mega({ layout: 'sm', columnCount: 3, columns: [column(), column(), column()] })

    expect(() => menuItemSchema.parse(item)).toThrow()
  })

  it('5 columns support hai, chahe behaviour reference me CSS na ho', () => {
    expect(MEGA_COLUMN_COUNTS).toContain(5)

    const item = mega({
      layout: 'wide',
      columnCount: 5,
      columns: Array.from({ length: 5 }, column),
    })

    expect(menuItemSchema.parse(item).mega.columnCount).toBe(5)
  })
})

describe('dropdown — depth', () => {
  const nest = (depth) => {
    let node = { label: `L${depth}`, link: link('/x') }
    for (let d = depth - 1; d >= 2; d--)
      node = { label: `L${d}`, link: link('/x'), children: [node] }
    return { label: 'Top', link: link('/'), menuType: MENU_TYPE.DROPDOWN, children: [node] }
  }

  it('grandchild tak allowed hai (depth 3)', () => {
    expect(() => menuItemSchema.parse(nest(3))).not.toThrow()
  })

  it('depth 4 reject hota hai', () => {
    expect(() => menuItemSchema.parse(nest(4))).toThrow()
  })
})

describe('link', () => {
  it('relative path, anchor aur absolute URL teenon valid hain', () => {
    for (const url of ['/about', '#contact', 'https://example.com', 'mailto:a@b.com']) {
      expect(() =>
        menuItemSchema.parse({ label: 'X', link: { type: 'url', url }, menuType: MENU_TYPE.LINK }),
      ).not.toThrow()
    }
  })

  it('aadha-adhoora URL reject hota hai', () => {
    expect(() =>
      menuItemSchema.parse({
        label: 'X',
        link: { type: 'url', url: 'example.com' },
        menuType: MENU_TYPE.LINK,
      }),
    ).toThrow()
  })

  it('entry aur taxonomy Slice 0 me abhi reject hote hain (D-30)', () => {
    expect(() =>
      menuItemSchema.parse({
        label: 'X',
        link: { type: 'entry', entryId: 'abc' },
        menuType: MENU_TYPE.LINK,
      }),
    ).toThrow()
  })
})

describe('className — R18', () => {
  it('className badalne se parse ka structure nahi badalta', () => {
    const base = mega({ columnCount: 2, columns: [column(), column()] })
    const styled = mega({
      className: 'mega-dark menu-6-columns mega-wide',
      columnCount: 2,
      columns: [column(), column()],
    })

    const a = menuItemSchema.parse(base)
    const b = menuItemSchema.parse({ ...styled, className: 'featured-link' })

    // className ke andar "6 columns" likha hai — phir bhi count structured field se hi aata hai
    expect(b.mega.columnCount).toBe(a.mega.columnCount)
    expect(b.mega.layout).toBe(a.mega.layout)
    expect(b.menuType).toBe(a.menuType)
  })

  it('markup todne wale characters reject hote hain', () => {
    expect(() =>
      menuItemSchema.parse({
        label: 'X',
        link: link(),
        className: '"><script>',
        menuType: MENU_TYPE.LINK,
      }),
    ).toThrow()
  })
})

describe('toPublicMenu', () => {
  const menu = {
    key: 'header',
    name: 'Header',
    version: 4,
    deletedAt: null,
    items: [
      menuItemSchema.parse({ label: 'Home', link: link('/'), menuType: MENU_TYPE.LINK }),
      menuItemSchema.parse(
        mega({
          columnCount: 2,
          columns: [column([group('Ferry', ['Nautika'])]), column()],
          cta: { text: 'Not sure?', buttonLabel: 'Talk to us', buttonUrl: '/contact' },
        }),
      ),
    ],
  }

  it('href server pe resolve hota hai — client ko entryId nahi milta (R10)', () => {
    const output = toPublicMenu(menu)

    expect(output.items[0].href).toBe('/')
    expect(output.items[0]).not.toHaveProperty('link')
  })

  it('version aur deletedAt public payload me nahi jaate', () => {
    const output = toPublicMenu(menu)

    expect(output).not.toHaveProperty('version')
    expect(output).not.toHaveProperty('deletedAt')
  })

  it('mega ka poora tree public shape me aata hai, CTA ke saath', () => {
    const { mega: out } = toPublicMenu(menu).items[1]

    expect(out.columnCount).toBe(2)
    expect(out.columns[0].groups[0].heading).toBe('Ferry')
    expect(out.columns[0].groups[0].links[0].href).toBe('/Nautika')
    expect(out.cta.buttonLabel).toBe('Talk to us')
  })

  it('CTA optional hai', () => {
    const noCta = toPublicMenu({ ...menu, items: [menu.items[0]] })

    expect(noCta.items[0].mega).toBeUndefined()
  })
})
