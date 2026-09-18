import {
  THEME_LAYOUT_DEFAULTS,
  THEME_LAYOUT_LIMITS,
  logoLimit,
  normalizeThemeLayout,
  themeLayoutSchema,
} from '@cms/shared'
import { useEffect, useRef, useState } from 'react'

import Panel from '../../components/admin/Panel.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * `Settings ▸ Layout` — client, 17 Sep. Reference: `admin-design-v4.html` (`#t-layout`).
 *
 * Chaudai, side space, kone, shadow, button, header height + logo, footer logo. Hadd aur defaults
 * `packages/shared/src/theme-layout.js` me — schema, site ka CSS aur yahan ke khaane sab wahi padhte hain.
 *
 * ⚠️ Breakpoints (1024 / 767) jaan-boojh kar nahi — CSS media query me variable nahi chalta.
 */

const RADIUS = { sharp: 0, soft: 8, round: 16 }
const SHADOW = {
  none: 'none',
  soft: '0 1px 3px rgb(17 29 43 / 8%), 0 4px 12px -4px rgb(17 29 43 / 10%)',
  strong: '0 10px 28px -8px rgb(17 29 43 / 28%)',
}

function NumberField({ label, name, value, onChange, disabled, hint, hintBad, width }) {
  const [min, max] = THEME_LAYOUT_LIMITS[name]
  return (
    <div className="field">
      <label htmlFor={`lay-${name}`}>{label}</label>
      <input
        id={`lay-${name}`}
        className="inp"
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        style={width ? { maxWidth: width } : undefined}
        onChange={(e) => onChange(name, e.target.value === '' ? '' : Number(e.target.value))}
      />
      {hint && (
        <div className="hint" style={hintBad ? { color: 'var(--danger)' } : undefined}>
          {hint}
        </div>
      )}
    </div>
  )
}

function Choice({ name, value, options, onChange, disabled }) {
  return (
    <div className="choice-row" role="radiogroup">
      {options.map((o) => (
        <label key={o.value} className={`choice${value === o.value ? ' on' : ''}`}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            disabled={disabled}
            onChange={() => onChange(name, o.value)}
          />
          <div className="demo" style={o.demo} />
          {o.label}
        </label>
      ))}
    </div>
  )
}

export default function Layout() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [layout, setLayout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [device, setDevice] = useState('desktop')

  const previewRef = useRef(null)
  const [previewWidth, setPreviewWidth] = useState(460)

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setLayout(normalizeThemeLayout(res.data.data.settings.themeLayout)))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  /** Scaled preview ko apni asli chaudai chahiye — resize pe bhi. */
  useEffect(() => {
    const el = previewRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(() => setPreviewWidth(el.clientWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [layout === null])

  const set = (key, value) => {
    setLayout((l) => ({ ...l, [key]: value }))
    setNotice(null)
  }

  /** Mobile wale khaane pe click → header/footer preview mobile pe (reference jaisa). */
  const onFocus = (e) => {
    const d = e.target.closest('[data-dev]')?.dataset.dev
    if (d) setDevice(d)
  }

  async function handleSave() {
    setError(null)
    setNotice(null)

    const parsed = themeLayoutSchema.safeParse(layout)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setError(`${issue.path.join('.')}: ${issue.message}`)
      return
    }

    setSaving(true)
    try {
      const res = await api.patch('/settings', { themeLayout: parsed.data })
      setLayout(normalizeThemeLayout(res.data.data.settings.themeLayout))
      setNotice('Saved. The site shows the new layout on the next page load.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!layout) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  const l = layout
  const n = (v, fallback) => (Number.isFinite(v) ? v : fallback)
  const disabled = !canEdit

  // ── preview ka hisaab ──
  const scale = previewWidth / 1600
  const radius = RADIUS[l.corners]
  const mob = device === 'mobile'
  const headH = n(mob ? l.headerHMobile : l.headerH, 64)
  const logoH = Math.min(n(mob ? l.logoHMobile : l.logoH, 34), logoLimit(headH))
  const footH = n(mob ? l.footLogoHMobile : l.footLogoH, 34)
  const logoW = (h, max) => (max > 0 ? Math.min(Math.round(h * 3.6), max) : Math.round(h * 3.6))

  const logoHint = (key, header) => {
    const max = logoLimit(n(header, 64))
    const v = n(l[key], 0)
    return v > max
      ? { text: `Too tall for the header — it will show at ${max}px.`, bad: true }
      : { text: `Up to ${max}px fits this header.`, bad: false }
  }
  const logoDesk = logoHint('logoH', l.headerH)
  const logoMob = logoHint('logoHMobile', l.headerHMobile)

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <SettingsTabs />

      <p className="subtitle">
        Width, spacing, corners and the header of every page. Tablet is 1024px and below, mobile is
        767px and below — the same for every site.
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

      <div className="edit-grid theme-grid">
        <div onFocus={onFocus}>
          <Panel title="Page Width">
            <div className="panel-body">
              <div className="field">
                <label htmlFor="lay-wrap-range">Site max width (px)</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    id="lay-wrap-range"
                    type="range"
                    min={THEME_LAYOUT_LIMITS.wrap[0]}
                    max={THEME_LAYOUT_LIMITS.wrap[1]}
                    step={10}
                    value={n(l.wrap, 1280)}
                    disabled={disabled}
                    style={{ flex: 1 }}
                    onChange={(e) => set('wrap', Number(e.target.value))}
                  />
                  <input
                    className="inp"
                    type="number"
                    aria-label="Site max width in px"
                    min={THEME_LAYOUT_LIMITS.wrap[0]}
                    max={THEME_LAYOUT_LIMITS.wrap[1]}
                    value={l.wrap}
                    disabled={disabled}
                    style={{ width: 90 }}
                    onChange={(e) =>
                      set('wrap', e.target.value === '' ? '' : Number(e.target.value))
                    }
                  />
                </div>
                <div className="hint">
                  How wide the content gets on large screens. Backgrounds still stretch edge to
                  edge.
                </div>
              </div>
              <div className="row2">
                <NumberField
                  label="Side space — desktop (px)"
                  name="pad"
                  value={l.pad}
                  onChange={set}
                  disabled={disabled}
                />
                <NumberField
                  label="Side space — mobile (px)"
                  name="padMobile"
                  value={l.padMobile}
                  onChange={set}
                  disabled={disabled}
                />
              </div>
            </div>
          </Panel>

          {/*
           * Spacing (client, 18 Sep). Single content card ke andar ka gap Block spacing ke saath chalta
           * hai — uska apna khaana jaan-boojh kar nahi (theme-layout.js `BLOCK_IN_RATIO`).
           */}
          <Panel title="Spacing">
            <div className="panel-body">
              <div className="row2">
                <NumberField
                  label="Section spacing — desktop (px)"
                  name="spaceSection"
                  value={l.spaceSection}
                  onChange={set}
                  disabled={disabled}
                />
                <NumberField
                  label="Section spacing — mobile (px)"
                  name="spaceSectionMobile"
                  value={l.spaceSectionMobile}
                  onChange={set}
                  disabled={disabled}
                />
              </div>
              <div className="hint group-hint">
                Space above and below each full-width section on the Home page.
              </div>
              <div className="row2">
                <NumberField
                  label="Block spacing — desktop (px)"
                  name="spaceBlock"
                  value={l.spaceBlock}
                  onChange={set}
                  disabled={disabled}
                />
                <NumberField
                  label="Block spacing — mobile (px)"
                  name="spaceBlockMobile"
                  value={l.spaceBlockMobile}
                  onChange={set}
                  disabled={disabled}
                />
              </div>
              <div className="hint group-hint">
                Space between blocks on Package, Tour and other pages — between separate cards, and
                inside a single content card.
              </div>
              <div className="row2">
                <NumberField
                  label="Cards gap — rows (px)"
                  name="cardGapRow"
                  value={l.cardGapRow}
                  onChange={set}
                  disabled={disabled}
                />
                <NumberField
                  label="Cards gap — columns (px)"
                  name="cardGapCol"
                  value={l.cardGapCol}
                  onChange={set}
                  disabled={disabled}
                />
              </div>
              <div className="hint group-hint">
                Space between cards in every card grid — rows is the space above and below, columns
                is the space side by side.
              </div>
            </div>
          </Panel>

          <Panel title="Corners & Shadows">
            <div className="panel-body">
              <div className="field">
                <label>Corner style</label>
                <Choice
                  name="corners"
                  value={l.corners}
                  onChange={set}
                  disabled={disabled}
                  options={[
                    { value: 'sharp', label: 'Sharp', demo: { borderRadius: 0 } },
                    { value: 'soft', label: 'Soft', demo: { borderRadius: 6 } },
                    { value: 'round', label: 'Round', demo: { borderRadius: 14 } },
                  ]}
                />
                <div className="hint">Cards, images, boxes and inputs all follow this.</div>
              </div>
              <div className="field">
                <label>Shadows</label>
                <Choice
                  name="shadow"
                  value={l.shadow}
                  onChange={set}
                  disabled={disabled}
                  options={[
                    { value: 'none', label: 'None', demo: { background: '#fff' } },
                    {
                      value: 'soft',
                      label: 'Soft',
                      demo: { background: '#fff', boxShadow: '0 2px 8px rgb(17 29 43 / 12%)' },
                    },
                    {
                      value: 'strong',
                      label: 'Strong',
                      demo: {
                        background: '#fff',
                        boxShadow: '0 10px 26px -8px rgb(17 29 43 / 35%)',
                      },
                    },
                  ]}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Buttons">
            <div className="panel-body row2">
              <NumberField
                label="Button height (px)"
                name="btnHeight"
                value={l.btnHeight}
                onChange={set}
                disabled={disabled}
              />
              <div className="field">
                <label htmlFor="lay-btnShape">Button shape</label>
                <select
                  id="lay-btnShape"
                  className="sel"
                  value={l.btnShape}
                  disabled={disabled}
                  onChange={(e) => set('btnShape', e.target.value)}
                >
                  <option value="corners">Same as corner style</option>
                  <option value="pill">Pill (fully round)</option>
                </select>
              </div>
            </div>
          </Panel>

          <Panel title="Header">
            <div className="panel-body">
              <div className="row2">
                <div data-dev="desktop">
                  <NumberField
                    label="Header height — desktop (px)"
                    name="headerH"
                    value={l.headerH}
                    onChange={set}
                    disabled={disabled}
                  />
                </div>
                <div data-dev="mobile">
                  <NumberField
                    label="Header height — mobile (px)"
                    name="headerHMobile"
                    value={l.headerHMobile}
                    onChange={set}
                    disabled={disabled}
                  />
                </div>
                <div data-dev="desktop">
                  <NumberField
                    label="Logo height — desktop (px)"
                    name="logoH"
                    value={l.logoH}
                    onChange={set}
                    disabled={disabled}
                    hint={logoDesk.text}
                    hintBad={logoDesk.bad}
                  />
                </div>
                <div data-dev="mobile">
                  <NumberField
                    label="Logo height — mobile (px)"
                    name="logoHMobile"
                    value={l.logoHMobile}
                    onChange={set}
                    disabled={disabled}
                    hint={logoMob.text}
                    hintBad={logoMob.bad}
                  />
                </div>
              </div>
              <NumberField
                label="Logo max width (px)"
                name="logoMaxW"
                value={l.logoMaxW}
                onChange={set}
                disabled={disabled}
                width={160}
                hint="0 means no limit. Only matters for very wide logos — the width otherwise follows the height."
              />
              <label className="inline-lbl">
                <input
                  type="checkbox"
                  checked={l.sticky}
                  disabled={disabled}
                  onChange={(e) => set('sticky', e.target.checked)}
                />{' '}
                Keep the header on screen while scrolling
              </label>
            </div>
          </Panel>

          <Panel title="Footer">
            <div className="panel-body">
              <div className="row2">
                <div data-dev="desktop">
                  <NumberField
                    label="Footer logo height — desktop (px)"
                    name="footLogoH"
                    value={l.footLogoH}
                    onChange={set}
                    disabled={disabled}
                  />
                </div>
                <div data-dev="mobile">
                  <NumberField
                    label="Footer logo height — mobile (px)"
                    name="footLogoHMobile"
                    value={l.footLogoHMobile}
                    onChange={set}
                    disabled={disabled}
                  />
                </div>
              </div>
              <NumberField
                label="Footer logo max width (px)"
                name="footLogoMaxW"
                value={l.footLogoMaxW}
                onChange={set}
                disabled={disabled}
                width={160}
                hint="0 means no limit. The mobile menu shows this logo too."
              />
              <label className="inline-lbl">
                <input
                  type="checkbox"
                  checked={l.footLogoCard}
                  disabled={disabled}
                  onChange={(e) => set('footLogoCard', e.target.checked)}
                />{' '}
                Show a white box behind the footer logo
              </label>
              <div className="hint">
                Turn this off if your footer logo is already made for a dark background.
              </div>
            </div>
          </Panel>
        </div>

        <div className="panel theme-preview-panel">
          <div className="panel-head">
            <h2>Preview</h2>
            <span className="muted">A 1600px wide screen, scaled down</span>
          </div>
          <div className="panel-body">
            <div className="lprev" ref={previewRef}>
              <div className="lp-wrap" style={{ maxWidth: Math.round(n(l.wrap, 1280) * scale) }}>
                <div
                  className="lp-in"
                  style={{ padding: `12px ${Math.max(4, Math.round(n(l.pad, 26) * scale * 2))}px` }}
                >
                  {['Havelock & Neil Island', 'Port Blair City Tour'].map((t, i) => (
                    <div
                      key={t}
                      className="lp-card"
                      style={{ borderRadius: radius, boxShadow: SHADOW[l.shadow] }}
                    >
                      <b>{t}</b>
                      {i === 0 ? '5 Nights · 6 Days' : '1 Day'}
                    </div>
                  ))}
                  <span
                    className="lp-btn"
                    style={{
                      height: Math.round(n(l.btnHeight, 44) * 0.8),
                      borderRadius: l.btnShape === 'pill' ? 999 : radius,
                    }}
                  >
                    Enquire Now
                  </span>
                </div>
              </div>
              <div className="lp-width">
                Content {l.wrap}px wide · side space {l.pad}px (mobile {l.padMobile}px)
              </div>
            </div>

            <div className="hf-bar">
              <b>
                Header &amp; footer <span className="muted">— real size</span>
              </b>
              <div className="device-toggle">
                {['desktop', 'mobile'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={device === d ? 'on' : ''}
                    onClick={() => setDevice(d)}
                  >
                    {d === 'desktop' ? 'Desktop' : 'Mobile'}
                  </button>
                ))}
              </div>
            </div>
            <div className={`hfprev${mob ? ' is-mobile' : ''}`}>
              <div className="hf-head" style={{ minHeight: headH }}>
                <span
                  className="hf-logo"
                  style={{ height: logoH, width: logoW(logoH, l.logoMaxW) }}
                >
                  LOGO
                </span>
                {mob ? (
                  <span className="hf-burger">☰</span>
                ) : (
                  <span className="hf-nav">
                    <span>Tours</span>
                    <span>Blog</span>
                    <span>Contact</span>
                  </span>
                )}
              </div>
              <div className="hf-body" />
              <div className="hf-foot">
                <span className={`hf-card${l.footLogoCard ? '' : ' is-bare'}`}>
                  <span
                    className="hf-logo"
                    style={{ height: footH, width: logoW(footH, l.footLogoMaxW) }}
                  >
                    FOOTER LOGO
                  </span>
                </span>
              </div>
              <div className="hf-size">
                {mob ? 'Mobile' : 'Desktop'} · header {headH}px · logo {logoH}px · footer logo{' '}
                {footH}px
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="panel-foot">
              <button
                className="btn btn-sm btn-plain"
                type="button"
                onClick={() => {
                  setLayout({ ...THEME_LAYOUT_DEFAULTS })
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
