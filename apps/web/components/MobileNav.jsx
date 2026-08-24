'use client'

import { useEffect, useState } from 'react'

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

function GroupBlock({ group }) {
  return (
    <div className="mnav__group">
      {group.heading &&
        (group.href ? (
          <a className="mnav__gl" href={group.href} target={group.target}>
            {group.heading}
          </a>
        ) : (
          <span className="mnav__gl">{group.heading}</span>
        ))}

      {group.links.map((link) => (
        <a key={link.id} href={link.href ?? '#'} target={link.target} className={link.className}>
          {link.label}
        </a>
      ))}
    </div>
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
          CTA mobile pe us item ke section ke **bottom** pe (D-43/D10).
          Behaviour reference isko mobile me drop karta hai — ye jaan-boojh kar liya gaya
          divergence hai, "reference se match" ke naam pe hataana mat.
        */}
        {item.menuType === 'mega' && item.mega.cta && (
          <div className={`mnav__cta ${item.mega.cta.className}`.trim()}>
            <span>{item.mega.cta.text}</span>
            <a className="btn" href={item.mega.cta.buttonUrl}>
              {item.mega.cta.buttonLabel}
            </a>
          </div>
        )}
      </div>
    </details>
  )
}

export default function MobileNav({ items }) {
  const [open, setOpen] = useState(false)

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
      </div>
    </>
  )
}
