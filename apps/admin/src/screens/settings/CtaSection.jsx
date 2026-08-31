import { useEffect, useState } from 'react'
import {
  BUTTON_VARIANTS,
  MAX_CTA_BULLETS,
  MAX_CTA_BUTTONS,
  updateSettingsSchema,
} from '@cms/shared'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { confirmRemove } from '../../lib/confirm.js'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * Settings → CTA Section — page ka aakhri card (`itinerary-v3.html` ka `.offer`), D-67.
 *
 * ⚠️ **Poori tarah static hai — kuch bhi derive nahi hota** (client, 31 Aug). Design me
 * box ka daam aur category package ke pricing se aate the (`js-px` / `js-cat-name`); ab wo
 * do saade text field hain. Wajah client ne di: _"koi value automatically update nahi
 * hogi, kyuki dusre pages par bhi use hoga."_
 *
 * ⚠️ Isi wajah se **ek hi text har page pe** dikhega — ₹24,999 wale package pe bhi aur
 * ₹45,000 wale pe bhi. Screen pe iski chetavni likhi hai, kyunki field dekh kar ye baat
 * pata nahi chalti aur galti chup-chaap live chali jaati hai.
 *
 * **Button ka URL hi is section ki wajah hai.** Design me "Get this itinerary" `#enquiry`
 * pe jaata hai aur wo form abhi bana nahi (Q-2). Client: _"abhi fields bana do jisse bad
 * me bhej sake."_ Jis din form bane, sirf ek value badlegi — D-30 ka precedent.
 */

const VARIANT_LABELS = { outline: 'Outline', primary: 'Primary', accent: 'Accent' }

/** Khaali card — naye instance pe `ctaSection` `{}` hota hai. */
const EMPTY = {
  enabled: false,
  badge: '',
  heading: '',
  bullets: [],
  boxTitle: '',
  boxNote: '',
  buttons: [],
}

const blankButton = () => ({
  label: '',
  url: '',
  target: '_self',
  variant: 'accent',
  enabled: true,
})

export default function CtaSection() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [cta, setCta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setCta({ ...EMPTY, ...(res.data.data.settings.ctaSection ?? {}) }))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const set = (key, value) => setCta((c) => ({ ...c, [key]: value }))

  const setButton = (index, patch) =>
    setCta((c) => ({
      ...c,
      buttons: c.buttons.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    /** Wahi schema jo server use karta hai (R8) — galti yahin pakdi jaaye, 400 se pehle. */
    const parsed = updateSettingsSchema.safeParse({ ctaSection: cta })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      const res = await api.patch('/settings', { ctaSection: cta })
      setCta({ ...EMPTY, ...(res.data.data.settings.ctaSection ?? {}) })
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!cta) {
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

      <p className="subtitle">
        The closing card at the bottom of the page. Everything here is plain text — nothing is
        pulled from a package.
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
            <h2>CTA Section</h2>
          </div>
          <div className="panel-body">
            <div className="field">
              <label className="inline-lbl">
                <input
                  type="checkbox"
                  checked={cta.enabled}
                  onChange={(e) => set('enabled', e.target.checked)}
                  disabled={!canEdit}
                />
                Show this section
              </label>
              <div className="hint">Turn it off and the card does not render at all.</div>
            </div>

            <div className="field">
              <label>Badge</label>
              <input
                className="inp"
                placeholder="Planning open for 2026 season"
                value={cta.badge}
                onChange={(e) => set('badge', e.target.value)}
                disabled={!canEdit}
              />
              <div className="hint">The small pill above the heading. Leave empty to hide it.</div>
            </div>

            <div className="field">
              <label>Heading</label>
              <input
                className="inp"
                placeholder="Want this trip on your dates?"
                value={cta.heading}
                onChange={(e) => set('heading', e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div className="field">
              <label>
                Bullets <span className="muted">(one per line, max {MAX_CTA_BULLETS})</span>
              </label>
              <textarea
                className="ta"
                rows={4}
                placeholder={'The same day-by-day plan, priced for your dates\nFerry seats held…'}
                value={cta.bullets.join('\n')}
                onChange={(e) =>
                  set(
                    'bullets',
                    e.target.value
                      .split('\n')
                      /**
                       * Khaali lines yahan **nahi** girtin — girane pe user ke beech me
                       * Enter dabate hi uski line gayab ho jaati aur cursor kood jaata.
                       * Chhanni Save pe lagti hai (neeche) aur server pe bhi.
                       */
                      .slice(0, MAX_CTA_BULLETS),
                  )
                }
                onBlur={() => set('bullets', cta.bullets.map((b) => b.trim()).filter(Boolean))}
                disabled={!canEdit}
              />
              <div className="hint">Each line gets a tick icon on the page.</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Box</h2>
          </div>
          <div className="panel-body">
            {/*
             * Ye chetavni field dekh kar pata nahi chalti, isliye likhi hui hai.
             *
             * Design me yahan package ka daam aata tha. Ab ye site-wide static text hai —
             * yaani jo yahan likha jaayega wo **har** page pe wahi rahega. Pakka daam
             * likhna is card ki sabse aasan galti hai.
             */}
            <div className="notice" role="note">
              <span>
                This box shows the same text on every page — it is not taken from a package. Avoid
                writing an exact price here.
              </span>
            </div>

            <div className="row2">
              <div className="field">
                <label>Box title</label>
                <input
                  className="inp"
                  placeholder="Plan with us"
                  value={cta.boxTitle}
                  onChange={(e) => set('boxTitle', e.target.value)}
                  disabled={!canEdit}
                />
                <div className="hint">The big line. Leave empty to hide the whole box.</div>
              </div>
              <div className="field">
                <label>Box note</label>
                <input
                  className="inp"
                  placeholder="per person, twin sharing"
                  value={cta.boxNote}
                  onChange={(e) => set('boxNote', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Buttons</h2>
            <span className="muted">
              {cta.buttons.length} / {MAX_CTA_BUTTONS}
            </span>
          </div>
          <div className="panel-body">
            {cta.buttons.length === 0 && <p className="muted">No buttons yet. Add one below.</p>}

            {cta.buttons.map((button, index) => (
              <div className="field" key={index}>
                <div className="row3">
                  <div className="field">
                    <label>Label</label>
                    <input
                      className="inp"
                      placeholder="Get this itinerary"
                      value={button.label}
                      onChange={(e) => setButton(index, { label: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="field">
                    <label>Link</label>
                    <input
                      className="inp"
                      placeholder="/contact or tel:+919810066496"
                      value={button.url}
                      onChange={(e) => setButton(index, { url: e.target.value })}
                      disabled={!canEdit}
                    />
                    <div className="hint">Empty link means the button is not shown.</div>
                  </div>
                  <div className="field">
                    <label>Style</label>
                    <select
                      className="sel"
                      value={button.variant}
                      onChange={(e) => setButton(index, { variant: e.target.value })}
                      disabled={!canEdit}
                    >
                      {BUTTON_VARIANTS.map((v) => (
                        <option key={v} value={v}>
                          {VARIANT_LABELS[v] ?? v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {canEdit && (
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    onClick={() => {
                      if (!confirmRemove(button.label || `Button ${index + 1}`)) return
                      set(
                        'buttons',
                        cta.buttons.filter((_, i) => i !== index),
                      )
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {canEdit && cta.buttons.length < MAX_CTA_BUTTONS && (
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => set('buttons', [...cta.buttons, blankButton()])}
              >
                Add button
              </button>
            )}
          </div>

          {canEdit && (
            <div className="panel-foot">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </form>
    </>
  )
}
