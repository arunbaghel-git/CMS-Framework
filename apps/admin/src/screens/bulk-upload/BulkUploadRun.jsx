import { IMPORT_ROW_STATUS, IMPORT_TARGET, IMPORT_TARGET_LABEL } from '@cms/shared'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { RunBadge } from './BulkUpload.jsx'
import './BulkUpload.css'
import { useImportRun } from './useBulkImports.js'

/**
 * Ek import ka nateeja (D-81).
 *
 * Client ne sheet me wapas likhne se mana kar diya tha — _"mat likho wapas uspe, apne admin me
 * hi status show karte jao"_. Ye wahi screen hai.
 *
 * Ek faayda sheet se zyada mila: ye record **rehta** hai. Screen band karke wapas aao to bhi
 * list bani rehti hai, aur har package ka URL seedha clickable hota hai.
 */

/**
 * ⚠️ **Draft ka tab nahi** (client, 23 Sep, D-116) — import me ab sirf Published ya Failed hota hai.
 * 23 Sep se pehle ke run ki Draft rows `All` me apne badge ke saath dikhti rehti hain.
 */
const TABS = [
  { key: 'all', label: 'All' },
  { key: IMPORT_ROW_STATUS.PUBLISHED, label: 'Published' },
  { key: IMPORT_ROW_STATUS.FAILED, label: 'Failed' },
]

export default function BulkUploadRun() {
  const { id } = useParams()
  const { run, loading, error } = useImportRun(id)
  const [tab, setTab] = useState('all')
  const navigate = useNavigate()

  if (loading && !run) return <p className="subtitle">Loading…</p>

  if (error && !run) {
    return (
      <p className="notice err" role="alert">
        {error}
      </p>
    )
  }

  const rows = run.rows.filter((row) => tab === 'all' || row.status === tab)
  const running = run.status === 'queued' || run.status === 'running'

  /**
   * Table ka pehla column — "Package" ya "Blog posts".
   *
   * ⚠️ Purane run me `target` hai hi nahi (wo is field se pehle bane the), isliye fallback
   * `Packages` hai — us waqt import package ka hi hota tha.
   */
  /**
   * ⚠️ SEO wale run me column me **page** hote hain, "Meta upload" nahi (D-107). Baaki teen
   * target me pehla column wahi cheez hai jo ban rahi hai; yahan kuch banta hi nahi.
   */
  const title =
    run.target === IMPORT_TARGET.SEO
      ? 'Page'
      : (IMPORT_TARGET_LABEL[run.target] ?? IMPORT_TARGET_LABEL.package).plural
  const done = run.counts.total - run.counts.pending

  return (
    <>
      <div className="page-head">
        <h1>Import result</h1>
        <Link className="btn page-title-action" to="/bulk-upload">
          Back to Bulk Upload
        </Link>
        {/*
          Retry again — Bulk Upload ka form isi run ke sheet URL, type aur mode se bhar jaata hai
          (D-116). Chalta hua run dobara nahi bhara jaata — wo abhi khatam hi nahi hua.
        */}
        {!running && (
          <button
            type="button"
            className="btn page-title-action"
            onClick={() =>
              navigate('/bulk-upload', {
                state: { retry: { sheetUrl: run.sheetUrl, target: run.target, mode: run.mode } },
              })
            }
          >
            Retry again
          </button>
        )}
      </div>
      <p className="subtitle">
        {new Date(run.createdAt).toLocaleString()} · <RunBadge status={run.status} />
      </p>

      {/*
        Progress ek **ginti wali line** hai, koi bar ya spinner nahi.
        Is codebase me koi spinner hai hi nahi — sirf `Loading…` aur `disabled={busy}`. Ek naya
        component gadhna R15 ke against jaata; wo tab banega jab client maange.
      */}
      {running && (
        <p className="notice" role="status">
          Importing {done} of {run.counts.total}… this page updates on its own.
        </p>
      )}

      {run.warnings.map((warning) => (
        <p className="notice warn" key={warning}>
          {warning}
        </p>
      ))}

      <ul className="subsubsub">
        {TABS.map(({ key, label }) => (
          <li key={key}>
            <a
              href={`#${key}`}
              className={tab === key ? 'current' : ''}
              onClick={(e) => {
                e.preventDefault()
                setTab(key)
              }}
            >
              {label} <span className="cnt">({countFor(run, key)})</span>
            </a>
          </li>
        ))}
      </ul>

      <table className="list">
        <thead>
          <tr>
            <th>{title}</th>
            <th>Status</th>
            <th>What&rsquo;s missing</th>
            <th>Page</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                Nothing here.
              </td>
            </tr>
          )}

          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.title ? (
                  <span className="row-title">{row.title}</span>
                ) : (
                  <span className="muted">—</span>
                )}
                {/*
                  ⚠️ SEO wale run me koi doc hota hi nahi (D-107), aur khaali `href` **sabse
                  bura** roop leta hai: browser use "yahi page" samajh kar link ko chalne deta
                  hai, yaani client "Open document" daba kar wahin ka wahin reh jaata aur samajhta
                  ki kuch toot gaya.
                */}
                {row.docUrl && (
                  <div className="row-actions">
                    <span>
                      <a href={row.docUrl} target="_blank" rel="noreferrer">
                        Open document
                      </a>
                    </span>
                  </div>
                )}
              </td>

              <td className="nowrap">
                <RowBadge row={row} />
              </td>

              <td>
                <Issues row={row} />
              </td>

              <td className="nowrap">
                {row.url ? (
                  /* href poora URL hai (public site ka origin), text chhota path — admin :5173 pe hai */
                  <a href={row.url} target="_blank" rel="noreferrer">
                    {row.path}
                  </a>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

const countFor = (run, key) =>
  key === 'all' ? run.rows.length : run.rows.filter((row) => row.status === key).length

function RowBadge({ row }) {
  /**
   * Failed/Skipped pe hover karne se wajah dikhti hai (client, 4 Sep).
   *
   * Wajah `What's missing` column me poori likhi hui hai bhi — `title` uske alawa hai, uski
   * jagah nahi. Client ne badge pe hover maanga tha, aur ek chhoti table me aankh pehle badge
   * pe hi padti hai.
   */
  const why = row.error ?? undefined

  if (row.status === IMPORT_ROW_STATUS.PUBLISHED) {
    return <span className="badge b-pub">Published</span>
  }
  if (row.status === IMPORT_ROW_STATUS.DRAFT) return <span className="badge b-draft">Draft</span>
  if (row.status === IMPORT_ROW_STATUS.FAILED) {
    return (
      <span className="badge b-close" title={why}>
        Failed
      </span>
    )
  }
  if (row.status === IMPORT_ROW_STATUS.SKIPPED) {
    return (
      <span className="badge b-draft" title={why}>
        Skipped
      </span>
    )
  }

  return <span className="badge b-pend">Waiting</span>
}

/**
 * Kya chhoota — client ki asli maang yahi thi.
 *
 * ⚠️ Har issue teen hisse me dikhta hai, aur teenon zaroori hain: **kahan** (`label`), doc me
 * **kya likha tha** (`value`), aur **kya karna hai** (`message`). Sirf ek vaakya likhne se
 * client ko wo line 20 doc me dhoondhni padti; `value` se wo seedha Ctrl-F kar leta hai.
 */
function Issues({ row }) {
  /**
   * D-116: Failed row ke saath ab uske **poore issues** bhi aate hain (kaunsa khaana, kya likha tha) —
   * `error` sirf ek line ka saar hai. List ho to wahi dikhe; na ho (doc khula hi nahi) to `error`.
   */
  if (row.issues.length === 0) {
    return row.error ? (
      <span className="bu-blocker">{row.error}</span>
    ) : (
      <span className="muted">—</span>
    )
  }

  return (
    <ul className="bu-issues">
      {row.issues.map((issue, index) => (
        <li
          key={`${issue.label}-${index}`}
          className={issue.level === 'blocker' ? 'bu-blocker' : ''}
        >
          <b>{issue.label}</b>
          {issue.value && <> — &ldquo;{issue.value}&rdquo;</>}
          <br />
          {issue.message}
        </li>
      ))}
    </ul>
  )
}
