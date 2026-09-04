import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { errorMessage } from '../../lib/api.js'
import './BulkUpload.css'
import { startImport, useImportRuns } from './useBulkImports.js'

/**
 * Bulk Upload — sheet ka link do, package ban jaate hain (D-81).
 *
 * ## Client ne kya maanga tha
 *
 * 20+ itinerary packages Google Docs me likhe hue hain. Haath se daalne ka matlab hai har
 * package pe **38 khaane** bharna. Ab wo sheet ka URL paste karta hai aur package **ban kar
 * publish** ho jaate hain.
 *
 * ⚠️ **Preview ki screen jaan-boojh kar nahi hai.** Ek baar wo plan me thi; client ne hata di —
 * _"20 packages ka review thodi dekhega"_. Aur wo theek tha: preview ka asli kaam content
 * dekhna nahi, **galti pakadna** tha, aur wo import ke **baad** wale nateeje me utni hi achhi
 * tarah ho jaata hai.
 *
 * ⚠️ **Ye screen `admin-design-v2.html` me nahi hai** (client ne design ke baad maanga). Isliye
 * yahan koi nayi shakl nahi gadhi gayi — wahi `.panel` + `table.list` hai jo baaki screens pe
 * hai. Iska apna design chahiye ho to wo client se aayega (R15).
 */
export default function BulkUpload() {
  const navigate = useNavigate()
  const { runs, loading, error, reload } = useImportRuns()
  const [sheetUrl, setSheetUrl] = useState('')
  const [mode, setMode] = useState('new')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  async function onImport(event) {
    event.preventDefault()
    if (!sheetUrl.trim()) return

    setBusy(true)
    setActionError(null)

    try {
      const run = await startImport(sheetUrl.trim(), mode)
      /** Seedha nateeje pe — wahin progress dikhti hai. */
      navigate(`/bulk-upload/${run.id}`)
    } catch (err) {
      setActionError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Bulk Upload</h1>
      </div>
      <p className="subtitle">Import package pages from Google Docs listed in a Google Sheet.</p>

      {actionError && (
        <p className="notice err" role="alert">
          {actionError}
        </p>
      )}

      <div className="panel">
        <div className="panel-body">
          <form onSubmit={onImport}>
            <div className="field">
              <label htmlFor="sheetUrl">Google Sheet link</label>
              <input
                id="sheetUrl"
                className="inp"
                type="text"
                value={sheetUrl}
                disabled={busy}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                onChange={(e) => setSheetUrl(e.target.value)}
              />
              <p className="hint">
                The sheet needs a <b>Doc File</b> column with a link to each package document.
              </p>
            </div>

            {/*
              ⚠️ Ye **radio** hain, checkbox nahi — client ne "do checkbox" kaha tha par matlab
              ek chunav hai: sheet ya to naye package laa rahi hai ya purane update kar rahi
              hai. Do checkbox se "dono" aur "koi nahi" wali do aisi haalat ban jaati jinka koi
              matlab hi nahi hota.

              Ye ek **elaan** hai, filter nahi: jo row is baat se alag nikle wo Failed hoti hai.
              Bina iske ek purana URL galti se nayi sheet me reh jaaye to wo ek live package ko
              chup-chaap overwrite kar deta.
            */}
            <div className="field">
              <label>What is in this sheet?</label>
              <label className="inline-lbl">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'new'}
                  disabled={busy}
                  onChange={() => setMode('new')}
                />{' '}
                New packages
              </label>{' '}
              <label className="inline-lbl bu-mode">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'existing'}
                  disabled={busy}
                  onChange={() => setMode('existing')}
                />{' '}
                Existing packages
              </label>
              <p className="hint">
                {mode === 'new'
                  ? 'Any document whose Package URL already exists will be left as Failed, so nothing live is overwritten by mistake.'
                  : 'Any document whose Package URL does not exist yet will be left as Failed.'}
              </p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={busy || !sheetUrl.trim()}>
              {busy ? 'Reading sheet…' : 'Import'}
            </button>
          </form>

          {/*
            Sabse aam galti sharing ki hoti hai, aur uska failure sabse dhokebaaz hai: Google
            un-shared file pe error nahi, **200 ke saath sign-in ka page** bhejta hai. Isliye
            ye line pehle hi likhi hai, error message ka intezaar kiye bina.
          */}
          <p className="hint bu-note">
            The sheet and every document must be shared as <b>Anyone with the link — Viewer</b>.
            Packages are published automatically; any row with a problem is left as a draft with the
            reason shown.
          </p>
        </div>
      </div>

      <h2 className="bu-h2">Past imports</h2>

      {error && (
        <p className="notice err" role="alert">
          {error}{' '}
          <button type="button" className="btn btn-sm" onClick={reload}>
            Retry
          </button>
        </p>
      )}

      <table className="list">
        <thead>
          <tr>
            <th>When</th>
            <th>Sheet</th>
            <th className="nowrap">New</th>
            <th className="nowrap">Existing</th>
            <th className="nowrap">Published</th>
            <th className="nowrap">Draft</th>
            <th className="nowrap">Failed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={8} className="muted">
                Loading…
              </td>
            </tr>
          )}

          {!loading && runs.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
                No imports yet.
              </td>
            </tr>
          )}

          {runs.map((run) => (
            <tr key={run.id}>
              <td>
                <Link className="row-title" to={`/bulk-upload/${run.id}`}>
                  {new Date(run.createdAt).toLocaleString()}
                </Link>
              </td>
              <td className="bu-url">{run.sheetUrl}</td>
              <td>{run.counts.created}</td>
              <td>{run.counts.updated}</td>
              <td>{run.counts.published}</td>
              <td>{run.counts.draft}</td>
              <td>{run.counts.failed}</td>
              <td>
                <RunBadge status={run.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/** Run ki haalat — wahi badge classes jo list screens pe hain. */
export function RunBadge({ status }) {
  if (status === 'done') return <span className="badge b-pub">Done</span>
  if (status === 'failed') return <span className="badge b-close">Failed</span>

  return <span className="badge b-pend">Running</span>
}
