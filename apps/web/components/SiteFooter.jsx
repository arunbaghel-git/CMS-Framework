import { FOOTER_MENU_LOCATION_IDS } from '@cms/shared'

import { getMenu, getSettings } from '../lib/cms.js'

/**
 * Public footer — D-27, Slice 0.
 *
 * **Footer ke columns wahi generic menu system hain** (D-17/D-43) — koi alag data model
 * nahi. Har column ek theme location hai; unassigned location kuch render nahi karti.
 *
 * **Column ki heading `menus.name` se aati hai** — koi alag "column title" field nahi
 * hai. Admin menu ka naam badalta hai, footer ki heading badal jaati hai.
 *
 * Yahan **sirf** wahi hai jo approved scope me hai: menu columns, social links,
 * copyright. Office addresses / support blocks / certification text jaisi cheezein
 * client-specific content hain, framework ka footer nahi.
 */

/** Copyright me `{year}` theme replace karta hai — client ko har 1 January edit na karni pade. */
function withYear(text) {
  return (text ?? '').replaceAll('{year}', String(new Date().getFullYear()))
}

export default async function SiteFooter() {
  const [settings, ...columns] = await Promise.all([
    getSettings(),
    ...FOOTER_MENU_LOCATION_IDS.map((location) => getMenu(location)),
  ])

  const filled = columns.filter((c) => (c.items ?? []).length > 0)
  const social = Object.entries(settings?.social ?? {}).filter(([, url]) => url)
  const copyright = withYear(settings?.footerCopyright)

  return (
    <footer className="ft">
      <div className="wrap">
        {filled.length > 0 && (
          <div className="ft__g">
            {filled.map((column) => (
              <div key={column.location} className="ft__col">
                {column.menu?.name && <h2>{column.menu.name}</h2>}
                <ul>
                  {column.items.map((item) => (
                    <li key={item.id}>
                      <a href={item.href ?? '#'} target={item.target} className={item.className}>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {(social.length > 0 || copyright) && (
          <div className="ft__bottom">
            {copyright && <p className="ft__copy">{copyright}</p>}

            {social.length > 0 && (
              <ul className="ft__social">
                {social.map(([key, url]) => (
                  <li key={key}>
                    <a href={url} rel="noopener noreferrer" target="_blank">
                      {key[0].toUpperCase() + key.slice(1)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </footer>
  )
}
