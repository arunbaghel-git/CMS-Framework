import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../lib/auth.jsx'
import CacheButton from './CacheButton.jsx'
import EnquiryBadge from './EnquiryBadge.jsx'
import './AdminBar.css'

/** Naam se do-akshar ka avatar — "Aditya Kumar" → "AK". */
function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

/**
 * Upar wali patti — `admin-design.html` ke ADMIN BAR section se.
 *
 * Design me site ka naam "✈ Wanderly" hai (client ka data). Yahan wo Settings se
 * aayega (Phase 1) — tab tak generic "CMS" dikhta hai (D-30: connection point abhi).
 */
export default function AdminBar({ siteName = 'CMS' }) {
  const { user, logout } = useAuth()
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    setBusy(true)
    await logout()
  }

  return (
    <header className="adminbar">
      <Link className="ab-item ab-brand" to="/">
        {siteName}
      </Link>

      {/* Public site abhi khadi nahi hui — link Slice 0 me chalu hoga */}
      <a className="ab-item" href="/" title="View site">
        ⌂ Visit Site
      </a>

      <div className="spacer" />

      <EnquiryBadge />
      <CacheButton />

      <span className="ab-item">
        <span className="ab-avatar">{initials(user?.name)}</span>
        Howdy, {user?.name?.split(' ')[0] ?? 'there'}
      </span>

      <button className="ab-item" type="button" onClick={handleLogout} disabled={busy}>
        {busy ? 'Signing out…' : 'Log Out'}
      </button>
    </header>
  )
}
