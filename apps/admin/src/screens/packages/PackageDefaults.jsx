import { useEffect, useRef, useState } from 'react'

import { PACKAGE_SECTIONS, sectionHasDescription } from '@cms/shared'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { confirmRemove } from '../../lib/confirm.js'
import BookingPanel from './BookingPanel.jsx'
import RichTextEditor from './RichTextEditor.jsx'
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
  /** `{ overview: {heading, description}, … }` — Q-9. */
  const [labels, setLabels] = useState({})
  /** Kaunsa section tab khula hai — sirf dikhawe ka, data poora `labels` me rehta hai. */
  const [activeSection, setActiveSection] = useState(PACKAGE_SECTIONS[0].key)
  /** Booking steps + cancellation — A-13 tak inka koi UI hi nahi tha. */
  const [booking, setBooking] = useState({ bookingSteps: [], cancellationText: '' })
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

        /**
         * API **resolved** labels bhejti hai — yaani theek wahi text jo page pe chhap raha
         * hai (`resolveSectionLabels()`, D-65). Isliye yahan koi fallback nahi lagta.
         *
         * Form isi wajah se **bhara hua** khulta hai, placeholder se nahi: placeholder pe
         * client kisi line ko **hata** hi nahi sakta tha — box khaali karte hi placeholder
         * purana text wapas dikha deta. Bhare hue box ka niyam seedha hai: jo dikh raha
         * hai wahi page pe chhapega, aur khaali karoge to wahan kuch nahi aayega.
         */
        setLabels(data.sectionLabels ?? {})
        setBooking({
          bookingSteps: data.bookingSteps ?? [],
          cancellationText: data.cancellationText ?? '',
        })
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
    if (!confirmRemove('this image')) return

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
  const isLabels = section === 'sectionLabels'
  const isBooking = section === 'booking'

  const title = isImages
    ? 'Itinerary Images'
    : isLabels
      ? 'Section Headings'
      : isBooking
        ? 'Booking & Cancellation'
        : "What's Included"

  const subtitle = isImages
    ? 'One global pool — every package page shows a few of these, and they change on refresh.'
    : isLabels
      ? 'These headings print on every package page. Leave a description empty and no line appears under that section.'
      : isBooking
        ? 'These print inside "Good to know before you book" on every package page — the numbered steps first, then the cancellation policy.'
        : 'This same list prints on every package. Keep the lines generic — not about any one package.'

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
      </div>
      <p className="subtitle">{subtitle}</p>

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

      {isBooking ? (
        <>
          <BookingPanel
            steps={booking.bookingSteps}
            cancellationText={booking.cancellationText}
            onChange={setBooking}
            disabled={!canWrite}
          />

          {canWrite && (
            <div className="panel">
              <div className="panel-foot">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={saving}
                  onClick={() => save(booking)}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : isLabels ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Section Headings</h2>
          </div>
          {/*
           * Saat section tabs me hain, ek doosre ke neeche nahi (client, 1 Sep).
           *
           * Do wajah. Ek dikhne wali: saat heading + chhe editor ek page pe ek bahut lambi
           * scroll banate the, aur kis section pe kaam ho raha hai wo kho jaata tha.
           *
           * Doosri jo dikhti nahi: **ek waqt pe sirf ek TipTap instance mount hota hai.**
           * Chhe editors ek saath chalana muft nahi hai — har ek apna ProseMirror view aur
           * plugins leke aata hai.
           *
           * ⚠️ Tab badalne se **kuch nahi khota** — saara data `labels` me hai, jo yahan
           * upar rehta hai. Tab sirf ye tay karta hai ki kaunsa dikh raha hai; Save
           * hamesha **poora** object bhejta hai.
           *
           * Ye route-based tabs **nahi** hain (jaise Settings ke hain) — wo alag screens
           * hain, ye ek hi screen ke hisse hain jo ek saath Save hote hain.
           */}
          <nav className="tabs" aria-label="Sections">
            {PACKAGE_SECTIONS.map((section) => (
              <button
                key={section.key}
                type="button"
                className={section.key === activeSection ? 'on' : ''}
                aria-current={section.key === activeSection ? 'true' : undefined}
                onClick={() => setActiveSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="panel-body">
            {PACKAGE_SECTIONS.filter((section) => section.key === activeSection).map((section) => (
              <div className="field" key={section.key}>
                <label>{section.label}</label>
                <input
                  className="inp"
                  value={labels[section.key]?.heading ?? ''}
                  onChange={(e) =>
                    setLabels((prev) => ({
                      ...prev,
                      [section.key]: { ...prev[section.key], heading: e.target.value },
                    }))
                  }
                  disabled={!canWrite}
                />

                {sectionHasDescription(section) ? (
                  <>
                    {/*
                     * Textarea se rich text editor (D-69, client ka faisla).
                     *
                     * ⚠️ Dropdown me poora `H1`–`H6` hai (client, 1 Sep — "i need all").
                     * Pehle yahan sirf H3/H4 the, is tark se ki ye description page ke
                     * `<h2>` ke **neeche** chhapti hai aur wahan H1/H2 outline tod dete
                     * hain. Wo tark aaj bhi sach hai — par ye client ke apne page ka content
                     * hai, aur kaunsa tag kahan chahiye ye unka faisla hai. Poora tark
                     * `RichTextEditor` ke `HEADING_LEVELS` pe likha hai.
                     *
                     * ⚠️ Khaali chhodne ka matlab **"line hata do"** hai (D-65) — aur wo
                     * matlab ab bhi zinda hai: khaali editor ek khaali doc bhejta hai, aur
                     * `isEmptyDoc()` use pehchan leti hai.
                     */}
                    <RichTextEditor
                      label={section.label}
                      doc={labels[section.key]?.description}
                      onChange={(doc) =>
                        setLabels((prev) => ({
                          ...prev,
                          [section.key]: { ...prev[section.key], description: doc },
                        }))
                      }
                      disabled={!canWrite}
                    />
                    <div className="hint">Leave this empty and no line appears on the page.</div>
                  </>
                ) : (
                  <div className="hint">
                    The text under this heading comes from each package&rsquo;s own Overview.
                  </div>
                )}

                {section.hint && <div className="hint">{section.hint}</div>}
              </div>
            ))}
          </div>
          {canWrite && (
            <div className="panel-foot">
              <button
                className="btn btn-primary"
                type="button"
                disabled={saving}
                onClick={() => save({ sectionLabels: labels })}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      ) : isImages ? (
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
              <div className="pkg-image-grid">
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
                Keep it generic — &quot;Accommodation on twin sharing with daily breakfast&quot;,
                not &quot;5 nights…&quot;
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
