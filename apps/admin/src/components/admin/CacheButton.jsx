import { useEffect, useState } from 'react'
import { PERMISSION } from '@cms/shared'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'

/** Nateeja kitni der dikhe, phir wapas `⟳ Cache`. */
const RESULT_MS = 4000

/**
 * Topbar ka ⟳ Cache — client, 24 Sep (A-53): poori public site ka cache ek click me.
 *
 * Sirf `cache.flush` wale ko (admin · editor · author — jo publish kar sakte hain, taaki apna
 * badlaav live dekh sakein). Baaki ko button dikhta hi nahi.
 *
 * - `Clearing…` → `✓ Cache cleared`, ya saaf galti — **jhootha "Cleared" kabhi nahi** (server 502
 *   deta hai jab site na mile)
 * - Minute me doosri baar → server 429, yahan `Cleared a moment ago` — cache pehle hi saaf hai,
 *   to ye galti nahi, isliye laal nahi
 * - Poora message `title` me — topbar me lamba text jagah nahi paata
 */
export default function CacheButton() {
  const { can } = useAuth()
  const [state, setState] = useState({ kind: 'idle', message: '' })

  useEffect(() => {
    if (state.kind === 'idle' || state.kind === 'busy') return undefined
    const timer = setTimeout(() => setState({ kind: 'idle', message: '' }), RESULT_MS)
    return () => clearTimeout(timer)
  }, [state])

  if (!can(PERMISSION.CACHE_FLUSH)) return null

  async function handleClick() {
    setState({ kind: 'busy', message: '' })

    try {
      await api.post('/cache/flush')
      setState({ kind: 'done', message: 'The whole site will show the latest content.' })
    } catch (err) {
      const recent = err?.response?.data?.error?.code === 'CACHE_RECENTLY_CLEARED'
      setState({ kind: recent ? 'recent' : 'error', message: errorMessage(err) })
    }
  }

  const label = {
    idle: '⟳ Cache',
    busy: 'Clearing…',
    done: '✓ Cache cleared',
    recent: 'Cleared a moment ago',
    error: '⚠ Cache not cleared',
  }[state.kind]

  return (
    <button
      className={`ab-item${state.kind === 'error' ? ' ab-item--err' : ''}`}
      type="button"
      onClick={handleClick}
      disabled={state.kind === 'busy'}
      title={state.message || 'Clear the cache of the public site'}
      aria-live="polite"
    >
      {label}
    </button>
  )
}
