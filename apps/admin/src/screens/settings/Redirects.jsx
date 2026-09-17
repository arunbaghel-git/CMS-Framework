import { createRedirectSchema } from '@cms/shared'
import { useCallback, useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { confirmRemove } from '../../lib/confirm.js'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * `Settings ▸ 301 Redirects` — client, 17 Sep (D-97).
 *
 * Shuruaat `/packages/` ke 404 se hui: package ka URL `/packages/{slug}` hai, par `/packages` pe
 * koi page nahi. Client ne WordPress ke Redirection plugin jaisa screen maanga — koi bhi purana ya
 * khaali URL kisi aur page (ya bahar ke link) pe bhejna.
 *
 * Layout Hotels/Add Ons wala hi hai (`MasterListScreen`) — left me form, right me list. Design me
 * is screen ka koi reference nahi hai, aur naya layout banane se behtar wahi shape jo client pehle
 * se dekh raha hai.
 *
 * ⚠️ Auto wale redirect (slug badalne pe) bhi isi list me dikhte hain — `Automatic` badge ke saath.
 * Unhe edit karo to wo `Manual` ban jaate hain aur system unhe phir kabhi nahi badalta (D-97 §4).
 *
 * ⚠️ **Sirf From aur To** — Permanent/Temporary ka chunav client ne hataya (17 Sep: _"make it simple no
 * extra things"_). Har redirect `301` hai; screen ka naam bhi yahi kehta hai.
 */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'false', label: 'Manual' },
  { id: 'true', label: 'Automatic' },
]

const LIMIT = 20

const EMPTY_FORM = { from: '', to: '' }

export default function Redirects() {
  const { can } = useAuth()
  const canCreate = can('redirect.create')
  const canUpdate = can('redirect.update')
  const canDelete = can('redirect.delete')

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await api.get('/redirects', {
        params: {
          page,
          limit: LIMIT,
          ...(filter !== 'all' ? { isAuto: filter } : {}),
          ...(appliedSearch ? { q: appliedSearch } : {}),
        },
      })
      setItems(res.data.data.redirects)
      setMeta(res.data.meta)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [page, filter, appliedSearch])

  useEffect(() => {
    load()
  }, [load])

  const showForm = editingId ? canUpdate : canCreate
  const lastPage = meta ? Math.max(1, Math.ceil(meta.total / LIMIT)) : 1

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({ from: item.from, to: item.to })
    setError(null)
    setNotice(null)
  }

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    /** Wahi schema jo server chalata hai (R8) — `javascript:` ya bina `/` ka path yahin ruk jaata hai. */
    const parsed = createRedirectSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        await api.patch(`/redirects/${editingId}`, parsed.data)
        setNotice('Redirect updated.')
      } else {
        await api.post('/redirects', parsed.data)
        setNotice('Redirect added.')
      }

      resetForm()
      load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(item) {
    if (!confirmRemove(`the redirect from ${item.from}`)) return

    setError(null)
    setNotice(null)

    try {
      await api.delete(`/redirects/${item.id}`)
      setNotice('Redirect deleted.')
      if (editingId === item.id) resetForm()
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <SettingsTabs />

      <p className="subtitle">
        Send visitors from an old or missing URL to another page — or to a link on another site.
      </p>

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
        </div>
      )}

      <div className="edit-grid redirect-grid">
        {showForm && (
          <form className="panel" onSubmit={submit}>
            <div className="panel-head">
              <h2>{editingId ? 'Edit redirect' : 'Add redirect'}</h2>
            </div>
            <div className="panel-body">
              <div className="field">
                <label htmlFor="redirect-from">From</label>
                <input
                  id="redirect-from"
                  className="inp"
                  placeholder="/packages"
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  required
                />
                <div className="hint">
                  A path on this site, starting with <code>/</code>. A trailing slash and capital
                  letters don&rsquo;t matter.
                </div>
              </div>

              <div className="field">
                <label htmlFor="redirect-to">To</label>
                <input
                  id="redirect-to"
                  className="inp"
                  placeholder="/andaman-tour-packages"
                  value={form.to}
                  onChange={(e) => setForm({ ...form, to: e.target.value })}
                  required
                />
                <div className="hint">
                  A path on this site, or a full <code>https://</code> link to another site.
                </div>
              </div>

              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update' : 'Add redirect'}
              </button>
              {editingId && (
                <button className="btn btn-plain" type="button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <div>
          <ul className="subsubsub">
            {FILTERS.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={filter === id ? 'current' : ''}
                  onClick={(e) => {
                    e.preventDefault()
                    setFilter(id)
                    setPage(1)
                  }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          <div className="tablenav">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setAppliedSearch(search.trim())
                setPage(1)
              }}
            >
              <input
                className="inp"
                style={{ width: 200 }}
                placeholder="Search URL…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            <div className="spacer" />

            <div className="pagination">
              <span>{meta ? `${meta.total} items` : ''}</span>
              <a
                className="pg"
                href="#prev"
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) setPage(page - 1)
                }}
              >
                ‹
              </a>
              <a className="pg on">{page}</a>
              <a
                className="pg"
                href="#next"
                onClick={(e) => {
                  e.preventDefault()
                  if (page < lastPage) setPage(page + 1)
                }}
              >
                ›
              </a>
            </div>
          </div>

          <table className="list">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={2} className="muted">
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">
                    No redirects yet.
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="row-title">{item.from}</span>
                      {/* Sirf slug badalne se bane redirect pe — kahan se aaya, ye bina alag column ke dikhe */}
                      {item.isAuto && <span className="badge">Automatic</span>}
                      {(canUpdate || canDelete) && (
                        <div className="row-actions">
                          {canUpdate && (
                            <span>
                              <a
                                href="#edit"
                                onClick={(e) => {
                                  e.preventDefault()
                                  startEdit(item)
                                }}
                              >
                                Edit
                              </a>
                            </span>
                          )}
                          {canDelete && (
                            <span>
                              <a
                                className="del"
                                href="#delete"
                                onClick={(e) => {
                                  e.preventDefault()
                                  remove(item)
                                }}
                              >
                                Delete
                              </a>
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="muted redirect-to">{item.to}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
