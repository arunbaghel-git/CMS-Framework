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
 * ## Design ke chaar panel me se do bane hain
 *
 * | Panel | Haalat |
 * | --- | --- |
 * | Enquiry Details | ✅ |
 * | Manage → sirf **Status** | ✅ (Priority · Assign · Follow-up ke field nahi hain) |
 * | Activity & Notes → sirf **Notes** | ✅ activity feed nahi — log Q-4 me deferred hai |
 * | Send Quotation | ❌ SMTP Phase 0 se blocked |
 *
 * Jo nahi bana uska **khaali dabba bhi nahi dikhta** (D-30): adhoora control dikhana client
 * ko ye batana hai ki wo kaam karta hai.
 *
 * ## Quick Actions bina SMTP ke chalte hain
 *
 * Call · WhatsApp · Email teenon **link** hain (`tel:` · `wa.me` · `mailto:`) — bhejne ka
 * kaam browser aur client ka apna app karta hai, hum nahi. Isiliye ye SMTP pe rukey hue
 * nahi hain. `Generate PDF Itinerary` nahi hai, wo poora naya kaam hai.
 */

/** `wa.me` sirf ank leta hai — `+91 98765 21430` waise bhejna link tod deta hai. */
const digits = (value) => String(value ?? '').replace(/\D/g, '')

export default function EnquiryDetail() {
  const { id } = useParams()
  const { can } = useAuth()
  const { enquiry, columns, loading, error, reload } = useEnquiry(id)

  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
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
      setNote('')
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

  const email = at('email')
  const phone = at('phone')

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
                  ['Email', email],
                  ['Phone', phone],
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

          <section className="panel">
            <div className="panel-head">
              <h2>Internal Notes</h2>
            </div>
            <div className="panel-body">
              {(enquiry.notes ?? []).length === 0 && <p className="muted">No notes yet.</p>}

              <ul className="enq-notes">
                {(enquiry.notes ?? []).map((entry) => (
                  <li key={entry.id}>
                    <p>{entry.text}</p>
                    <span className="muted">
                      {entry.by || 'Unknown'} · {new Date(entry.at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>

              {canEdit && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (note.trim()) save({ note: note.trim() })
                  }}
                >
                  <textarea
                    className="inp"
                    rows={3}
                    placeholder="Add an internal note…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <button className="btn" type="submit" disabled={busy || !note.trim()}>
                    Add Note
                  </button>
                </form>
              )}
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

          <section className="panel">
            <div className="panel-head">
              <h2>Quick Actions</h2>
            </div>
            <div className="panel-body enq-actions">
              {phone && (
                <a className="btn btn-plain" href={`tel:${digits(phone)}`}>
                  Call {phone}
                </a>
              )}
              {phone && (
                <a
                  className="btn btn-plain"
                  href={`https://wa.me/${digits(phone)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              )}
              {email && (
                <a className="btn btn-plain" href={`mailto:${email}`}>
                  Email
                </a>
              )}
              {!phone && !email && <p className="muted">No contact details in this enquiry.</p>}
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
