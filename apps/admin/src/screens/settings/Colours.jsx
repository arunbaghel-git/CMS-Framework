import {
  THEME_ADVANCED_COLORS,
  THEME_COLOR_DEFAULTS,
  THEME_HEADING_KEYS,
  autoThemeColor,
  mixColors,
  normalizeThemeColors,
  readableOn,
  resolveThemeColor,
  themeColorsSchema,
} from '@cms/shared'
import { useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * `Settings ▸ Colours` — client, 17 Sep. Reference: `admin-design-v4.html` (`#t-colors`).
 *
 * Upar **6 rang**; baaki sab unse apne aap. **Advanced** me har cheez Auto — tick hatao tabhi apna rang.
 * Formula, defaults aur "sirf badla hua emit" ka niyam `packages/shared/src/theme-colors.js` me hai;
 * ye screen aur site dono wahi padhte hain, isliye preview aur site alag nahi ho sakte.
 *
 * ⚠️ Preview Auto shade **formula se** dikhata hai. Jo rang default hai uske liye site pe `globals.css` ka
 * apna (hath se tune kiya) shade chalta hai — isliye yahan ka grey/border site se ek-do shade alag dikh
 * sakta hai. Badla hua rang dono jagah ek hi formula se banta hai.
 */

const BASE_FIELDS = [
  {
    group: 'Brand',
    key: 'primary',
    label: 'Store Colour',
    shades: true,
    hint: 'Links, badges, secondary buttons. Lighter and darker shades are made from it.',
  },
  {
    group: 'Brand',
    key: 'accent',
    label: 'Accent',
    shades: true,
    hint: 'Your main call-to-action buttons — Enquire, Book, Get a quote.',
  },
  { group: 'Text', key: 'heading', label: 'Headings' },
  {
    group: 'Text',
    key: 'body',
    label: 'Body text',
    hint: 'Grey small text and border lines are made from this.',
  },
  { group: 'Backgrounds', key: 'page', label: 'Page background' },
  {
    group: 'Backgrounds',
    key: 'dark',
    label: 'Dark sections',
    hint: 'Hero banners, footer and other dark blocks.',
  },
]

const HEX = /^#[0-9a-f]{6}$/i

/** Picker + hex box. Hex adhoora type karte waqt value nahi badalti — poora aur sahi hone pe hi. */
function Swatch({ label, value, onChange, disabled }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  const bad = !HEX.test(draft)

  return (
    <div className="swatch">
      <input
        type="color"
        value={value}
        aria-label={label}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        className={`inp${bad ? ' bad' : ''}`}
        value={draft}
        maxLength={7}
        aria-label={`${label} hex`}
        disabled={disabled}
        onChange={(e) => {
          let v = e.target.value.trim()
          if (v && v[0] !== '#') v = `#${v}`
          setDraft(v)
          if (HEX.test(v)) onChange(v.toLowerCase())
        }}
      />
    </div>
  )
}

function Shades({ colour }) {
  const list = [
    mixColors(colour, '#ffffff', 0.92),
    mixColors(colour, '#ffffff', 0.8),
    mixColors(colour, '#ffffff', 0.4),
    colour,
    mixColors(colour, '#000000', 0.2),
    mixColors(colour, '#000000', 0.45),
  ]
  return (
    <div className="shades" aria-hidden="true">
      {list.map((c, i) => (
        <span key={i} style={{ background: c }} title={c} />
      ))}
    </div>
  )
}

export default function Colours() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [colours, setColours] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setColours(normalizeThemeColors(res.data.data.settings.themeColors)))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  function update(patch) {
    setColours((c) => ({ ...c, ...patch }))
    setNotice(null)
  }

  function setAdvanced(key, value) {
    setColours((c) => {
      const advanced = { ...c.advanced }
      if (value === null) delete advanced[key]
      else advanced[key] = value
      return { ...c, advanced }
    })
    setNotice(null)
  }

  async function handleSave() {
    setError(null)
    setNotice(null)

    const body = {
      ...Object.fromEntries(Object.keys(THEME_COLOR_DEFAULTS).map((k) => [k, colours[k]])),
      perHeading: colours.perHeading,
      headings: colours.perHeading ? colours.headings : {},
      advanced: colours.advanced,
    }

    /** Wahi schema jo server chalata hai (R8). */
    const parsed = themeColorsSchema.safeParse(body)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)
    try {
      const res = await api.patch('/settings', { themeColors: parsed.data })
      setColours(normalizeThemeColors(res.data.data.settings.themeColors))
      setNotice('Saved. The site shows the new colours on the next page load.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!colours) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  const c = colours
  const r = (key) => resolveThemeColor(key, c)
  const headingColour = (h) => (c.perHeading ? c.headings[h] : c.heading)
  const onDark = readableOn(c.dark)

  let lastGroup = null
  let lastAdvGroup = null

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <SettingsTabs />

      <p className="subtitle">The colours of every page of your site.</p>

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

      <div className="edit-grid theme-grid">
        <div>
          <div className="panel">
            <div className="panel-head">
              <h2>Site Colours</h2>
              <span className="muted">6 colours</span>
            </div>
            <div className="panel-body color-rows">
              {BASE_FIELDS.map((f) => {
                const title = f.group !== lastGroup ? f.group : null
                lastGroup = f.group
                return (
                  <div key={f.key}>
                    {title && <div className="color-group-title">{title}</div>}
                    <div className="field">
                      <label>{f.label}</label>
                      <Swatch
                        label={f.label}
                        value={c[f.key]}
                        disabled={!canEdit}
                        onChange={(v) => update({ [f.key]: v })}
                      />
                      {f.shades && <Shades colour={c[f.key]} />}
                      {f.hint && <div className="hint">{f.hint}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <button
                className="adv-toggle"
                type="button"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((o) => !o)}
              >
                <span aria-hidden="true">{advancedOpen ? '▾' : '▸'}</span> Advanced
              </button>
              <span className="muted">Everything is automatic until you untick Auto</span>
            </div>

            {advancedOpen && (
              <div className="panel-body color-rows">
                {THEME_ADVANCED_COLORS.map((f) => {
                  const title = f.group !== lastAdvGroup ? f.group : null
                  lastAdvGroup = f.group
                  const isAuto = !(f.key in c.advanced)
                  return (
                    <div key={f.key}>
                      {title && <div className="color-group-title">{title}</div>}

                      {/* "Har heading ka alag rang" — Text group ke aakhir me, jaisa reference me */}
                      {f.key === 'headerBg' && (
                        <div className="per-heading">
                          <label className="inline-lbl">
                            <input
                              type="checkbox"
                              checked={c.perHeading}
                              disabled={!canEdit}
                              onChange={(e) =>
                                update({
                                  perHeading: e.target.checked,
                                  headings: Object.fromEntries(
                                    THEME_HEADING_KEYS.map((h) => [h, c.heading]),
                                  ),
                                })
                              }
                            />{' '}
                            Use a different colour for each heading (H1 – H6)
                          </label>
                          {c.perHeading && (
                            <div className="color-sub">
                              {THEME_HEADING_KEYS.map((h) => (
                                <div className="field" key={h}>
                                  <label>{h.toUpperCase()}</label>
                                  <Swatch
                                    label={h.toUpperCase()}
                                    value={c.headings[h]}
                                    disabled={!canEdit}
                                    onChange={(v) =>
                                      update({ headings: { ...c.headings, [h]: v } })
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="field">
                        <label>{f.label}</label>
                        <div className={`swatch-row${isAuto ? ' is-auto' : ''}`}>
                          <label className="auto-lbl">
                            <input
                              type="checkbox"
                              checked={isAuto}
                              disabled={!canEdit}
                              onChange={(e) =>
                                setAdvanced(
                                  f.key,
                                  e.target.checked ? null : autoThemeColor(f.key, c),
                                )
                              }
                            />{' '}
                            Auto
                          </label>
                          <Swatch
                            label={f.label}
                            value={r(f.key)}
                            disabled={!canEdit || isAuto}
                            onChange={(v) => setAdvanced(f.key, v)}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="panel theme-preview-panel">
          <div className="panel-head">
            <h2>Preview</h2>
          </div>
          <div className="panel-body">
            <style>{`
              .cprev .cp-btn--p{background:${r('btnPrimaryBg')};color:${r('btnPrimaryText')};border-color:${r('btnPrimaryBg')}}
              .cprev .cp-btn--p:hover{background:${r('btnPrimaryHoverBg')};color:${r('btnPrimaryHoverText')};border-color:${r('btnPrimaryHoverBg')}}
              .cprev .cp-btn--s{background:${r('btnSecondaryBg')};color:${r('btnSecondaryText')};border-color:${r('btnSecondaryBg')}}
              .cprev .cp-btn--s:hover{background:${r('btnSecondaryHoverBg')};color:${r('btnSecondaryHoverText')};border-color:${r('btnSecondaryHoverBg')}}
              .cprev .cp-btn--o{background:transparent;color:${r('btnOutline')};border-color:${r('btnOutline')}}
            `}</style>
            <div className="cprev">
              <div
                className="cp-head"
                style={{
                  background: r('headerBg'),
                  color: r('headerText'),
                  borderBottom: `1px solid ${r('border')}`,
                }}
              >
                <span className="cp-logo">Your Logo</span>
                <span className="cp-nav">
                  <span>Tours</span>
                  <span>Blog</span>
                  <span>Contact</span>
                </span>
              </div>
              <div className="cp-hero" style={{ background: c.dark, color: onDark }}>
                <h1 style={{ color: c.perHeading ? c.headings.h1 : onDark }}>
                  Island escape — 6 nights
                </h1>
                <p>Hotels, transfers and sightseeing in one plan.</p>
                <span className="cp-btn cp-btn--p">Enquire Now</span>
              </div>
              <div className="cp-body" style={{ background: c.page }}>
                <div
                  className="cp-card"
                  style={{ background: r('card'), borderColor: r('border') }}
                >
                  <span
                    className="cp-badge"
                    style={{
                      background: mixColors(c.primary, '#ffffff', 0.88),
                      color: mixColors(c.primary, '#000000', 0.2),
                    }}
                  >
                    Best seller
                  </span>{' '}
                  <span style={{ color: r('star') }}>★★★★★</span>
                  <h3 style={{ color: headingColour('h3') }}>Havelock &amp; Neil Island</h3>
                  <p style={{ color: c.body }}>
                    Crystal-clear water, white-sand beaches and coral reefs, with private transfers.
                  </p>
                  <div className="cp-meta" style={{ color: r('muted') }}>
                    5 Nights · 6 Days · Updated Aug 2026
                  </div>
                </div>
                <span className="cp-btn cp-btn--s">View Itinerary</span>
                <span className="cp-btn cp-btn--o">Compare</span>
                <div className="cp-status">
                  <span style={{ color: r('success') }}>✓ Enquiry sent</span>
                  <span style={{ color: r('error') }}>✕ Phone is required</span>
                </div>
              </div>
              <div
                className="cp-foot"
                style={{ background: r('footerBg'), color: r('footerText') }}
              >
                © Your Company · Privacy · Terms
              </div>
            </div>
            <div className="hint">Hover over the buttons to see the hover colours</div>
          </div>

          {canEdit && (
            <div className="panel-foot">
              <button
                className="btn btn-sm btn-plain"
                type="button"
                onClick={() => {
                  setColours(normalizeThemeColors({}))
                  setNotice('Defaults restored — press Save to apply them.')
                }}
              >
                Reset to Defaults
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
