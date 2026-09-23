import { IMPORT_TARGET, IMPORT_TARGET_LABEL, IMPORT_TARGETS } from '@cms/shared'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
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
/**
 * Past imports ka filter (client, 11 Sep).
 *
 * ⚠️ **Upar wale "What are you importing?" se juda nahi hai**, aur wo jaan-boojh kar. Wo tay karta
 * hai ki **kya banega**; ye tay karta hai ki **kya dikhe**. Dono ek karne pe Posts import chunte hi
 * package ka itihaas chup-chaap chhup jaata.
 */
const RUN_TABS = [
  { key: '', label: 'All' },
  ...IMPORT_TARGETS.map((key) => ({ key, label: IMPORT_TARGET_LABEL[key].plural })),
]

export default function BulkUpload() {
  const navigate = useNavigate()
  const [shown, setShown] = useState('')
  /**
   * Past imports ka page (client, 14 Sep) — `All` me teeno type ke run jud kar aate hain (60 tak),
   * isliye 20-20 ke page. Tab badalne pe page 1 pe wapas, warna Pages ke page 3 pe khaali list.
   */
  const [runPage, setRunPage] = useState(1)
  const { runs, meta, loading, error, reload } = useImportRuns(shown, runPage)
  const hasNextRunPage = Boolean(meta && runPage * meta.limit < meta.total)
  const [sheetUrl, setSheetUrl] = useState('')
  const [mode, setMode] = useState('new')
  const [target, setTarget] = useState(IMPORT_TARGET.PACKAGE)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const sheetRef = useRef(null)
  const location = useLocation()

  /**
   * **Retry again** (client, 23 Sep, D-116: _"sheet url baar baar dalna na pade"_ · _"last state se
   * field bhar jaye"_) — pichhle import ka **sheet URL, type aur mode** upar ke form me bhar do.
   *
   * ⚠️ Import khud shuru **nahi** hota — form bhar kar Import button tak le jaata hai. Mode bhi usi run
   * ka aata hai: pehla run "New" tha aur uski Failed rows me kuch bana hi nahi (D-116), to agli koshish
   * bhi "New" hi honi chahiye. Client dekh kar badal sakta hai.
   *
   * Har run pe hai — Failed wale pe bhi aur Published wale pe bhi (client ne dono kaha).
   */
  function fillFrom(run) {
    setSheetUrl(run.sheetUrl ?? '')
    setTarget(run.target ?? IMPORT_TARGET.PACKAGE)
    setMode(run.mode ?? 'new')
    setActionError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    sheetRef.current?.focus({ preventScroll: true })
  }

  /** Import result ki screen se `Retry again` — wahi run `state` me aata hai. */
  useEffect(() => {
    const retry = location.state?.retry
    if (!retry) return

    fillFrom(retry)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state])

  const { can } = useAuth()

  /** Radio ke label aur API ke error message ek hi jagah se aate hain (`IMPORT_TARGET_LABEL`). */
  const words = IMPORT_TARGET_LABEL[target]

  /**
   * SEO wala target poori screen ko thoda alag chalata hai (D-107).
   *
   * ⚠️ `New / Existing` yahan **dikhta hi nahi**, aur wo ek faisla hai. Wo elaan is baat ka hai
   * ki sheet naye page laa rahi hai ya purane — par SEO Title se koi page banta hi nahi, yaani
   * dono ka jawab ek hi hota. Ek aisa chunav dikhana jiska koi asar na ho, client ko wahi
   * bharosa deta hai jo jhootha hota hai.
   */
  const isSeo = target === IMPORT_TARGET.SEO

  async function onImport(event) {
    event.preventDefault()
    if (!sheetUrl.trim()) return

    setBusy(true)
    setActionError(null)

    try {
      const run = await startImport(sheetUrl.trim(), mode, target)
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
        {/*
          Export seedha ek `<a>` hai, koi fetch + blob nahi — wahi jo `EnquiriesList` pe hai.
          Token cookie me hai, isliye browser ka apna download hi kaafi hai, aur file ka naam
          server ke `Content-Disposition` se aata hai.
        */}
        {can('tools.export') && (
          <a className="btn page-title-action" href="/api/bulk-imports/export/seo">
            Export SEO
          </a>
        )}
      </div>
      <p className="subtitle">Import pages from Google Docs listed in a Google Sheet.</p>

      {actionError && (
        <p className="notice err" role="alert">
          {actionError}
        </p>
      )}

      <div className="panel">
        <div className="panel-body">
          <form onSubmit={onImport}>
            {/*
              ⚠️ Ye dropdown hai, sidebar me doosra menu nahi — client ka faisla (10 Sep).
              D-81 pe unhone saaf kaha tha _"sidebar me menu banana hai not submenu"_, aur uske
              baad do top-level menu banana usi baat ke ulta jaata. Past imports ki list bhi ek
              hi rehti hai, `Type` ke column ke saath.
            */}
            <div className="field">
              <label htmlFor="target">What are you importing?</label>
              <select
                id="target"
                className="inp"
                value={target}
                disabled={busy}
                onChange={(e) => setTarget(e.target.value)}
              >
                {IMPORT_TARGETS.map((key) => (
                  <option key={key} value={key}>
                    {IMPORT_TARGET_LABEL[key].plural}
                  </option>
                ))}
              </select>
              <p className="hint">
                {isSeo
                  ? 'This does not create anything — it only updates the SEO Title and Meta Description of pages that already exist.'
                  : 'Each kind has its own document template — the labels inside the documents are different.'}
              </p>
            </div>

            <div className="field">
              <label htmlFor="sheetUrl">Google Sheet link</label>
              <input
                ref={sheetRef}
                id="sheetUrl"
                className="inp"
                type="text"
                value={sheetUrl}
                disabled={busy}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                onChange={(e) => setSheetUrl(e.target.value)}
              />
              <p className="hint">
                {isSeo ? (
                  <>
                    The sheet needs a <b>Page URL</b> column, and a <b>SEO Title</b> or{' '}
                    <b>Meta Description</b> column. Export the current SEO first — that file already
                    has the right columns.
                  </>
                ) : (
                  <>
                    The sheet needs a <b>Doc File</b> column with a link to each {words.one}{' '}
                    document.
                  </>
                )}
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
            {!isSeo && (
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
                  New {words.many}
                </label>{' '}
                <label className="inline-lbl bu-mode">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'existing'}
                    disabled={busy}
                    onChange={() => setMode('existing')}
                  />{' '}
                  Existing {words.many}
                </label>
                <p className="hint">
                  {mode === 'new'
                    ? `Any document whose address already exists will be left as Failed, so nothing live is overwritten by mistake.`
                    : `Any document whose address does not exist yet will be left as Failed.`}
                </p>
              </div>
            )}

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
            {isSeo ? (
              <>
                The sheet must be shared as <b>Anyone with the link — Viewer</b>. An empty cell
                leaves that field as it is, so a half-filled sheet never wipes anything. A row whose
                address is not found is left as Failed.
              </>
            ) : (
              <>
                The sheet and every document must be shared as <b>Anyone with the link — Viewer</b>.
                The {words.many} are published automatically. A row with a problem is marked Failed
                with the reason, and nothing is saved for it — fix the document, then use{' '}
                <b>Retry again</b>.
              </>
            )}
          </p>
        </div>
      </div>

      <h2 className="bu-h2">Past imports</h2>

      <ul className="subsubsub">
        {RUN_TABS.map(({ key, label }) => (
          <li key={key || 'all'}>
            <a
              href={`#${key || 'all'}`}
              className={shown === key ? 'current' : ''}
              onClick={(e) => {
                e.preventDefault()
                setShown(key)
                setRunPage(1)
              }}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>

      {error && (
        <p className="notice err" role="alert">
          {error}{' '}
          <button type="button" className="btn btn-sm" onClick={reload}>
            Retry
          </button>
        </p>
      )}

      {/* Wahi `.pagination` jo All Pages / Posts ki list pe hai — naya pattern nahi. */}
      <div className="tablenav">
        <div className="spacer" />
        <div className="pagination">
          <span>{meta ? `${meta.total} items` : ''}</span>
          <a
            className="pg"
            href="#prev"
            onClick={(e) => {
              e.preventDefault()
              if (runPage > 1) setRunPage(runPage - 1)
            }}
          >
            ‹
          </a>
          <a className="pg on">{runPage}</a>
          <a
            className="pg"
            href="#next"
            onClick={(e) => {
              e.preventDefault()
              if (hasNextRunPage) setRunPage(runPage + 1)
            }}
          >
            ›
          </a>
        </div>
      </div>

      <table className="list bu-runs">
        <thead>
          <tr>
            <th>When</th>
            <th className="nowrap">Type</th>
            <th>Sheet</th>
            <th className="nowrap">New</th>
            <th className="nowrap">Existing</th>
            <th className="nowrap">Published</th>
            <th className="nowrap">Failed</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={9} className="muted">
                Loading…
              </td>
            </tr>
          )}

          {!loading && runs.length === 0 && (
            <tr>
              <td colSpan={9} className="muted">
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
              <td className="nowrap">{IMPORT_TARGET_LABEL[run.target]?.plural ?? run.target}</td>
              <td className="bu-url">{run.sheetUrl}</td>
              <td>{run.counts.created}</td>
              <td>{run.counts.updated}</td>
              <td>{run.counts.published}</td>
              <td>
                <FailedCount run={run} />
              </td>
              <td>
                <RunBadge status={run.status} />
              </td>
              <td className="nowrap">
                <button type="button" className="btn btn-sm" onClick={() => fillFrom(run)}>
                  Retry
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/**
 * Failed ki ginti, aur hover pe uski wajah (client, 4 Sep).
 *
 * Pehle yahan sirf ek number tha. Wajah dekhne ke liye client ko har run kholna padta tha —
 * jabki aam sawaal ("kyun fail hua?") uske saamne hi hona chahiye.
 *
 * ⚠️ **Popup `<td>` ke andar `position: absolute` hai, aur wo jaan-boojh kar hai.** Ek asli
 * tooltip library ya portal ka matlab hota ek nayi dependency ya `document.body` me render — do
 * cheezein jo ek hover text ke liye bhaari hain. Uski keemat ye hai ki popup table ke andar hi
 * rehta hai, isliye CSS use **daayein se** khol kar upar rakhti hai taaki wo kate nahi.
 *
 * ⚠️ `title` yahan **nahi** hai. Dono saath hone pe browser apna tooltip bhi kholta hai aur wo
 * hamare popup ke upar baith jaata hai — do box, ek hi baat.
 */
function FailedCount({ run }) {
  const reasons = run.failedReasons ?? []

  if (!run.counts.failed || reasons.length === 0) return run.counts.failed

  return (
    <span className="bu-fail" tabIndex={0}>
      {run.counts.failed}
      <span className="bu-pop" role="tooltip">
        {reasons.map((reason) => (
          <span key={reason}>{reason}</span>
        ))}
      </span>
    </span>
  )
}

/** Run ki haalat — wahi badge classes jo list screens pe hain. */
export function RunBadge({ status }) {
  if (status === 'done') return <span className="badge b-pub">Done</span>
  if (status === 'failed') return <span className="badge b-close">Failed</span>

  return <span className="badge b-pend">Running</span>
}
