import { useEffect, useRef, useState } from 'react'
import { CURRENCIES, DATE_FORMATS, TIMEZONES, updateSettingsSchema } from '@cms/shared'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * Settings → General — `admin-design.html` ke `#s-settings > #t-general` se.
 *
 * Teen panel, design ke hi order aur layout me:
 *   Site Identity      `.row2` (chaar field) + `.row2` (Logo · Favicon drop zones)
 *   Locale & Currency  `.row3`
 *   Contact & Social   `.row2`, aur Save isi panel ke `panel-foot` me
 *
 * **Homepage & Archives yahan nahi hai — aur design me bhi General me nahi hai.** Wo
 * alag tab ("Reading & Permalinks") me rehta hai. Pehle wo galti se General me daal
 * diya gaya tha; client ne pakda (D-40).
 *
 * **Logo aur Favicon Media me store hote hain.** Picker Phase 2 me aayega; yahan ka
 * live path direct upload hai, aur ID existing settings save ke saath persist hoti hai.
 */

/** Design ke labels — value wahi token hai jo server store karta hai. */
const DATE_FORMAT_LABELS = {
  'd MMM yyyy': '18 Aug 2026',
  'MM/dd/yyyy': '08/18/2026',
  'yyyy-MM-dd': '2026-08-18',
}

const TIMEZONE_LABELS = {
  'Asia/Kolkata': 'Asia/Kolkata (UTC+5:30)',
  UTC: 'UTC',
}

const CURRENCY_LABELS = { INR: 'INR (₹)', USD: 'USD ($)', }

export default function General() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [media, setMedia] = useState({})
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => {
        const next = res.data.data.settings
        setSettings(next)
        return loadSavedMedia(next)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const set = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.value }))
  const setSocial = (key) => (e) => {
    const { value } = e.target
    setSettings((s) => ({ ...s, social: { ...s.social, [key]: value } }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    /**
     * Sirf editable fields bhejo. `siteUrl` server ne read-only ke taur pe bheja tha
     * (wo env se aata hai, D-40) — use wapas bhejne ka koi matlab nahi.
     */
    const payload = {
      siteName: settings.siteName,
      tagline: settings.tagline,
      adminEmail: settings.adminEmail,
      logoMediaId: settings.logoMediaId,
      faviconMediaId: settings.faviconMediaId,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      currency: settings.currency,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      address: settings.address,
      social: settings.social,
    }

    // Wahi schema jo server use karta hai (R8)
    const parsed = updateSettingsSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      const res = await api.patch('/settings', parsed.data)
      setSettings(res.data.data.settings)
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function loadSavedMedia(nextSettings) {
    const entries = await Promise.all(
      [
        ['logoMediaId', nextSettings.logoMediaId],
        ['faviconMediaId', nextSettings.faviconMediaId],
      ]
        .filter(([, id]) => id)
        .map(async ([key, id]) => {
          try {
            const res = await api.get(`/media/${id}`)
            return [key, res.data.data.media]
          } catch {
            return [key, null]
          }
        }),
    )

    setMedia(Object.fromEntries(entries.filter(([, item]) => item)))
  }

  async function uploadMedia(key, file) {
    if (!file) return

    setError(null)
    setNotice(null)
    setUploading(key)

    const body = new FormData()
    body.append('file', file)

    try {
      const res = await api.post('/media', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const uploaded = res.data.data.media
      setSettings((s) => ({ ...s, [key]: uploaded.id }))
      setMedia((current) => ({ ...current, [key]: uploaded }))
      setNotice(`${key === 'logoMediaId' ? 'Logo' : 'Favicon'} uploaded. Save changes to apply it.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(null)
    }
  }

  function clearMedia(key) {
    setSettings((s) => ({ ...s, [key]: null }))
    setMedia((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!settings) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <SettingsTabs />

      {notice && (
        <div className="notice ok">
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {!canEdit && (
        <div className="notice warn">
          <span>You can view these settings but not change them.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={!canEdit}>
          {/* ── Site Identity ─────────────────────────────────────────────── */}
          <div className="panel">
            <div className="panel-head">
              <h2>Site Identity</h2>
            </div>
            <div className="panel-body">
              <div className="row2">
                <div className="field">
                  <label htmlFor="s-title">Site Title</label>
                  <input
                    id="s-title"
                    className="inp"
                    value={settings.siteName}
                    onChange={set('siteName')}
                  />
                </div>

                <div className="field">
                  <label htmlFor="s-tagline">Tagline</label>
                  <input
                    id="s-tagline"
                    className="inp"
                    value={settings.tagline}
                    onChange={set('tagline')}
                  />
                </div>

                <div className="field">
                  <label htmlFor="s-url">Site URL</label>
                  <input
                    id="s-url"
                    className="inp"
                    value={settings.siteUrl ?? ''}
                    readOnly
                    disabled
                  />
                  <p className="hint">
                    Set in the server configuration, not here — the site&apos;s links and its
                    security allowlist both depend on it.
                  </p>
                </div>

                <div className="field">
                  <label htmlFor="s-email">Admin Email</label>
                  <input
                    id="s-email"
                    className="inp"
                    type="email"
                    value={settings.adminEmail}
                    onChange={set('adminEmail')}
                  />
                  <p className="hint">Where site notifications will be sent.</p>
                </div>
              </div>

              <div className="row2">
                <MediaDrop
                  label="Logo"
                  hint="PNG, JPG or WebP"
                  media={media.logoMediaId}
                  uploading={uploading === 'logoMediaId'}
                  onUpload={(file) => uploadMedia('logoMediaId', file)}
                  onClear={() => clearMedia('logoMediaId')}
                />
                <MediaDrop
                  label="Favicon"
                  hint="512x512 PNG, JPG or WebP"
                  media={media.faviconMediaId}
                  uploading={uploading === 'faviconMediaId'}
                  onUpload={(file) => uploadMedia('faviconMediaId', file)}
                  onClear={() => clearMedia('faviconMediaId')}
                />
              </div>
            </div>
          </div>

          {/* ── Locale & Currency ─────────────────────────────────────────── */}
          <div className="panel">
            <div className="panel-head">
              <h2>Locale &amp; Currency</h2>
            </div>
            <div className="panel-body row3">
              <Select
                id="s-tz"
                label="Timezone"
                value={settings.timezone}
                options={TIMEZONES}
                labels={TIMEZONE_LABELS}
                onChange={set('timezone')}
              />
              <Select
                id="s-date"
                label="Date Format"
                value={settings.dateFormat}
                options={DATE_FORMATS}
                labels={DATE_FORMAT_LABELS}
                onChange={set('dateFormat')}
              />
              <Select
                id="s-currency"
                label="Default Currency"
                value={settings.currency}
                options={CURRENCIES}
                labels={CURRENCY_LABELS}
                onChange={set('currency')}
              />
            </div>
          </div>

          {/* ── Contact & Social ──────────────────────────────────────────── */}
          <div className="panel">
            <div className="panel-head">
              <h2>Contact &amp; Social</h2>
            </div>

            <div className="panel-body row2">
              <div className="field">
                <label htmlFor="s-phone">Phone</label>
                <input
                  id="s-phone"
                  className="inp"
                  value={settings.phone}
                  onChange={set('phone')}
                />
              </div>

              <div className="field">
                <label htmlFor="s-whatsapp">WhatsApp Number</label>
                <input
                  id="s-whatsapp"
                  className="inp"
                  value={settings.whatsapp}
                  onChange={set('whatsapp')}
                />
              </div>

              <div className="field">
                <label htmlFor="s-address">Office Address</label>
                <textarea
                  id="s-address"
                  className="ta settings-address"
                  value={settings.address}
                  onChange={set('address')}
                />
              </div>

              <div className="field">
                <label htmlFor="s-instagram">Social Links</label>
                <input
                  id="s-instagram"
                  className="inp social-inp"
                  placeholder="Instagram URL"
                  value={settings.social.instagram}
                  onChange={setSocial('instagram')}
                />
                <input
                  className="inp social-inp"
                  placeholder="Facebook URL"
                  aria-label="Facebook URL"
                  value={settings.social.facebook}
                  onChange={setSocial('facebook')}
                />
                <input
                  className="inp"
                  placeholder="YouTube URL"
                  aria-label="YouTube URL"
                  value={settings.social.youtube}
                  onChange={setSocial('youtube')}
                />
              </div>
            </div>

            {/* Save design me isi aakhri panel ke foot me hai, apne alag panel me nahi */}
            <div className="panel-foot">
              <span className="muted">Changes apply site-wide</span>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </>
  )
}

/** Label + select, teen jagah ek jaisa. */
function Select({ id, label, value, options, labels, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="sel" value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * Logo / Favicon ka drop zone — design ka `.featured-drop`.
 */
function MediaDrop({ label, hint, media, uploading, onUpload, onClear }) {
  const inputRef = useRef(null)
  const preview = media?.variants?.find((variant) => variant.key === 'thumb') ?? media?.variants?.[0]

  return (
    <div className="field">
      <label>{label}</label>
      <div
        className="featured-drop media-drop"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          inputRef.current?.click()
        }}
      >
        {preview ? (
          <img src={preview.url} alt="" className="media-drop-preview" />
        ) : (
          <span>
            {uploading ? 'Uploading...' : hint}
            <br />
            <span className="muted">{media?.filename ?? 'No file selected'}</span>
          </span>
        )}
      </div>
      <div className="media-drop-actions">
        <input
          ref={inputRef}
          className="media-drop-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            onUpload(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        {media && (
          <button className="btn btn-plain" type="button" onClick={onClear}>
            Remove
          </button>
        )}
        {media?.filename && <span className="muted media-drop-name">{media.filename}</span>}
      </div>
    </div>
  )
}
