import { useMemo, useRef, useState } from 'react'

import { useAuth } from '../../lib/auth.jsx'
import { errorMessage } from '../../lib/api.js'
import { thumbOf, uploadMedia, useMediaList } from '../../lib/media.js'
import './MediaPicker.css'

/**
 * "Image chuno" ka popup — **pehle library, phir upload** (client, 3 Sep).
 *
 * Client ki asli shikayat yahi thi: _"jo images admin me upload karta hu … mujhe fir se
 * upload karna padta hai har baar"_. Us waqt uska ek hissa A-16 ka bug tha (files mit rahi
 * thi), par doosra hissa ye tha ki **pehle se upload ki hui image chunne ka koi raasta hi
 * nahi tha** — `MediaDrop` sirf naya upload karta tha.
 *
 * Isiliye `Media Library` tab default hai aur `Upload` doosra: aam kaam "jo pehle se hai
 * usme se chuno" hai, "nayi laao" nahi.
 *
 * ## Yahan `MediaDrop` ki jagah nahi li gayi
 *
 * `MediaDrop` me hi ye picker lagta hai (uske apne comment me yahi likha tha: _"jab picker
 * aayega to badalna sirf yahi ek file hogi"_). Isliye Settings ka Logo/Favicon aur Footer ka
 * logo — teenon apne aap "choose or upload" ban jaate hain, unka code chhue bina.
 *
 * ## `multiple` — ek baar me kai image (Gallery block, client, 23 Sep, D-111)
 *
 * Tick karo, phir `Add N images`. Kram wahi jis kram me tick kiya — wahi gallery ka kram banta hai.
 * Upload tab bhi kai file ek saath leta hai, aur har upload hui image apne aap tick ho jaati hai.
 * Double-click is mode me turant band nahi karta (do click = tick lagaa aur hataa) — band `Add` se hi.
 *
 * @param {object} props
 * @param {(media: any) => void} [props.onSelect] Chuni hui image ka poora public object
 * @param {(list: any[]) => void} [props.onSelectMany] `multiple` me — chuni hui images, tick ke kram me
 * @param {boolean} [props.multiple]
 * @param {() => void} props.onClose
 */
export default function MediaPicker({ onSelect, onSelectMany, multiple = false, onClose }) {
  const { can } = useAuth()
  const inputRef = useRef(null)

  const [tab, setTab] = useState('library')
  const [page, setPage] = useState(1)
  const [applied, setApplied] = useState('')
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(null)
  /** `multiple` mode ki list — alag state, taaki single wala raasta bilkul waisa hi rahe. */
  const [many, setMany] = useState([])
  const toggle = (media) =>
    setMany((list) =>
      list.some((m) => m.id === media.id)
        ? list.filter((m) => m.id !== media.id)
        : [...list, media],
    )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const query = useMemo(
    () => ({ page, limit: 24, ...(applied ? { search: applied } : {}) }),
    [page, applied],
  )
  const { data, meta, loading, reload } = useMediaList(query)

  async function onFile(input) {
    const files = [...(input ?? [])].slice(0, multiple ? undefined : 1)
    if (!files.length) return

    setBusy(true)
    setError(null)

    try {
      /** Ek-ek karke — ek saath 20 upload server pe sharp ke 20 kaam ek saath chalaate. */
      const uploaded = []
      for (const file of files) uploaded.push(await uploadMedia(file))
      /**
       * Upload ke turant baad wo image **chuni hui** ho jaati hai aur tab library pe wapas —
       * user ne wo file isiliye di thi ki use lagani hai, dobara dhoondhne ke liye nahi.
       */
      if (multiple)
        setMany((list) => [...list, ...uploaded.filter((m) => !list.some((x) => x.id === m.id))])
      else setPicked(uploaded[0])
      setTab('library')
      setApplied('')
      setSearch('')
      setPage(1)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="mp-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={multiple ? 'Select images' : 'Select image'}
      /** Bahar click karne pe band — par andar ka click bahar tak na jaaye. */
      onClick={onClose}
    >
      <div className="mp" onClick={(e) => e.stopPropagation()}>
        <div className="mp-head">
          <h2>{multiple ? 'Select images' : 'Select image'}</h2>
          <button className="mp-x" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <ul className="subsubsub mp-tabs">
          <li>
            <a
              href="#library"
              className={tab === 'library' ? 'current' : ''}
              onClick={(e) => (e.preventDefault(), setTab('library'))}
            >
              Media Library
            </a>
          </li>
          {can('media.upload') && (
            <li>
              <a
                href="#upload"
                className={tab === 'upload' ? 'current' : ''}
                onClick={(e) => (e.preventDefault(), setTab('upload'))}
              >
                Upload
              </a>
            </li>
          )}
        </ul>

        {error && (
          <div className="notice err" role="alert">
            <span>{error}</span>
          </div>
        )}

        {tab === 'library' ? (
          <>
            <form
              className="mp-search"
              onSubmit={(e) => {
                e.preventDefault()
                setPage(1)
                setApplied(search)
              }}
            >
              <input
                className="inp"
                placeholder="Search media…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            <div className="mp-body">
              {loading && <p className="muted">Loading…</p>}
              {!loading && data.length === 0 && <p className="muted">No images found.</p>}

              <div className="mp-grid">
                {data.map((media) => {
                  const thumb = thumbOf(media)
                  const order = many.findIndex((m) => m.id === media.id)
                  const on = multiple ? order !== -1 : picked?.id === media.id

                  return (
                    <button
                      key={media.id}
                      type="button"
                      className={`mp-item${on ? ' on' : ''}`}
                      onClick={() => (multiple ? toggle(media) : setPicked(media))}
                      onDoubleClick={multiple ? undefined : () => onSelect(media)}
                      aria-pressed={multiple ? on : undefined}
                      title={media.filename}
                    >
                      {/* Tick ka kram — gallery me image isi kram me judti hai */}
                      {multiple && on && <span className="mp-num">{order + 1}</span>}
                      {/* D-42 §2 — variant na ho to toota `<img>` kabhi nahi, khaali box */}
                      {thumb ? (
                        <img src={thumb.url} alt={media.alt || ''} loading="lazy" />
                      ) : (
                        <span className="mp-blank" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {meta && meta.pages > 1 && (
              <div className="mp-pager">
                <button
                  className="btn btn-plain btn-sm"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹ Prev
                </button>
                <span className="muted">
                  {page} / {meta.pages}
                </span>
                <button
                  className="btn btn-plain btn-sm"
                  type="button"
                  disabled={page >= meta.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next ›
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="mp-body mp-upload">
            <div
              className="featured-drop"
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                inputRef.current?.click()
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                onFile(e.dataTransfer.files)
              }}
            >
              <span>
                {busy
                  ? 'Uploading…'
                  : multiple
                    ? 'Drop images here, or click to choose'
                    : 'Drop an image here, or click to choose'}
                <br />
                <span className="muted">JPG, PNG or WebP</span>
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              multiple={multiple}
              onChange={(e) => {
                onFile(e.target.files)
                /** Wahi file dobara chunne pe bhi `change` chale — warna retry chup rehta. */
                e.target.value = ''
              }}
            />
          </div>
        )}

        <div className="mp-foot">
          <span className="muted">
            {multiple
              ? many.length
                ? `${many.length} selected`
                : 'Nothing selected'
              : picked
                ? picked.filename
                : 'Nothing selected'}
          </span>
          <div>
            <button className="btn btn-plain" type="button" onClick={onClose}>
              Cancel
            </button>
            {multiple ? (
              <button
                className="btn btn-primary"
                type="button"
                disabled={!many.length}
                onClick={() => onSelectMany(many)}
              >
                {many.length === 1
                  ? 'Add 1 image'
                  : many.length
                    ? `Add ${many.length} images`
                    : 'Add images'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                type="button"
                disabled={!picked}
                onClick={() => onSelect(picked)}
              >
                Use this image
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
