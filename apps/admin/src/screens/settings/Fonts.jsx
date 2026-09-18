import {
  DEFAULT_FONT_FAMILY,
  FONT_SCALE_STEPS,
  FONT_WEIGHTS,
  defaultThemeFonts,
  normalizeThemeFonts,
  themeFontsSchema,
} from '@cms/shared'
import { useEffect, useState } from 'react'

import Panel from '../../components/admin/Panel.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { confirmRemove } from '../../lib/confirm.js'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * `Settings ▸ Fonts` — client, 17 Sep. Reference: `admin-design-v4.html` (`#t-fonts`).
 *
 * - **Heading Font / Body Font** — Google (naam likho) ya Custom (WOFF/WOFF2 upload). Google font Save pe
 *   **server download karta hai** — visitor Google se kuch nahi maangta. Isliye Save thoda ruk sakta hai
 * - **Text Sizes** — 9 step, har ek ke neeche likha hai site pe kahan lagta hai (`FONT_SCALE_STEPS.used`)
 *
 * ⚠️ Preview **admin ke browser** me Google se font khinchta hai (sirf dekhne ke liye) — site pe nahi.
 */

const GOOGLE_SUGGESTIONS = [
  'Inter',
  'Poppins',
  'Montserrat',
  'DM Sans',
  'Open Sans',
  'Roboto',
  'Lato',
  'Nunito',
  'Raleway',
  'Work Sans',
  'Manrope',
  'Playfair Display',
  'Lora',
  'Merriweather',
  'Cormorant Garamond',
  'Libre Baskerville',
  'DM Serif Display',
]

const WEIGHT_NAMES = {
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
}

const DEVICES = {
  desktop: { key: 'size', width: '' },
  tablet: { key: 'sizeTablet', width: '768px' },
  mobile: { key: 'sizeMobile', width: '375px' },
}

const PREVIEW_KEY = 'cms.fonts.previewText'

function readPreviewText() {
  try {
    return JSON.parse(localStorage.getItem(PREVIEW_KEY)) ?? null
  } catch {
    return null
  }
}

/** Preview ke liye font browser me laao — Google `<link>`, custom `FontFace`. Ek family ek hi baar. */
const loaded = new Set()
function usePreviewFamily(slot, fallbackName) {
  const name =
    slot.source === 'custom' ? slot.family || fallbackName : slot.google || DEFAULT_FONT_FAMILY

  useEffect(() => {
    /** Type karte waqt har akshar pe Google request nahi — thoda rukne ke baad hi */
    let timer
    if (slot.source === 'google' && slot.google && !loaded.has(`g:${slot.google}`)) {
      const family = slot.google
      timer = setTimeout(() => {
        loaded.add(`g:${family}`)
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ +/g, '+')}:wght@400;700&display=swap`
        document.head.appendChild(link)
      }, 700)
    }
    if (slot.source === 'custom') {
      for (const file of slot.files) {
        const id = `c:${name}:${file.url}:${file.weight}:${file.style}`
        if (loaded.has(id)) continue
        loaded.add(id)
        new FontFace(name, `url(${file.url})`, { weight: file.weight, style: file.style })
          .load()
          .then((face) => document.fonts.add(face))
          .catch(() => loaded.delete(id))
      }
    }
    return () => clearTimeout(timer)
  }, [slot.source, slot.google, slot.files, name])

  return name
}

function FontSlot({ title, note, slotKey, slot, onChange, disabled, onError }) {
  const [uploading, setUploading] = useState(false)
  const set = (patch) => onChange({ ...slot, ...patch })

  async function upload(fileList) {
    setUploading(true)
    onError(null)
    try {
      const added = []
      for (const file of fileList) {
        const body = new FormData()
        body.append('file', file)
        const res = await api.post('/settings/fonts', body)
        added.push(res.data.data.file)
      }
      set({ files: [...slot.files, ...added].slice(0, 12) })
    } catch (err) {
      onError(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Panel title={title} aside={<span className="muted">{note}</span>}>
      <div className="panel-body">
        <div className="font-src">
          {[
            ['google', 'Google Font'],
            ['custom', 'Custom font (WOFF / WOFF2)'],
          ].map(([value, label]) => (
            <label key={value} className="inline-lbl">
              <input
                type="radio"
                name={`src-${slotKey}`}
                checked={slot.source === value}
                disabled={disabled}
                onChange={() => set({ source: value })}
              />{' '}
              {label}
            </label>
          ))}
        </div>

        {slot.source === 'google' ? (
          <div className="field">
            <label htmlFor={`g-${slotKey}`}>Font name</label>
            <input
              id={`g-${slotKey}`}
              className="inp"
              list="google-font-list"
              placeholder="e.g. Poppins"
              value={slot.google}
              disabled={disabled}
              onChange={(e) => set({ google: e.target.value })}
            />
            <div className="hint">
              Type any family from{' '}
              <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer">
                fonts.google.com
              </a>
              . It is saved to your own site when you press Save, so visitors never load it from
              Google.
            </div>
          </div>
        ) : (
          <>
            <div className="field">
              <label htmlFor={`f-${slotKey}`}>Font family name</label>
              <input
                id={`f-${slotKey}`}
                className="inp"
                placeholder="e.g. Gilroy"
                value={slot.family}
                disabled={disabled}
                onChange={(e) => set({ family: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Font files</label>
              {!disabled && (
                <label className="featured-drop font-drop">
                  {uploading ? 'Uploading…' : 'Upload .woff2 / .woff — one file per weight'}
                  <input
                    type="file"
                    accept=".woff,.woff2"
                    multiple
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      const files = [...e.target.files]
                      e.target.value = ''
                      if (files.length) upload(files)
                    }}
                  />
                </label>
              )}
              {slot.files.length > 0 && (
                <ul className="font-files">
                  {slot.files.map((file, i) => (
                    <li key={file.url + i}>
                      <span className="fname">{file.name || file.url.split('/').pop()}</span>
                      <select
                        className="sel"
                        aria-label="Weight"
                        value={file.weight}
                        disabled={disabled}
                        onChange={(e) =>
                          set({
                            files: slot.files.map((f, j) =>
                              j === i ? { ...f, weight: e.target.value } : f,
                            ),
                          })
                        }
                      >
                        {FONT_WEIGHTS.map((w) => (
                          <option key={w} value={w}>
                            {w} {WEIGHT_NAMES[w]}
                          </option>
                        ))}
                      </select>
                      <select
                        className="sel"
                        aria-label="Style"
                        value={file.style}
                        disabled={disabled}
                        onChange={(e) =>
                          set({
                            files: slot.files.map((f, j) =>
                              j === i ? { ...f, style: e.target.value } : f,
                            ),
                          })
                        }
                      >
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                      </select>
                      {!disabled && (
                        <button
                          type="button"
                          className="btn-link del"
                          onClick={() => {
                            if (!confirmRemove(file.name || 'this font file')) return
                            set({ files: slot.files.filter((_, j) => j !== i) })
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}

export default function Fonts() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [fonts, setFonts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [device, setDevice] = useState('desktop')
  const [text, setText] = useState(
    () =>
      readPreviewText() ?? {
        heading: 'Island escape — 6 nights',
        body: 'Crystal-clear water, white-sand beaches and coral reefs, with private transfers between the islands.',
      },
  )

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setFonts(normalizeThemeFonts(res.data.data.settings.themeFonts)))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(PREVIEW_KEY, JSON.stringify(text))
    } catch {
      /* private window — preview ka text yaad na rahe to koi baat nahi */
    }
  }, [text])

  const headingFamily = usePreviewFamily(
    fonts?.heading ?? defaultThemeFonts().heading,
    'Custom heading',
  )
  const bodyFamily = usePreviewFamily(fonts?.body ?? defaultThemeFonts().body, 'Custom body')

  function setSlot(key, slot) {
    setFonts((f) => ({ ...f, [key]: slot }))
    setNotice(null)
  }

  function setStep(key, field, value) {
    setFonts((f) => ({ ...f, scale: { ...f.scale, [key]: { ...f.scale[key], [field]: value } } }))
    setNotice(null)
  }

  async function handleSave() {
    setError(null)
    setNotice(null)

    /** `faces` server ka hai — bhejte hi nahi. */
    const strip = ({ faces: _faces, ...slot }) => slot
    const body = { heading: strip(fonts.heading), body: strip(fonts.body), scale: fonts.scale }

    const parsed = themeFontsSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setError(`${issue.path.join(' › ')}: ${issue.message}`)
      return
    }

    setSaving(true)
    try {
      const res = await api.patch('/settings', { themeFonts: parsed.data })
      setFonts(normalizeThemeFonts(res.data.data.settings.themeFonts))
      setNotice('Saved. The site shows the new fonts on the next page load.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!fonts) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  const disabled = !canEdit
  const sizeKey = DEVICES[device].key
  let lastFamily = null

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <SettingsTabs />

      <p className="subtitle">
        Fonts and text sizes for every page of your site. Tablet is 1024px and below, mobile is
        767px and below.
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

      <datalist id="google-font-list">
        {GOOGLE_SUGGESTIONS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      <div className="edit-grid theme-grid">
        <FontSlot
          title="Heading Font"
          note="H1 – H6"
          slotKey="heading"
          slot={fonts.heading}
          disabled={disabled}
          onError={setError}
          onChange={(slot) => setSlot('heading', slot)}
        />
        <FontSlot
          title="Body Font"
          note="Body · Small · Extra small"
          slotKey="body"
          slot={fonts.body}
          disabled={disabled}
          onError={setError}
          onChange={(slot) => setSlot('body', slot)}
        />
      </div>

      <Panel title="Text Sizes" aside={<span className="muted">Font size in px</span>}>
        <div className="panel-body scale-wrap">
          <table className="scale">
            <thead>
              <tr>
                <th style={{ width: '26%' }}>Text</th>
                <th>Desktop</th>
                <th>Tablet</th>
                <th>Mobile</th>
                <th>Weight</th>
                <th>Line spacing</th>
                <th>Character spacing</th>
              </tr>
            </thead>
            <tbody>
              {FONT_SCALE_STEPS.flatMap((step) => {
                const v = fonts.scale[step.key]
                const rows = []
                if (step.family !== lastFamily) {
                  lastFamily = step.family
                  rows.push(
                    <tr className="group" key={`g-${step.family}`}>
                      <td colSpan={7}>
                        Uses {step.family === 'heading' ? 'Heading' : 'Body'} font
                      </td>
                    </tr>,
                  )
                }
                const num = (field, attrs) => (
                  <input
                    className="inp"
                    type="number"
                    aria-label={`${step.label} ${field}`}
                    value={v[field]}
                    disabled={disabled}
                    onFocus={() => {
                      if (field === 'size') setDevice('desktop')
                      if (field === 'sizeTablet') setDevice('tablet')
                      if (field === 'sizeMobile') setDevice('mobile')
                    }}
                    onChange={(e) =>
                      setStep(step.key, field, e.target.value === '' ? '' : Number(e.target.value))
                    }
                    {...attrs}
                  />
                )
                rows.push(
                  <tr key={step.key}>
                    <td className="step">
                      <b>{step.label}</b>
                      <span>{step.used}</span>
                    </td>
                    <td>{num('size', { min: 8, max: 120, step: 0.5 })}</td>
                    <td>{num('sizeTablet', { min: 8, max: 120, step: 0.5 })}</td>
                    <td>{num('sizeMobile', { min: 8, max: 120, step: 0.5 })}</td>
                    <td>
                      <select
                        className="sel"
                        aria-label={`${step.label} weight`}
                        value={v.weight}
                        disabled={disabled}
                        onChange={(e) => setStep(step.key, 'weight', e.target.value)}
                      >
                        {FONT_WEIGHTS.map((w) => (
                          <option key={w} value={w}>
                            {w} {WEIGHT_NAMES[w]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{num('lh', { min: 0.8, max: 3, step: 0.05 })}</td>
                    <td>{num('ls', { min: -5, max: 20, step: 0.1 })}</td>
                  </tr>,
                )
                return rows
              })}
            </tbody>
          </table>
          <div className="hint">
            Every heading, title and label on the site uses one of these. Change a row and all the
            places listed under it change together — size, weight, line spacing and character
            spacing. A few special texts (prices, stats, the big blog card title) keep their own
            size; Custom CSS can change those.
          </div>
        </div>
      </Panel>

      <div className="panel">
        <div className="panel-head">
          <h2>Preview</h2>
          <div className="device-toggle">
            {Object.keys(DEVICES).map((d) => (
              <button
                key={d}
                type="button"
                className={device === d ? 'on' : ''}
                onClick={() => setDevice(d)}
              >
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body">
          <div className="row2">
            <div className="field">
              <label htmlFor="fp-heading">Heading preview text</label>
              <input
                id="fp-heading"
                className="inp"
                value={text.heading}
                onChange={(e) => setText({ ...text, heading: e.target.value })}
              />
              <div className="hint">Shown for H1 – H6 below</div>
            </div>
            <div className="field">
              <label htmlFor="fp-body">Body preview text</label>
              <textarea
                id="fp-body"
                className="ta"
                value={text.body}
                onChange={(e) => setText({ ...text, body: e.target.value })}
              />
            </div>
          </div>

          <div className="font-preview" style={{ maxWidth: DEVICES[device].width || undefined }}>
            {FONT_SCALE_STEPS.map((step) => {
              const v = fonts.scale[step.key]
              const family = step.family === 'heading' ? headingFamily : bodyFamily
              const sample =
                step.family === 'heading'
                  ? text.heading || 'Heading'
                  : step.key === 'xsmall'
                    ? 'Best seller · 5N / 6D'
                    : text.body || 'Body text'
              return (
                <div className="fp-row" key={step.key}>
                  <span className="fp-tag">{step.label}</span>
                  <div
                    style={{
                      fontFamily: `"${family}", sans-serif`,
                      fontSize: `${Number(v[sizeKey]) || 0}px`,
                      fontWeight: v.weight,
                      lineHeight: v.lh,
                      letterSpacing: `${Number(v.ls) || 0}px`,
                    }}
                  >
                    {sample}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="hint">
            Preview text is only for trying out fonts here — it isn&rsquo;t published.
          </div>
        </div>
        {canEdit && (
          <div className="panel-foot">
            <button
              className="btn btn-sm btn-plain"
              type="button"
              onClick={() => {
                setFonts(normalizeThemeFonts(defaultThemeFonts()))
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
              {saving ? 'Saving… (downloading fonts)' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
