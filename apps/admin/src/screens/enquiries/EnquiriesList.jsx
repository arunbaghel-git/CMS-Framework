import { ENQUIRY_STATUS_LABEL, ENQUIRY_TABS } from '@cms/shared'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ENQUIRY_BADGE, useEnquiries, useFormOptions } from './useEnquiries.js'
import './Enquiries.css'

/**
 * All Enquiries — `admin-design-v2.html` ka `#s-enquiries` (client, 3 Sep).
 *
 * Dhaancha `PackagesList.jsx` ka hi hai (tabs · bulk · search · pagination), jaan-boojh kar:
 * admin me do list screens do tarah se chalein, ye khud ek bug hai.
 *
 * ## Column form se aate hain, yahan likhe hue nahi
 *
 * Design ki table ke column fixed hain, par form **client khud banata hai**. Isliye har row
 * apne form ke `deriveEnquiryColumns()` se padhi jaati hai (server bhejta hai). Jis form me
 * wo field hai hi nahi, uski row me wo khaana khaali rehta hai — crash nahi.
 *
 * ## Design ka jo hissa yahan nahi hai
 *
 * `Assign to…`, agent ka filter, aur `Reply` — teenon ke peeche ya to field nahi hai ya
 * SMTP (Phase 0 se blocked). Khaali dabbe dikhane se behtar hai unka na hona (D-30).
 */

/** `Received` column — `timeAgo()` wahi jo PackagesList me hai. */
function timeAgo(value) {
  if (!value) return '—'
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.round(diff / 60000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`

  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`

  const days = Math.round(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`

  return new Date(value).toLocaleDateString()
}

export default function EnquiriesList() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const forms = useFormOptions()

  const [selected, setSelected] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)

  const tab = params.get('tab') ?? 'all'
  const page = Number(params.get('page') ?? 1)
  const formId = params.get('formId') ?? ''

  /** URL wala search jaata hai, input ka live text nahi — warna har keystroke pe ek call. */
  const appliedSearch = params.get('q') ?? ''
  const [search, setSearch] = useState(appliedSearch)

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      ...(tab !== 'all' ? { status: tab } : {}),
      ...(formId ? { formId } : {}),
      ...(appliedSearch ? { search: appliedSearch } : {}),
    }),
    [page, tab, formId, appliedSearch],
  )

  const { data, counts, meta, loading, error, reload } = useEnquiries(query)

  function setFilter(next) {
    const merged = { ...Object.fromEntries(params), ...next }
    // Filter badalne pe page 1 pe wapas — warna page 5 pe khaali list dikhti hai
    if (!('page' in next)) delete merged.page
    for (const [k, v] of Object.entries(merged)) if (!v) delete merged[k]

    setSelected([])
    setParams(merged)
  }

  function toggleRow(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const allSelected = data.length > 0 && selected.length === data.length

  async function applyBulk() {
    if (!bulkAction || selected.length === 0) return
    if (bulkAction === 'delete' && !window.confirm(`Delete ${selected.length} enquiry(s)?`)) return

    setBusy(true)
    setNotice(null)
    setActionError(null)

    try {
      const res = await api.post('/enquiries/bulk', { ids: selected, action: bulkAction })

      setNotice(`${res.data.data.modified} enquiry(s) updated.`)
      setSelected([])
      setBulkAction('')
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const TABS = [
    { id: 'all', label: 'All', count: counts?.all },
    ...ENQUIRY_TABS.map((status) => ({
      id: status,
      label: ENQUIRY_STATUS_LABEL[status],
      count: counts?.[status],
    })),
  ]

  const canEdit = can('submission.update')
  const canDelete = can('submission.delete')
  /** Checkbox ka column tabhi jab koi bulk kaam kar bhi sakta ho. */
  const showSelect = canEdit || canDelete
  const columnCount = showSelect ? 9 : 8

  /** Ek row ka khaana — us row ke apne form ke derived column se. */
  const cell = (row, name) => {
    const column = row.columns?.[name]
    const value = column ? row.values?.[column.key] : undefined

    return value === undefined || value === null || value === '' ? '—' : String(value)
  }

  return (
    <>
      <div className="page-head">
        <h1>Enquiries</h1>
        {can('form.read') && (
          <Link className="btn page-title-action" to="/enquiries/forms">
            Enquiry Forms
          </Link>
        )}
        {can('submission.export') && (
          <a
            className="btn page-title-action"
            href={`/api/enquiries/export${window.location.search}`}
          >
            Export CSV
          </a>
        )}
      </div>

      {(error || actionError) && (
        <div className="notice err" role="alert">
          <span>{error ?? actionError}</span>
          <button className="btn btn-sm" type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
        </div>
      )}

      <ul className="subsubsub">
        {TABS.map(({ id, label, count }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={tab === id ? 'current' : ''}
              onClick={(e) => {
                e.preventDefault()
                setFilter({ tab: id === 'all' ? '' : id })
              }}
            >
              {label} {count != null && <span className="cnt">({count})</span>}
            </a>
          </li>
        ))}
      </ul>

      <div className="tablenav">
        {showSelect && (
          <>
            <select
              className="sel"
              style={{ width: 'auto' }}
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              aria-label="Bulk actions"
            >
              <option value="">Bulk actions</option>
              {canEdit &&
                ENQUIRY_TABS.map((status) => (
                  <option key={status} value={status}>
                    Mark {ENQUIRY_STATUS_LABEL[status]}
                  </option>
                ))}
              {canDelete && <option value="delete">Delete</option>}
            </select>
            <button
              className="btn btn-plain"
              type="button"
              disabled={busy || !bulkAction || selected.length === 0}
              onClick={applyBulk}
            >
              Apply
            </button>
          </>
        )}

        <select
          className="sel"
          style={{ width: 'auto' }}
          value={formId}
          onChange={(e) => setFilter({ formId: e.target.value })}
          aria-label="Filter by form"
        >
          <option value="">All forms</option>
          {forms.map((form) => (
            <option key={form.id} value={form.id}>
              {form.name}
            </option>
          ))}
        </select>

        <div className="spacer" />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setFilter({ q: search })
          }}
        >
          <input
            className="inp"
            style={{ width: 200 }}
            placeholder="Search enquiries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="pagination">
          <span>{meta ? `${meta.total} items` : ''}</span>
          <a
            className="pg"
            href="#prev"
            onClick={(e) => {
              e.preventDefault()
              if (page > 1) setFilter({ page: String(page - 1) })
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
              if (meta && page * meta.limit < meta.total) setFilter({ page: String(page + 1) })
            }}
          >
            ›
          </a>
        </div>
      </div>

      <table className="list">
        <thead>
          <tr>
            {showSelect && (
              <th className="col-cb">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : data.map((row) => row.id))}
                  aria-label="Select all"
                />
              </th>
            )}
            <th>Contact</th>
            <th>Package</th>
            <th>Travel date</th>
            <th>Pax</th>
            <th>Budget</th>
            <th>Source</th>
            <th>Status</th>
            <th>Received</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columnCount} className="muted">
                Loading…
              </td>
            </tr>
          )}

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={columnCount} className="muted">
                No enquiries yet.
              </td>
            </tr>
          )}

          {data.map((row) => (
            <tr key={row.id}>
              {showSelect && (
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={() => toggleRow(row.id)}
                    aria-label={`Select enquiry from ${cell(row, 'name')}`}
                  />
                </td>
              )}
              <td>
                <Link className="row-title" to={`/enquiries/${row.id}`}>
                  {cell(row, 'name')}
                </Link>
                <div className="enq-sub">
                  {[cell(row, 'email'), cell(row, 'phone')].filter((v) => v !== '—').join(' · ')}
                </div>
              </td>
              <td>{cell(row, 'package')}</td>
              <td>{cell(row, 'travelDate')}</td>
              <td>{cell(row, 'pax')}</td>
              <td>{cell(row, 'budget')}</td>
              {/*
               * `Source` design me ek kism hai (Package page / WhatsApp / Phone), par hamare
               * paas sirf wo path hai jahan se form bhara gaya. Path hi dikhaya ja raha hai —
               * andaaze se kism gadhna client ko galat baat batana hota.
               */}
              <td className="enq-src">{row.sourcePath || '—'}</td>
              <td>
                <span className={`badge ${ENQUIRY_BADGE[row.status] ?? 'b-draft'}`}>
                  {ENQUIRY_STATUS_LABEL[row.status] ?? row.status}
                </span>
              </td>
              <td className="muted">{timeAgo(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
