'use client'

import { useEffect, useState } from 'react'

import { telHref } from '../lib/linkify.js'
import Icon from './Icon.jsx'

/**
 * Mobile drawer — **wahi menu data jo desktop use karta hai** (D-43/D9).
 *
 * Koi alag mobile menu nahi hai aur na hi koi DOM clone. Client ka behaviour reference
 * runtime pe desktop DOM copy karta hai (uska comment: _"cloned from the desktop nav so
 * the two never drift"_) — hamare paas structured payload hai, isliye dono usi ek array
 * se bante hain. Drift ka koi raasta hi nahi bachta.
 *
 * Flattening ka rule (spec 006 §5.2):
 *   link      → flat link
 *   dropdown  → accordion, grandchild nested accordion
 *   mega      → accordion; **columns flatten**, groups apne order me
 *
 * Columns isliye bina kisi extra rule ke flatten ho jaate hain ki column ek **pure layout
 * wrapper** hai — usme content nahi hota, sirf groups hote hain.
 */

/**
 * Mega ka ek group — mobile pe apna **accordion**.
 *
 * Desktop pe columns saath-saath dikhte hain, to sab kuch ek nazar me aa jaata hai. Mobile
 * pe sab ek dusre ke neeche aata hai: "Packages" akela 23 links khol deta tha aur drawer
 * scroll karte-karte khatam nahi hota tha. Isliye har group band milta hai.
 *
 * Bina heading wala group flat rehta hai — click karne ko kuch hai hi nahi.
 *
 * **Clickable heading ka handling:** summary poori row hai aur wo toggle karti hai (mobile
 * pe chhota caret bahut patla tap target hota). Isliye heading ka link **andar pehli entry**
 * ban jaata hai — kuch khota nahi, aur "kya hoga" ka koi bharam nahi rehta.
 */
function GroupBlock({ group }) {
  if (!group.heading) {
    return (
      <div className="mnav__group">
        {group.links.map((link) => (
          <a key={link.id} href={link.href ?? '#'} target={link.target} className={link.className}>
            {link.label}
          </a>
        ))}
      </div>
    )
  }

  return (
    <details className="mnav__acc mnav__acc--sub">
      <summary>{group.heading}</summary>
      <div className="mnav__sub">
        {group.href && (
          <a href={group.href} target={group.target}>
            {group.heading}
          </a>
        )}
        {group.links.map((link) => (
          <a key={link.id} href={link.href ?? '#'} target={link.target} className={link.className}>
            {link.label}
          </a>
        ))}
      </div>
    </details>
  )
}

function Item({ item }) {
  if (item.menuType === 'link') {
    return (
      <a className={`mnav__flat ${item.className}`.trim()} href={item.href ?? '#'}>
        {item.label}
      </a>
    )
  }

  return (
    <details className={`mnav__acc ${item.className}`.trim()}>
      <summary>{item.label}</summary>

      <div className="mnav__sub">
        {item.menuType === 'dropdown' &&
          (item.children ?? []).map((child) =>
            (child.children ?? []).length > 0 ? (
              <details key={child.id} className="mnav__acc mnav__acc--sub">
                <summary>{child.label}</summary>
                <div className="mnav__sub">
                  {child.children.map((g) => (
                    <a key={g.id} href={g.href ?? '#'} target={g.target}>
                      {g.label}
                    </a>
                  ))}
                </div>
              </details>
            ) : (
              <a key={child.id} href={child.href ?? '#'} target={child.target}>
                {child.label}
              </a>
            ),
          )}

        {item.menuType === 'mega' &&
          item.mega.columns.flatMap((col, ci) =>
            col.groups.map((group, gi) => <GroupBlock key={`${ci}-${gi}`} group={group} />),
          )}

        {/*
          **Mega ka CTA mobile pe nahi dikhta** — D10 revised, 25 Aug.
          Behaviour reference bhi yahi karta hai (`:not(.mega__cta)`).

          Pehle D10 me ulta tay hua tha: CTA drawer me bhi dikhega. Us waqt wo theek tha,
          kyunki drawer me CTA ka koi doosra thikana nahi tha. Ab drawer ke **bottom me
          header ke CTA buttons** hain — to har mega ka apna CTA usi ke upar dohra pad
          jaata, aur lambe accordion ke aakhir me dab bhi jaata.

          Desktop pe CTA jaisa tha waisa hai (`SiteHeader.jsx`) — wahan columns ke neeche
          full-width row banti hai aur wo dikhti bhi hai.
        */}
      </div>
    </details>
  )
}

/**
 * @param {object} props
 * @param {any} [props.logo] Drawer ka logo — `settings.footerLogo` se aata hai (D-44),
 *   jo footer ka apna logo hai aur na ho to header wale pe fallback kar chuka hota hai.
 */
export default function MobileNav({ items, logo, siteName, buttons = [], phone }) {
  const [open, setOpen] = useState(false)
  /** Icon-only buttons header bar me hi rehte hain — wajah drawer ke footer pe likhi hai. */
  const drawerButtons = buttons.filter((b) => !b.iconOnlyOnMobile)

  /** Drawer khula ho to page scroll band — warna peeche ka page drawer ke neeche khisakta hai. */
  useEffect(() => {
    document.body.classList.toggle('noscroll', open)
    return () => document.body.classList.remove('noscroll')
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)

    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        className="burger"
        aria-expanded={open}
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">☰</span>
      </button>

      {open && <div className="mscrim" onClick={() => setOpen(false)} />}

      <div className={`mdrawer${open ? ' on' : ''}`} aria-hidden={!open}>
        <div className="mdrawer__head">
          {/* Wahi Q-7 INTERIM — logo na mile to kuch render nahi hota (D-42 §2) */}
          {logo ? (
            <a href="/">
              <img className="mdrawer__logo" src={logo.url} alt={logo.alt || siteName || ''} />
            </a>
          ) : (
            <span />
          )}

          <button
            type="button"
            className="burger"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Link pe click hote hi drawer raaste se hat jaaye */}
        <nav className="mnav" onClick={(e) => e.target.closest('a') && setOpen(false)}>
          {items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </nav>

        {/*
          CTA drawer ke **bottom** me, full width — client ke design me yahi hai.

          **"Icon only on mobile" wale yahan nahi aate.** Design me bhi Awards (icon-only)
          drawer me nahi hai, sirf "Get quote" hai — aur uske peeche tark saaf hai: icon-only
          ka matlab hi hai "ye chhota rehna chahiye". Wo header bar me pehle se maujood hai;
          use drawer me ek poori-chaudai wali row dena uske apne hi faisle ke khilaf hai.

          Isliye koi naya field nahi chahiye — jo field pehle se hai wahi ye bhi bata deta hai.
        */}
        {(drawerButtons.length > 0 || phone) && (
          <div className="mdrawer__foot" onClick={() => setOpen(false)}>
            {drawerButtons.map((button, i) => (
              <a
                key={i}
                className={`btn btn--${button.variant} ${button.className}`.trim()}
                href={button.url}
                target={button.target}
              >
                <Icon name={button.icon} className="btn__icon" size={15} />
                {button.label}
              </a>
            ))}

            {/*
              Call button — number `settings.phone` se aata hai (Settings ▸ General ▸
              Contact & Social). Yahan koi naya field nahi banaya: phone pehle se maujood
              hai aur public payload me bhi jaata hai, to uske liye ek aur header button
              banwana client se wahi cheez do baar bharwana hota.

              Sirf drawer me hai — header bar me itni jagah nahi bachti, aur phone pe
              tap-to-call ka asli matlab wahin hai.
            */}
            {phone && (
              <a className="btn btn--outline" href={telHref(phone)}>
                <Icon name="phone" className="btn__icon" size={15} />
                Call {phone}
              </a>
            )}
          </div>
        )}
      </div>
    </>
  )
}
