import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PERMISSION } from '@cms/shared'

import { api } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'

/** Kitni der me ginti dobara aaye — tab khula pada ho tab bhi nayi enquiry dikhe. */
const POLL_MS = 60_000

/**
 * Topbar ka ✉ — client, 24 Sep (A-53): _"only enquiry and cache"_.
 *
 * Badge = **`new`** status ki ginti — wahi jo inbox ke `New` tab pe hai, kyunki
 * `/api/enquiries/counts` wahi `enquiryCounts()` chalata hai. Click → **All Enquiries**
 * (client ne yahi kaha, `New` filter nahi).
 *
 * - `0` pe badge nahi — sirf ✉. Hamesha dikhta `0` bhi jaankari nahi, shor hai.
 * - Bina `submission.read` ke poora link hi nahi — warna wo 403 wali screen kholta.
 * - Ginti **route badalne pe** dobara aati hai (inbox me status badla → wapas aate hi
 *   badge theek) aur har minute; tab chhupa ho to poll chhodta hai.
 * - Call fail ho to badge chup-chaap gayab — ye ishaara hai, data nahi. Inbox apni
 *   galti khud dikhata hai.
 */
export default function EnquiryBadge() {
  const { can } = useAuth()
  const allowed = can(PERMISSION.SUBMISSION_READ)
  const { pathname } = useLocation()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!allowed) return undefined
    let alive = true

    function load() {
      if (document.hidden) return
      api
        .get('/enquiries/counts')
        .then((res) => alive && setCount(res.data.data.counts.new ?? 0))
        .catch(() => alive && setCount(0))
    }

    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [allowed, pathname])

  if (!allowed) return null

  const label = count === 1 ? '1 new enquiry' : `${count} new enquiries`

  return (
    <Link className="ab-item" to="/enquiries" title={label} aria-label={label}>
      ✉{count > 0 && <span className="ab-badge">{count > 99 ? '99+' : count}</span>}
    </Link>
  )
}
