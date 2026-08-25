import { HEADER_MENU_LOCATION_ID } from '@cms/shared'

import ButtonIcon from './ButtonIcon.jsx'
import { getMenu, getSettings } from '../lib/cms.js'
import MobileNav from './MobileNav.jsx'

/**
 * Public header — asli API data se (D-27, Slice 0).
 *
 * Server component hai: menu aur settings dono server pe fetch hote hain aur tag-based
 * cache me baithte hain (D-14). Client pe koi data fetch nahi jaata.
 *
 * **Desktop ka dropdown/mega pure CSS hover pe hai** — koi JS nahi. Sirf mobile drawer ek
 * client component hai, kyunki uska open/close state chahiye.
 */

/**
 * `menuType` **structured field** se render decide hota hai — `className` se kabhi nahi
 * (R18). `className` sirf `class` attribute me jaati hai.
 */
function TopLevelItem({ item }) {
  if (item.menuType === 'mega' && item.mega) return <MegaItem item={item} />
  if (item.menuType === 'dropdown') return <DropdownItem item={item} />

  return (
    <li className={`nav__i ${item.className}`.trim()}>
      <a className="nav__l" href={item.href ?? '#'} target={item.target}>
        {item.label}
      </a>
    </li>
  )
}

function Caret() {
  /**
   * SVG, CSS ka rotated box nahi.
   *
   * Pehle `border-right` + `border-bottom` wala square 45° ghumaya tha. Uska **layout
   * box** 7×7 rehta hai par dikhne wali "V" transform ke baad us box se bahar nikal jaati
   * hai — isliye flex ka `align-items: center` use text ke saath align nahi kar paata,
   * aur caret upar uth jaata hai. SVG me path viewBox ke beech me hota hai, to centering
   * apne aap sahi baithti hai.
   */
  return (
    <svg
      className="nav__caret"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function DropdownItem({ item }) {
  const children = item.children ?? []

  return (
    <li className={`nav__i nav__i--drop ${item.className}`.trim()}>
      <a className="nav__l" href={item.href ?? '#'} target={item.target}>
        {item.label}
        <Caret />
      </a>

      {children.length > 0 && (
        <ul className="drop">
          {children.map((child) => (
            <li key={child.id} className={child.className}>
              <a href={child.href ?? '#'} target={child.target}>
                {child.label}
              </a>

              {/* Grandchild — desktop pe right-side flyout (spec 006 Q-A) */}
              {(child.children ?? []).length > 0 && (
                <ul className="drop drop--fly">
                  {child.children.map((g) => (
                    <li key={g.id} className={g.className}>
                      <a href={g.href ?? '#'} target={g.target}>
                        {g.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function MegaItem({ item }) {
  const { layout, columnCount, className, columns, cta } = item.mega

  return (
    <li className={`nav__i nav__i--mega nav__i--${layout} ${item.className}`.trim()}>
      <a className="nav__l" href={item.href ?? '#'} target={item.target}>
        {item.label}
        <Caret />
      </a>

      {/*
        Width `layout` se, grid `columnCount` se — do alag properties (D-43).
        Column count inline custom property se jaata hai taaki theme ko 2..6 ke liye
        alag-alag class na likhni pade, aur 5 columns bhi bina CSS badle chalein.
      */}
      <div className={`mega mega--${layout} ${className}`.trim()}>
        <div className="mega__cols" style={{ '--mega-cols': columnCount }}>
          {columns.map((column, i) => (
            <div key={i} className={`mega__col ${column.className}`.trim()}>
              {column.groups.map((group, gi) => (
                <div key={gi} className={`mega__group ${group.className}`.trim()}>
                  {group.heading &&
                    (group.href ? (
                      <a className="mega__gl" href={group.href} target={group.target}>
                        {group.heading}
                      </a>
                    ) : (
                      <span className="mega__gl">{group.heading}</span>
                    ))}

                  {group.links.map((link) => (
                    <a
                      key={link.id}
                      className={link.className}
                      href={link.href ?? '#'}
                      target={link.target}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* CTA optional hai — har mega pe nahi hota (D-43) */}
          {cta && (
            <div className={`mega__cta ${cta.className}`.trim()}>
              <span>{cta.text}</span>
              <a className="btn" href={cta.buttonUrl}>
                {cta.buttonLabel}
              </a>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export default async function SiteHeader() {
  const [settings, menu] = await Promise.all([getSettings(), getMenu(HEADER_MENU_LOCATION_ID)])

  const items = menu.items ?? []

  return (
    <header className="hdr">
      <div className="wrap hdr__top">
        <a className="brand" href="/">
          {/*
           * ⚠️ Q-7 INTERIM — logo na mile to yahan **kuch nahi** render hota.
           *
           * D-42 §2 ek locked invariant hai: toota hua `<img>` kabhi nahi — na 404 wala
           * `src`, na khaali `src`. Public API logo resolve na hone pe `null` bhejti hai,
           * isliye yahan koi `<img>` banta hi nahi.
           *
           * **Uski jagah kya dikhe ye abhi tay nahi hai** — Q-7 client ka faisla hai
           * (R15), `09-OPEN-ITEMS.md` me khula pada hai. Jawab aane pe sirf ye ek branch
           * badlegi; menu ya settings ka data bilkul nahi.
           */}
          {settings?.logo ? (
            <img
              className="brand__img"
              src={settings.logo.url}
              alt={settings.logo.alt || settings.siteName || ''}
              width={settings.logo.width ?? undefined}
              height={settings.logo.height ?? undefined}
            />
          ) : null}
        </a>

        <nav className="nav" aria-label="Main">
          <ul className="nav__list">
            {items.map((item) => (
              <TopLevelItem key={item.id} item={item} />
            ))}
          </ul>
        </nav>

        {/*
         * Header ke buttons — D-27 ke scope me hain.
         *
         * Public API pehle hi chhaan kar bhejti hai: disabled aur adhoore button aate hi
         * nahi. Isliye yahan koi condition nahi — jo mila, wo render.
         *
         * Ye `<nav>` ke **bahar** hain, aur mobile pe nav chhupne par bhi dikhte rehte
         * hain — behaviour reference me bhi yahi hai (D-43, spec 006 §7).
         */}
        {(settings?.headerButtons ?? []).length > 0 && (
          <div className="hdr__actions">
            {settings.headerButtons.map((button, i) => (
              <a
                key={i}
                className={`btn btn--${button.variant} ${button.iconOnlyOnMobile ? 'btn--m-icon' : ''} ${button.className}`.trim()}
                href={button.url}
                target={button.target}
              >
                <ButtonIcon name={button.icon} />
                <span className="btn__label">{button.label}</span>
              </a>
            ))}
          </div>
        )}

        {/* Wahi items, wahi data — koi alag mobile menu nahi (D-43/D9) */}
        <MobileNav
          items={items}
          logo={settings?.logo}
          siteName={settings?.siteName}
          buttons={settings?.headerButtons ?? []}
          phone={settings?.phone}
        />
      </div>
    </header>
  )
}
