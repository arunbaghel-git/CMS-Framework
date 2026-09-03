import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { largeOf, thumbOf, uploadMedia, useMediaList } from '../../lib/media.js'
import './Media.css'

/**
 * Media Library — `admin-design-v2.html` ka `#s-media` (client, 3 Sep).
 *
 * Phase 2 ka bacha hua hissa. Foundation D-41 me pull-forward ho chuka tha (upload · WebP
 * variants 300/800/1600 · storage driver · magic-byte check · size cap); ye uski screen hai.
 *
 * ## Filters design ke hisaab se
 *
 * `#s-media` me teen dropdown, ek `Filter` button, phir search hai — aur wahi kram yahan hai.
 * Pehle maine inme se do apni marzi se badal diye the (month ki jagah date range) aur ek
 * chhod diya tha; **client ne tok diya** (3 Sep): _"filters admin reference me hai, aise
 * lagao, by own kyu decide kar rhe ho"_. R15 ka wahi rule.
 *
 * ⚠️ `Videos` aur `Documents (PDF)` chunne pe list **khaali** aayegi — aaj `MEDIA_MIME` sirf
 * JPG/PNG/WebP leta hai. Wo vikalp phir bhi hain kyunki design me hain; jis din wo kismein
 * upload hone lagengi, filter pehle se tayyar milega.
 *
 * ⚠️ **Teesra dropdown (`Unattached`/`Attached`) abhi nahi bana** — aur ye "maine nahi
 * banaya" nahi, "ban nahi sakta" hai: uske liye `mediaRefs` backlink index chahiye, jo Phase
 * 2 ka apna item hai aur abhi maujood nahi. Bina uske "ye image kahin lagi hai ya nahi" ka
 * jawab **andaaze se** dena padta — aur us andaaze pe koi image delete kar deta. Client se
 * poochha gaya hai.
 */

/**
 * `File URL` me **poora** URL — sirf `/uploads/...` nahi (client, 3 Sep).
 *
 * Client ne wo path copy karke browser me khola aur kuch nahi mila. Wajah saaf hai: variant
 * ki `url` **jaan-boojh kar relative** hoti hai (D-42 §2 wali wahi baat — usme kabhi
 * `localhost:4000` store nahi hota, warna wo dev hostname DB me baith kar prod me toot-ta).
 * Relative path browser ke address bar me kuch nahi hai.
 *
 * Origin **yahin se** lagta hai, kisi env se nahi: admin aur `/uploads` same-origin pe hain
 * (02-ARCHITECTURE §1) — dev me Vite proxy se, prod me reverse proxy se. Yaani jo URL admin
 * ke browser me chalta hai, wahi copy hone laayak hai.
 *
 * ⚠️ Prod me CDN aane pe (`CDN_BASE_URL`) variant ki url **absolute** hoti hai — tab use
 * chhua nahi jaata, warna origin do baar lag jaata.
 */
function fullUrl(url) {
  if (!url) return ''

  return /^https?:\/\//i.test(url) ? url : `${window.location.origin}${url}`
}

/** `2026-08` → `August 2026` — design ke dropdown ka wahi roop. */
function monthLabel(value) {
  const [year, mon] = value.split('-').map(Number)

  return new Date(Date.UTC(year, mon - 1, 1)).toLocaleString('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function MediaLibrary() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const inputRef = useRef(null)

  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)
  /** Detail panel ka form — server ka jawab aane tak yahi sach hai. */
  const [meta, setMeta] = useState({ alt: '', title: '', caption: '' })

  const page = Number(params.get('page') ?? 1)
  const applied = params.get('q') ?? ''
  const [search, setSearch] = useState(applied)

  /**
   * Applied filters URL me rehte hain — refresh aur back button dono pe bache rehte hain.
   *
   * ⚠️ Design me ek **`Filter` button** hai, isliye dropdown badalne se list turant nahi
   * badalti: user teenon chun kar `Filter` dabata hai. Isliye har dropdown ka apna draft
   * state hai (`draft`), aur URL me sirf wahi jaata hai jo apply hua.
   */
  const type = params.get('type') ?? ''
  const month = params.get('month') ?? ''
  const [draft, setDraft] = useState({ type, month })

  const query = useMemo(
    () => ({
      page,
      limit: 40,
      ...(applied ? { search: applied } : {}),
      ...(type ? { type } : {}),
      ...(month ? { month } : {}),
    }),
    [page, applied, type, month],
  )

  const hasFilters = Boolean(applied || type || month)
  const { data, months, meta: pageMeta, loading, error, reload } = useMediaList(query)

  function setFilter(next) {
    const merged = { ...Object.fromEntries(params), ...next }
    if (!('page' in next)) delete merged.page
    for (const [k, v] of Object.entries(merged)) if (!v) delete merged[k]

    setParams(merged)
  }

  /** Grid me kuch chuna — detail panel uske apne values se bharta hai. */
  function pick(media) {
    setSelected(media)
    setMeta({ alt: media.alt ?? '', title: media.title ?? '', caption: media.caption ?? '' })
    setNotice(null)
    setActionError(null)
  }

  async function onFile(file) {
    if (!file) return

    setBusy(true)
    setActionError(null)

    try {
      const media = await uploadMedia(file)
      pick(media)
      setNotice('Image uploaded.')
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function saveMeta() {
    setBusy(true)
    setActionError(null)

    try {
      const res = await api.patch(`/media/${selected.id}`, meta)
      /** Server ka jawab hi sach hai — trim/normalize wahan hota hai. */
      pick(res.data.data.media)
      setNotice('Saved.')
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${selected.filename}"?`)) return

    setBusy(true)
    setActionError(null)

    try {
      await api.delete(`/media/${selected.id}`)
      setSelected(null)
      setNotice('Image deleted.')
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const large = largeOf(selected)

  return (
    <>
      <div className="page-head">
        <h1>Media Library</h1>
        {can('media.upload') && (
          <button
            className="btn page-title-action"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            Add New
          </button>
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

      {/*
       * Filters bilkul design ke `#s-media` ke hisaab se: teen dropdown, `Filter` button,
       * spacer, phir search. Kram bhi wahi.
       */}
      <div className="tablenav">
        <select
          className="sel"
          style={{ width: 'auto' }}
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value })}
          aria-label="Filter by type"
        >
          <option value="">All media items</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="document">Documents (PDF)</option>
        </select>

        <select
          className="sel"
          style={{ width: 'auto' }}
          value={draft.month}
          onChange={(e) => setDraft({ ...draft, month: e.target.value })}
          aria-label="Filter by date"
        >
          <option value="">All dates</option>
          {/* Vikalp data se — jis mahine me kuch hai hi nahi, wo dikhta hi nahi */}
          {months.map((value) => (
            <option key={value} value={value}>
              {monthLabel(value)}
            </option>
          ))}
        </select>

        <button
          className="btn btn-plain"
          type="button"
          onClick={() => setFilter({ type: draft.type, month: draft.month })}
        >
          Filter
        </button>

        {hasFilters && (
          <button
            className="btn btn-plain"
            type="button"
            onClick={() => {
              setSearch('')
              setDraft({ type: '', month: '' })
              setFilter({ q: '', type: '', month: '' })
            }}
          >
            Clear
          </button>
        )}

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
            placeholder="Search media…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="pagination">
          <span>{pageMeta ? `${pageMeta.total} items` : ''}</span>
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
              if (pageMeta && page < pageMeta.pages) setFilter({ page: String(page + 1) })
            }}
          >
            ›
          </a>
        </div>
      </div>

      <div className="ml-grid-wrap">
        {/*
         * Poore grid pe drop — sirf ek chhote box pe nahi.
         *
         * Wahi soch jo R19 (date picker) pe hai: jo jagah kaam karti dikhti hai, wahan kaam
         * hona chahiye. Grid hi wo jagah hai jahan user image "rakhna" chahta hai.
         */}
        <div
          className="ml-grid"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (can('media.upload')) onFile(e.dataTransfer.files?.[0])
          }}
        >
          {loading && <p className="muted">Loading…</p>}
          {/*
           * Khaali list ke do bilkul alag matlab hain, aur user ko wahi batana chahiye:
           * "abhi kuch upload hi nahi hua" aur "filter se kuch nahi mila". Doosre me user
           * ka agla kadam Clear filters hai, upload nahi.
           */}
          {!loading && data.length === 0 && (
            <p className="muted">
              {hasFilters
                ? 'No media matches these filters.'
                : 'No media yet — upload your first image.'}
            </p>
          )}

          {data.map((media) => {
            const thumb = thumbOf(media)

            return (
              <button
                key={media.id}
                type="button"
                className={`ml-item${selected?.id === media.id ? ' on' : ''}`}
                onClick={() => pick(media)}
                title={media.filename}
              >
                {/* D-42 §2 — variant na ho to toota `<img>` kabhi nahi */}
                {thumb ? (
                  <img src={thumb.url} alt={media.alt || ''} loading="lazy" />
                ) : (
                  <span className="ml-blank" />
                )}
              </button>
            )
          })}
        </div>

        {/*
         * Panel **tabhi** hota hai jab kuch chuna ho — band hone pe grid poori chaudai le
         * leta hai (client, 3 Sep: "sidebar close karne ka option hona chahiye jisse only
         * images show ho").
         *
         * Isiliye khaali panel wali "Select an image…" line bhi hat gayi: wo ek khaali dabba
         * ghere rehti thi jiska kaam sirf ye batana tha ki wo khaali hai.
         */}
        {selected && (
          <aside className="ml-side">
            <section className="panel">
              <div className="panel-head">
                <h2>Attachment Details</h2>
                <button
                  className="ml-x"
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close details"
                >
                  ×
                </button>
              </div>
              <div className="panel-body">
                {large && <img className="ml-preview" src={large.url} alt={selected.alt || ''} />}

                <p className="ml-facts muted">
                  <strong>{selected.filename}</strong>
                  <br />
                  {selected.width}×{selected.height} · {Math.round(selected.size / 1024)} KB
                  <br />
                  {new Date(selected.createdAt).toLocaleString()}
                </p>

                {can('media.update') ? (
                  <>
                    <div className="field">
                      <label htmlFor="ml-alt">Alt text</label>
                      <input
                        id="ml-alt"
                        className="inp"
                        value={meta.alt}
                        onChange={(e) => setMeta({ ...meta, alt: e.target.value })}
                      />
                      <p className="hint">Describes the image for screen readers and SEO.</p>
                    </div>

                    <div className="field">
                      <label htmlFor="ml-title">Title</label>
                      <input
                        id="ml-title"
                        className="inp"
                        value={meta.title}
                        onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="ml-caption">Caption</label>
                      <textarea
                        id="ml-caption"
                        className="inp"
                        rows={2}
                        value={meta.caption}
                        onChange={(e) => setMeta({ ...meta, caption: e.target.value })}
                      />
                    </div>

                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={busy}
                      onClick={saveMeta}
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <p className="muted">{selected.alt || 'No alt text.'}</p>
                )}

                {large && (
                  <div className="field">
                    <label htmlFor="ml-url">File URL</label>
                    {/*
                     * `readOnly`, `disabled` nahi — disabled input ka text copy nahi hota,
                     * aur is box ka poora maksad hi copy karna hai.
                     */}
                    <input id="ml-url" className="inp" readOnly value={fullUrl(large.url)} />
                  </div>
                )}

                {/*
                 * "Delete", "Delete permanently" nahi — ye **trash** hai (R12): sirf
                 * `deletedAt` lagta hai aur file disk pe rehti hai. Label ko wahi kehna
                 * chahiye jo wo sach me karta hai.
                 */}
                {can('media.delete') && (
                  <button className="btn btn-danger" type="button" disabled={busy} onClick={remove}>
                    Delete
                  </button>
                )}
              </div>
            </section>
          </aside>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0])
          /** Wahi file dobara chunne pe bhi `change` chale — warna retry chup rehta. */
          e.target.value = ''
        }}
      />
    </>
  )
}
