import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import './Sidebar.css'

/**
 * Left navigation — `admin-design.html` ke SIDEBAR section se.
 *
 * Menu **exactly wahi** hai jo design me hai (order, wording, icons, separators tak).
 * Design SPEC hai — kuch add/remove karna ho to client se aayega, yahan se nahi.
 *
 * Jo screens abhi bani nahi hain wo `ready: false` hain: link dikhta hai par
 * "abhi nahi bana" page pe le jaata hai. D-30 — **khaali cheez khaali dikhni chahiye,
 * tooti hui nahi.** Menu se hata dene se baad me poora nav dobara likhna padta.
 */
const MENU = [
  { id: 'dashboard', icon: '⌂', label: 'Dashboard', to: '/', ready: true },
  {
    id: 'posts',
    icon: '✎',
    label: 'Posts',
    children: [
      { label: 'All Posts', to: '/posts' },
      { label: 'Add New', to: '/posts/new' },
      { label: 'Categories', to: '/posts/categories' },
      { label: 'Tags', to: '/posts/tags' },
    ],
  },
  { id: 'media', icon: '▤', label: 'Media', to: '/media' },
  {
    id: 'pages',
    icon: '▭',
    label: 'Pages',
    children: [
      { label: 'All Pages', to: '/pages' },
      { label: 'Add New', to: '/pages/new' },
    ],
  },
  { separator: true },
  {
    id: 'packages',
    icon: '🧳',
    label: 'Packages',
    children: [
      { label: 'All Packages', to: '/packages' },
      { label: 'Add New', to: '/packages/new' },
      { label: 'Destinations', to: '/packages/destinations' },
      { label: 'Travel Themes', to: '/packages/themes' },
      { label: 'Departures & Pricing', to: '/packages/departures' },
    ],
  },
  {
    id: 'enquiries',
    icon: '✉',
    label: 'Enquiries',
    children: [
      { label: 'All Enquiries', to: '/enquiries' },
      { label: 'Enquiry Detail', to: '/enquiries/detail' },
      { label: 'Export CSV', to: '/enquiries/export' },
    ],
  },
  { separator: true },
  {
    id: 'appearance',
    icon: '🎨',
    label: 'Appearance',
    children: [
      { label: 'Menus', to: '/appearance/menus' },
      { label: 'Homepage Blocks', to: '/appearance/homepage' },
      { label: 'Banners & Sliders', to: '/appearance/banners' },
    ],
  },
  { id: 'users', icon: '👤', label: 'Users', to: '/users' },
  {
    id: 'settings',
    icon: '⚙',
    label: 'Settings',
    children: [
      { label: 'General', to: '/settings' },
      { label: 'SEO & Schema', to: '/settings/seo' },
      { label: 'Email / SMTP', to: '/settings/email' },
      { label: 'Integrations', to: '/settings/integrations' },
    ],
  },
]

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const location = useLocation()

  /** Kaunsa group khula hai. Ek waqt me ek — design me bhi accordion hi hai. */
  const [openId, setOpenId] = useState(null)

  const isCurrent = (item) => {
    if (item.to) return item.to === '/' ? location.pathname === '/' : location.pathname === item.to
    return item.children?.some((c) => location.pathname === c.to)
  }

  return (
    <nav className="sidebar">
      <ul className="menu">
        {MENU.map((item, index) => {
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
