import { NavLink } from 'react-router-dom'

import { APPEARANCE_TABS } from '../../lib/nav.js'

/**
 * Appearance ka tab bar — `admin-design.html` ke `#s-appearance > .tabs` se.
 *
 * `SettingsTabs` wali hi wajah: labels aur order `lib/nav.js` se aate hain, wahi ek
 * jagah jo sidebar bhi padhta hai (R16).
 *
 * Design me chaar tab hain (Menus · Homepage Blocks · Banners & Sliders · Footer); abhi
 * do dikhte hain — wajah `lib/nav.js` me likhi hai.
 */
export default function AppearanceTabs() {
  return (
    <nav className="tabs" aria-label="Appearance sections">
      {APPEARANCE_TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => (isActive ? 'on' : '')}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
