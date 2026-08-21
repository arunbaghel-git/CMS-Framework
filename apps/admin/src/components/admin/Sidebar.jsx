import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '../../lib/auth.jsx'
import { visibleNav } from '../../lib/nav.js'
import './Sidebar.css'

/**
 * Left navigation.
 *
 * Menu ka data yahan **nahi** hai — wo `lib/nav.js` me hai, kyunki route guard bhi
 * wahi padhta hai (D-37). Ye component sirf usse render karta hai.
 */
export default function Sidebar({ collapsed, onToggleCollapse }) {
  const location = useLocation()
  const { can } = useAuth()

  const menu = useMemo(() => visibleNav(can), [can])

  /** Is waqt jis page pe hain, wo kis group ka hai. */
  const currentGroupId =
    menu.find((item) => item.children?.some((child) => child.to === location.pathname))?.id ?? null

  /** Kaunsa group khula hai. Ek waqt me ek — design me bhi accordion hi hai. */
  const [openId, setOpenId] = useState(currentGroupId)

  /**
   * Jis group ka page khula hai wo group bhi khula rahe.
   *
   * Pehle Users ek flat link tha, to reload pe kuch dikkat nahi thi. Ab wo group ke
   * andar hai (D-37) — bina iske `/users` pe seedha aane wale ko sirf ek band accordion
   * dikhta, aur uske andar khada hai ye pata hi nahi chalta.
   */
  useEffect(() => {
    if (currentGroupId) setOpenId(currentGroupId)
  }, [currentGroupId])

  const isCurrent = (item) => {
    if (item.to) return item.to === '/' ? location.pathname === '/' : location.pathname === item.to
    return item.children?.some((c) => location.pathname === c.to)
  }

  return (
    <nav className="sidebar">
      <ul className="menu">
        {menu.map((item, index) => {
          if (item.separator) return <li className="menu-sep" key={`sep-${index}`} aria-hidden />

          const classes = [isCurrent(item) ? 'current' : '', openId === item.id ? 'open' : '']
            .filter(Boolean)
            .join(' ')

          if (!item.children) {
            return (
              <li className={classes} key={item.id}>
                <NavLink className="menu-link" to={item.to}>
                  <span className="ico">{item.icon}</span>
                  <span className="label">{item.label}</span>
                </NavLink>
              </li>
            )
          }

          return (
            <li className={classes} key={item.id}>
              <button
                className="menu-link"
                type="button"
                aria-expanded={openId === item.id}
                onClick={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
              >
                <span className="ico">{item.icon}</span>
                <span className="label">{item.label}</span>
                <span className="caret">▶</span>
              </button>

              <ul className="submenu">
                {item.children.map((child) => (
                  <li key={child.to}>
                    <NavLink to={child.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                      {child.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}

        <li className="menu-sep" aria-hidden />

        <li>
          <button className="menu-link" type="button" onClick={onToggleCollapse}>
            <span className="ico">{collapsed ? '▶' : '◀'}</span>
            <span className="label collapse-label">Collapse menu</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
