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
 * ## Design ke jo filter yahan nahi hain
 *
 * Design me chaar tab hain — `All media items · Images · Videos · Documents (PDF)` — aur do
 * filter (`All dates`, `Unattached/Attached`). Yahan **koi nahi**:
 *
 * | Design me | Kyun nahi |
 * | --- | --- |
 * | Videos · Documents ke tab | Upload sirf **JPG/PNG/WebP** leta hai (`MEDIA_MIME`). Khaali tab dikhana ye batana hai ki wo kism support hai |
 * | Attached / Unattached | `mediaRefs` backlink index bana hi nahi — "ye image kahan lagi hai" ka jawab kisi ke paas nahi. Andaaze se filter banana galat data dikhana hota |
 * | All dates | Ye ban sakta tha, par client ne nahi maanga. Search filename/alt/title/caption pe pehle se chalti hai |
 *
 * Wahi niyam jo poore admin pe hai: jo kaam karta hi na ho, uska control mat dikhao (D-30).
 */
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

  const query = useMemo(
    () => ({ page, limit: 40, ...(applied ? { search: applied } : {}) }),
    [page, applied],
  )
  const { data, meta: pageMeta, loading, error, reload } = useMediaList(query)

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

      <div className="tablenav">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setFilter({ q: search })
          }}
        >
          <input
            className="inp"
            style={{ width: 220 }}
            placeholder="Search media…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="spacer" />

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
          {!loading && data.length === 0 && (
            <p className="muted">
              {applied
                ? 'No media matches that search.'
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

        <aside className="ml-side">
          {!selected ? (
            <p className="muted">Select an image to see its details.</p>
          ) : (
            <section className="panel">
              <div className="panel-head">
                <h2>Attachment Details</h2>
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
                    <input id="ml-url" className="inp" readOnly value={large.url} />
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
          )}
        </aside>
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
