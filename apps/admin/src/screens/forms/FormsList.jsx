import { FORM_PLACEMENT_LABEL } from '@cms/shared'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { confirmRemove } from '../../lib/confirm.js'
import { useForms } from './useForms.js'
import './Forms.css'

/**
 * Enquiry Forms — `admin-design-v2.html` ke `#s-enquiry-forms` se (client, 1 Sep).
 *
 * Design se **do jaan-boojh kar liye gaye farq**, dono client ke faisle se (R15):
 *
 * 1. **`Conv.` column nahi hai** — client ne 1 Sep ko saaf kaha ("i dont need Conv."). Wo
 *    conversion rate hai, aur uske liye ye jaanna padta ki kitne logon ne form **dekha**;
 *    wo aankda hamare paas hai hi nahi. Column rakh kar `—` dikhana wahi galti hoti jo
 *    `Enq.` pe thi (A-1).
 * 2. **`Submissions (30d)` bhi nahi hai** — ye D-30 hai: enquiries store to hoti hain, par
 *    30 din ka window aur uska rolling count ek report hai, aur wo screen (All Enquiries)
 *    abhi bani hi nahi. Jis din wo banegi, ye column uske saath aayega.
 *
 * `Shortcode` column **hai**, par uska matlab abhi seemit hai — dekho `FormBuilder.jsx`.
 */

const STATUS_BADGE = { active: 'b-pub', draft: 'b-draft' }
const STATUS_LABEL = { active: 'Active', draft: 'Draft' }

/** `2 days ago` — wahi helper jo Packages ki list pe hai. */
function timeAgo(iso) {
  if (!iso) return '—'
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  const steps = [
    [31536000, 'year'],
    [2592000, 'month'],
    [604800, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ]

  for (const [size, label] of steps) {
    const n = Math.floor(seconds / size)
    if (n >= 1) return `${n} ${label}${n > 1 ? 's' : ''} ago`
  }

  return 'just now'
}

export default function FormsList() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  /** Har delete ke baad list dobara aani chahiye — warna mitaayi hui row khadi rehti hai. */
  const [writes, setWrites] = useState(0)

  const tab = params.get('tab') ?? 'all'

  /**
   * `useMemo` zaroori hai, sajawat nahi: `useForms` ka `useCallback` `query` pe depend
   * karta hai, aur har render pe naya object banane se wo hook anant loop me chala jaata.
   */
  const query = useMemo(
    () => ({ ...(tab === 'all' ? {} : { status: tab }), writes }),
    [tab, writes],
  )

  const { data, counts, meta, loading, error: loadError } = useForms(query)

  const canCreate = can('form.create')
  const canDelete = can('form.delete')

  const TABS = [
    { id: 'all', label: 'All', count: counts?.all },
    { id: 'active', label: 'Active', count: counts?.active },
    { id: 'draft', label: 'Draft', count: counts?.draft },
  ]

  async function remove(form) {
    if (!confirmRemove(form.name)) return

    setError(null)
    setNotice(null)

    try {
      await api.delete(`/forms/${form.id}`)
      setNotice('Form deleted.')
      setWrites((n) => n + 1)
    } catch (err) {
      /**
       * Jis form pe enquiries hain wo delete nahi hota — service 422 deti hai aur uska
       * message hi client ko batata hai ki kya karna hai ("set it to Draft instead").
       */
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Enquiry Forms</h1>
        {canCreate && (
          <Link className="btn page-title-action" to="/enquiries/forms/new">
            Add New Form
          </Link>
        )}
      </div>

      <p className="subtitle">
        Every form that feeds the Enquiries inbox. Pick one on a form&rsquo;s{' '}
        <b>Where it appears</b> panel to show it on your package pages.
      </p>

      {(error || loadError) && (
        <div className="notice err" role="alert">
          <span>{error ?? loadError}</span>
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
                setParams(id === 'all' ? {} : { tab: id })
              }}
            >
              {label} {count != null && <span className="cnt">({count})</span>}
            </a>
          </li>
        ))}
      </ul>

      <table className="list">
        <thead>
          <tr>
            <th>Form</th>
            <th>Fields</th>
            <th>Placement</th>
            <th>Status</th>
            <th>Modified</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} className="muted">
                Loading…
              </td>
            </tr>
          )}

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No forms yet.
              </td>
            </tr>
          )}

          {!loading &&
            data.map((form) => (
              <tr key={form.id}>
                <td>
                  <Link className="row-title" to={`/enquiries/forms/${form.id}`}>
                    {form.name}
                  </Link>
                  {form.emailTo && <div className="muted">{form.emailTo}</div>}
                  <div className="row-actions">
                    <span>
                      <Link to={`/enquiries/forms/${form.id}`}>Edit</Link>
                    </span>
                    {canDelete && (
                      <span>
                        <a
                          className="del"
                          href="#delete"
                          onClick={(e) => (e.preventDefault(), remove(form))}
                        >
                          Delete
                        </a>
                      </span>
                    )}
                  </div>
                </td>
                {/* Sirf wahi fields jo form pe sach me dikhte hain — chhupaye hue nahi ginte */}
                <td>{(form.fields ?? []).filter((f) => f.show !== false).length}</td>
                <td className="muted">{FORM_PLACEMENT_LABEL[form.placement] ?? form.placement}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[form.status] ?? 'b-draft'}`}>
                    {STATUS_LABEL[form.status] ?? form.status}
                  </span>
                </td>
                <td className="muted nowrap">{timeAgo(form.updatedAt)}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <div className="tablenav">
        <span className="muted">
          {meta?.total ?? 0} {meta?.total === 1 ? 'item' : 'items'}
        </span>
      </div>
    </>
  )
}
