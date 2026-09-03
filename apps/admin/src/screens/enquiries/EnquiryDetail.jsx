import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABEL } from '@cms/shared'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { ENQUIRY_BADGE, useEnquiry } from './useEnquiries.js'
import './Enquiries.css'

/**
 * Enquiry Detail — `admin-design-v2.html` ka `#s-enquiry-view` (client, 3 Sep).
 *
 * ## Sirf do cheezein — client ka faisla
 *
 * > _"inside enquiry detail there should be only status dropdown, i dont need quick actions,
 * > Activity & Notes, Send Quotation — just show Enquiry Details data"_
 *
 * | Design me | Yahan |
 * | --- | --- |
 * | Enquiry Details | ✅ |
 * | Manage | ✅ **sirf Status** — Priority · Assign · Follow-up ke field hi nahi hain |
 * | Activity & Notes | ❌ client ne hata diya (notes ka field bhi gaya — migration 019) |
 * | Send Quotation | ❌ SMTP Phase 0 se blocked, aur client ko chahiye bhi nahi |
 * | Quick Actions | ❌ client ne hata diya |
 *
 * ⚠️ Quick Actions (Call · WhatsApp · Email) SMTP pe ruke **nahi** the — wo teen link the aur
 * chalte the. Ye scope ka faisla hai, kisi rukawat ka nahi. Wapas chahiye to teen `<a>` hain.
 */

export default function EnquiryDetail() {
  const { id } = useParams()
  const { can } = useAuth()
  const { enquiry, columns, loading, error, reload } = useEnquiry(id)

  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState(null)

  /** Server ka status hi sach hai — load hone pe form usi se bharta hai. */
  useEffect(() => {
    if (enquiry) setStatus(enquiry.status)
  }, [enquiry])

  const canEdit = can('submission.update')

  async function save(patch) {
    setBusy(true)
    setSaveError(null)

    try {
      await api.patch(`/enquiries/${id}`, patch)
      reload()
    } catch (err) {
      setSaveError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="muted">Loading…</p>

  if (error) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
        <button className="btn btn-sm" type="button" onClick={reload}>
          Retry
        </button>
      </div>
    )
  }

  if (!enquiry) return null

  const at = (name) => {
    const column = columns?.[name]
    const value = column ? enquiry.values?.[column.key] : undefined

    return value === undefined || value === null || value === '' ? null : String(value)
  }

  /**
   * Derived khaane pehle, uske baad **baaki sab** jo `values` me hai.
   *
   * Ye doosra hissa hi wo guarantee hai ki **data kabhi chhupta nahi**: form badal jaaye,
   * ya koi field kisi derived column me na baithe, tab bhi wo yahan dikhega.
   */
  const derivedKeys = new Set(
    Object.values(columns ?? {})
      .filter(Boolean)
      .map((column) => column.key),
  )
  const extras = Object.entries(enquiry.values ?? {}).filter(([key]) => !derivedKeys.has(key))

  return (
    <>
      <div className="page-head">
        <h1>Enquiry</h1>
        <span className={`badge ${ENQUIRY_BADGE[enquiry.status] ?? 'b-draft'}`}>
          {ENQUIRY_STATUS_LABEL[enquiry.status] ?? enquiry.status}
        </span>
        <Link className="btn page-title-action" to="/enquiries">
          Back to list
        </Link>
      </div>

      {saveError && (
        <div className="notice err" role="alert">
          <span>{saveError}</span>
        </div>
      )}

      <div className="enq-grid">
        <div className="enq-main">
          <section className="panel">
            <div className="panel-head">
              <h2>Enquiry Details</h2>
              <span className="muted">{new Date(enquiry.createdAt).toLocaleString()}</span>
            </div>
            <div className="panel-body">
              <dl className="enq-fields">
                {[
                  ['Name', at('name')],
                  ['Email', at('email')],
                  ['Phone', at('phone')],
                  ['Package', at('package')],
                  ['Travel Date', at('travelDate')],
                  ['Travellers', at('pax')],
                  ['Budget', at('budget')],
                  ['Message', at('message')],
                ]
                  /** Jo bhara hi nahi, uski khaali line nahi — reference me bhi wo nahi hai. */
                  .filter(([, value]) => value !== null)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}

                {extras.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>

              <p className="enq-meta muted">
                Form: {enquiry.formName || '—'}
                {enquiry.sourcePath ? ` · Submitted from ${enquiry.sourcePath}` : ''}
              </p>
            </div>
          </section>
        </div>

        <aside className="enq-side">
          {canEdit && (
            <section className="panel">
              <div className="panel-head">
                <h2>Manage</h2>
              </div>
              <div className="panel-body">
                <label className="lbl" htmlFor="enq-status">
                  Status
                </label>
                <select
                  id="enq-status"
                  className="sel"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {ENQUIRY_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {ENQUIRY_STATUS_LABEL[value]}
                    </option>
                  ))}
                </select>

                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={busy || status === enquiry.status}
                  onClick={() => save({ status })}
                >
                  Save
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  )
}
