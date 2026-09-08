import { MAX_TRUST_BADGES, updateSettingsSchema } from '@cms/shared'
import { useEffect, useState } from 'react'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { confirmRemove } from '../../lib/confirm.js'
import { useMediaById } from '../../lib/use-entries.js'
import './Settings.css'

/**
 * Settings → Tour settings — trust badges aur universal banner (D-87, client ke faisle #10/#11).
 *
 * ## Yahan kyun, `packageDefaults` me kyun nahi
 *
 * Client ne dono ko **global** kaha. Wahi lakeer jo `ctaSection` (D-67) pe khinchi thi: jo
 * cheez sirf package ki nahi, wo `settings` me rehti hai. Badges hero pe chhapte hain aur wo
 * hero package page pe bhi hai aur tour page pe bhi — unhe `packageDefaults` me daalne ka
 * matlab hota ki tour page apne badges package ke globals se uthaye.
 *
 * ⚠️ **Tab ka naam client ka hai, aur wo content se thoda tang hai** — dono cheezein package
 * page pe bhi chalti hain, sirf Tour pages pe nahi. Naam client ne chuna (R15); ye chetavni
 * isliye hai ki koi ise "sirf tourPage ka" samajh kar wahan gate na laga de.
 *
 * ⚠️ **Banner sirf fallback hai, override nahi.** Page pe Featured image daali ho to wo
 * jeetegi (client ka faisla #10). Wahi shakl jo rating (D-87 §3) aur `sectionLabels` (D-65)
 * pe hai: site ki default neeche, page ka apna upar.
 */

/** Icon ek enum hai, SVG nahi — wahi tark jo footer column ki `width` pe hai (D-44). */
const ICON_LABEL = {
  /* ⚠️ Ye pehle `— koi nahi —` tha — R17 (UI ka text English me). 8 Sep ko pakda. */
  none: '— none —',
  shield: 'Shield',
  pin: 'Location pin',
  doc: 'Document',
  star: 'Star',
  clock: 'Clock',
  check: 'Check',
}

/** Khaali — naye instance pe `tourSettings` `{}` hota hai. */
const EMPTY = { bannerMediaId: null, trustBadges: [] }

const blankBadge = () => ({ icon: 'shield', text: '' })

export default function TourSettings() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [tour, setTour] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const media = useMediaById([tour?.bannerMediaId].filter(Boolean))

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setTour({ ...EMPTY, ...(res.data.data.settings.tourSettings ?? {}) }))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const set = (key, value) => setTour((t) => ({ ...t, [key]: value }))

  const setBadge = (index, patch) =>
    setTour((t) => ({
      ...t,
      trustBadges: t.trustBadges.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    /** Wahi schema jo server use karta hai (R8) — galti yahin pakdi jaaye, 400 se pehle. */
    const parsed = updateSettingsSchema.safeParse({ tourSettings: tour })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      /**
       * ⚠️ Test **response nahi, DB** padhna chahiye — `updatePackageDefaults()` wala jaal
       * chaar baar laga tha. Yahan wo jaal nahi hai (`updateSettings()` input pe loop karta
       * hai, whitelist nahi), par gate Zod pe khisak jaata hai: field `settings.js` ke schema
       * me na ho to validation use chup-chaap gira degi — wahi lakshan, alag jagah.
       */
      const res = await api.patch('/settings', { tourSettings: tour })
      setTour({ ...EMPTY, ...(res.data.data.settings.tourSettings ?? {}) })
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!tour) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  return (
    <>
      {/*
       * ⚠️ Heading `Tour` hai aur `SettingsTabs` **hata di gayi** — 8 Sep ko client ne is screen
       * ko `Settings ▸ Tour settings` se `Tour ▸ Tour settings` me bhej diya.
       *
       * Tabs chhodne ka matlab hota ki Tour ke neeche khuli screen Settings ke tabs dikhati —
       * yaani nav kuch aur kehti aur screen kuch aur. Storage wahi hai (`settings.tourSettings`),
       * sirf jagah badli hai.
       */}
      <div className="page-head">
        <h1>Tour</h1>
      </div>

      <p className="subtitle">
        The trust line under the hero, and the default banner image. Both are used on every page — a
        page with its own Featured image uses that instead.
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

      <form onSubmit={handleSubmit}>
        <div className="panel">
          <div className="panel-head">
            <h2>Universal banner image</h2>
          </div>
          <div className="panel-body">
            <MediaDrop
              label="Banner image"
              hint="1600×900 · PNG, JPG or WebP. A page with its own Featured image uses that."
              media={media[tour.bannerMediaId]}
              onSelect={(chosen) => set('bannerMediaId', chosen.id)}
              onClear={() => set('bannerMediaId', null)}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Trust badges</h2>
            <span className="muted">
              {tour.trustBadges.length} / {MAX_TRUST_BADGES}
            </span>
          </div>
          <div className="panel-body">
            {tour.trustBadges.length === 0 && (
              <div className="hint">
                No badges yet — the trust line will not appear on any page.
              </div>
            )}

            {tour.trustBadges.map((badge, i) => (
              <div className="row2" key={i}>
                <div className="field">
                  <label>Icon</label>
                  <select
                    className="sel"
                    value={badge.icon ?? 'none'}
                    onChange={(e) => setBadge(i, { icon: e.target.value })}
                    disabled={!canEdit}
                  >
                    {Object.entries(ICON_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Text</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="inp"
                      value={badge.text ?? ''}
                      placeholder="Govt. of India enlisted"
                      onChange={(e) => setBadge(i, { text: e.target.value })}
                      disabled={!canEdit}
                    />
                    {canEdit && (
                      <button
                        className="btn btn-sm btn-danger"
                        type="button"
                        onClick={async () => {
                          if (!(await confirmRemove('this badge'))) return
                          set(
                            'trustBadges',
                            tour.trustBadges.filter((_, idx) => idx !== i),
                          )
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {canEdit && tour.trustBadges.length < MAX_TRUST_BADGES && (
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => set('trustBadges', [...tour.trustBadges, blankBadge()])}
              >
                ＋ Badge
              </button>
            )}

            <div className="hint">
              A badge with no text never reaches the page — clearing the text is how you remove one.
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="panel-foot">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </form>
    </>
  )
}
