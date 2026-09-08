import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import AppearanceTabs from './AppearanceTabs.jsx'
import { useSidebars } from './useSidebars.js'
import './Appearance.css'

/**
 * Appearance → Sidebar — D-88.
 *
 * Client named sidebars banata hai; har page apne edit screen se chunta hai ki **kis taraf**
 * aur **kaunsi**.
 *
 * ⚠️ **Design me is screen ka shape alag tha** (`admin-design-v3.html:682`): ek hi sidebar,
 * position isi screen pe, aur form ke liye "Kis page pe kaunsa form" wali niyam ki table.
 * Client ne uski jagah named sidebars chune — paanchon farak D-88 §1 me likhe hain.
 *
 * ⚠️ **Yahan "Used on N pages" ka column jaan-boojh kar nahi hai.** Wo har row pe ek alag
 * query maangta hai — theek wahi jo Tour list ke `Packages` column pe abhi adhoora pada hai.
 * Aur uski zaroorat bhi nahi: delete hamesha chalta hai (D-79 ka precedent), to wo ginti kisi
 * faisle ko rokti bhi nahi.
 */
export default function Sidebars() {
  const { can } = useAuth()
  const canEdit = can('sidebar.update')
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const { data: sidebars, loading, error: loadError, reload } = useSidebars({ q })

  /**
   * Naya sidebar seedha ban kar editor khul jaata hai — beech me koi "naam do" wala dialog
   * nahi. Ek naam to chahiye hi (server `min(1)` maangta hai), aur wo editor me badla ja sakta
   * hai. Wahi rasta jo `Add New Package` pe hai.
   */
  async function create() {
    setBusy(true)
    setError(null)

    try {
      const res = await api.post('/sidebars', { name: 'New sidebar', widgets: [] })
      navigate(`/appearance/sidebars/${res.data.data.sidebar.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  async function remove(sidebar) {
    /**
     * ⚠️ Confirmation me ye saaf likha hai ki pages ka kya hoga. Delete pe koi guard nahi hai
     * (D-79), isliye client ko keemat **pehle** dikhni chahiye — baad me wo sirf ek gayab hui
     * sidebar dekhta, aur uski wajah kahin likhi na hoti.
     */
    if (
      !window.confirm(
        `Delete “${sidebar.name}”? Pages using it will simply stop showing a sidebar.`,
      )
    ) {
      return
    }

    setBusy(true)
    setError(null)

    try {
      await api.delete(`/sidebars/${sidebar.id}`)
      await reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Appearance</h1>
        {canEdit && (
          <button className="btn btn-primary" type="button" onClick={create} disabled={busy}>
            ＋ Add New Sidebar
          </button>
        )}
      </div>
      <AppearanceTabs />

      {(error || loadError) && (
        <div className="notice err" role="alert">
          <span>{error ?? loadError}</span>
        </div>
      )}

      {!canEdit && (
        <div className="notice">
          <span>You can view sidebars, but not change them.</span>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Sidebars</h2>
        </div>

        <div className="panel-body">
          <div className="field" style={{ maxWidth: 320 }}>
            <input
              className="inp"
              type="search"
              placeholder="Search sidebars…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="subtitle">Loading…</p>
          ) : sidebars.length === 0 ? (
            /*
             * Khaali cheez khaali dikhe, tooti hui nahi (D-30). Aur khaali hone ki do wajah
             * alag likhi hain — search ka nateeja, aur sach me kuch na hona.
             */
            <p className="hint">
              {q
                ? 'No sidebars match that search.'
                : 'No sidebars yet. Create one, then choose it on a page.'}
            </p>
          ) : (
            <table className="list">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Widgets</th>
                  <th>Last updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sidebars.map((sidebar) => (
                  <tr key={sidebar.id}>
                    <td>
                      <Link to={`/appearance/sidebars/${sidebar.id}`}>
                        <b>{sidebar.name}</b>
                      </Link>
                    </td>
                    <td>{(sidebar.widgets ?? []).length}</td>
                    <td className="muted">
                      {sidebar.updatedAt ? new Date(sidebar.updatedAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {canEdit && (
                        <button
                          className="btn btn-sm"
                          type="button"
                          onClick={() => remove(sidebar)}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
