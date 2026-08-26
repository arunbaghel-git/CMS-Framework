import { useEffect, useRef, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useMediaById } from './usePackages.js'
import './Packages.css'

/**
 * What's Included aur Itinerary Images — spec 007 §1.5, §1.7.
 *
 * **Ek hi document ke do hisse** (`packageDefaults`, D-48 §4). Sidebar me ye do alag items
 * hain kyunki client ne wahi maanga tha, par dono ek hi singleton likhte hain — isliye
 * screen bhi ek hi hai, `section` prop se.
 *
 * ⚠️ **Ye poori tarah global hai.** Package editor me inka koi panel nahi hai (§1.5), aur
 * admin design ka "Inclusions & Exclusions" panel isiliye hata diya gaya. Har package pe
 * yahi list chhapti hai.
 *
 * Content ki ek zaroori baat, jo yahan hint me bhi likhi hai: ye lines **generic** honi
 * chahiye. Page ka aaj ka text package-specific hai ("**5 nights** on twin sharing"), aur
 * global list me wo galat ho jaata hai.
 */

/** Textarea me ek line = ek item. Khaali lines gir jaati hain. */
const toLines = (text) =>
  String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

export default function PackageDefaults({ section }) {
  const { can } = useAuth()
  const fileRef = useRef(null)

  const [defaults, setDefaults] = useState(null)
  const [included, setIncluded] = useState('')
  const [excluded, setExcluded] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const media = useMediaById(images)

  useEffect(() => {
    api
      .get('/package-defaults')
      .then((res) => {
        const data = res.data.data.packageDefaults
        setDefaults(data)
        setIncluded((data.whatsIncluded?.included ?? []).join('\n'))
        setExcluded((data.whatsIncluded?.excluded ?? []).join('\n'))
        setImages(data.itineraryImages ?? [])
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const canWrite = can('packageDefaults.update')

  async function save(patch) {
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const res = await api.patch('/package-defaults', patch)
      setDefaults(res.data.data.packageDefaults)
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /**
   * Multi-upload — client ek baar me ~20 image daalta hai (§1.7).
   *
   * Ek-ek karke sequential upload hota hai, sab ek saath nahi: 20 parallel multipart
   * requests rate limiter se takrati hain (`/api` pe 120/min), aur us failure ka lakshan
   * "kuch images upload hi nahi hui" jaisa dikhta hai — jiski wajah bilkul saaf nahi hoti.
   */
  async function uploadImages(files) {
    if (!files?.length) return

    setUploading(true)
    setError(null)

    const uploaded = []

    try {
      for (const file of files) {
        const body = new FormData()
        body.append('file', file)

        const res = await api.post('/media', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        uploaded.push(res.data.data.media.id)
      }

      const next = [...images, ...uploaded]
      setImages(next)
      await save({ itineraryImages: next })
    } catch (err) {
      setError(errorMessage(err))
      // Jo chadh chuki hain wo bach jaani chahiye — dobara upload karwana bura vyavhaar hai
      if (uploaded.length > 0) setImages((current) => [...current, ...uploaded])
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removeImage(id) {
    const next = images.filter((x) => x !== id)
    setImages(next)
    await save({ itineraryImages: next })
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!defaults) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  const isImages = section === 'itineraryImages'

  return (
    <>
      <div className="page-head">
        <h1>{isImages ? 'Itinerary Images' : "What's Included"}</h1>
      </div>
      <p className="subtitle">
        {isImages
          ? 'Ek global pool — har package page inme se kuch images dikhata hai, aur refresh pe wo badal jaati hain.'
          : 'Har package pe yahi list chhapti hai. Lines generic likhein — kisi ek package ki baat nahi.'}
      </p>

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
        </div>
      )}

      {isImages ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Image pool</h2>
            <span className="muted">{images.length} images</span>
          </div>
          <div className="panel-body">
            {canWrite && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => uploadImages([...e.target.files])}
                  disabled={uploading}
                />
                {uploading && <p className="muted">Uploading…</p>}
              </>
            )}

            {images.length === 0 ? (
              <p className="muted">No images yet.</p>
            ) : (
              <div className="media-grid pkg-image-grid">
                {images.map((id) => {
                  const doc = media[id]
                  const preview =
                    doc?.variants?.find((v) => v.key === 'thumb') ?? doc?.variants?.[0]

                  return (
                    <div className="media-item" key={id}>
                      {/* Media resolve na ho to koi `<img>` nahi — toota hua image kabhi
                          nahi (D-42 §2) */}
                      {preview && <img src={preview.url} alt="" />}
                      {canWrite && (
                        <button
                          className="btn btn-sm btn-danger"
                          type="button"
                          onClick={() => removeImage(id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-head">
            <h2>Inclusions &amp; Exclusions</h2>
          </div>
          <div className="panel-body row2">
            <div className="field">
              <label>
                Included <span className="muted">(one per line)</span>
              </label>
              <textarea
                className="ta"
                value={included}
                onChange={(e) => setIncluded(e.target.value)}
                disabled={!canWrite}
              />
              <div className="hint">
                Generic likhein — &quot;Accommodation on twin sharing with daily breakfast&quot;, na
                ki &quot;5 nights…&quot;
              </div>
            </div>
            <div className="field">
              <label>
                Not included <span className="muted">(one per line)</span>
              </label>
              <textarea
                className="ta"
                value={excluded}
                onChange={(e) => setExcluded(e.target.value)}
                disabled={!canWrite}
              />
            </div>
          </div>
          {canWrite && (
            <div className="panel-foot">
              <button
                className="btn btn-primary"
                type="button"
                disabled={saving}
                onClick={() =>
                  save({
                    whatsIncluded: { included: toLines(included), excluded: toLines(excluded) },
                  })
                }
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
