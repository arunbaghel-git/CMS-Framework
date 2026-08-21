import { NavLink } from 'react-router-dom'

import { SETTINGS_TABS } from '../../lib/nav.js'

/**
 * Settings ka tab bar — `admin-design.html` ke `#settingsTabs` se.
 *
 * Design me Settings ek hi screen hai jisme tabs se pane badalte hain. Hamare paas har
 * tab ka **apna route** hai (sidebar bhi wahi links dikhata hai), isliye ye tabs asli
 * link hain — `display:none` wale pane nahi. Dikhne me farq nahi padta; badle me back
 * button, refresh aur link share teenon kaam karte hain.
 *
 * Labels aur order `lib/nav.js` se aate hain — wahi ek jagah jo sidebar bhi padhta hai
 * (R16). Do jagah rakhne pe ek din tab bar aur sidebar alag cheezein kehne lagte.
 */
export default function SettingsTabs() {
  return (
    <nav className="tabs" aria-label="Settings sections">
      {SETTINGS_TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => (isActive ? 'on' : '')}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
