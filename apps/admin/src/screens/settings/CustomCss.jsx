import { updateSettingsSchema } from '@cms/shared'
import { useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * `Settings ▸ Custom CSS` — site ki apni CSS (client, 16 Sep, D-96 §25).
 *
 * `Custom editor` block me client apna HTML likhta hai, par uski CSS wahan likhi hi nahi ja sakti:
 * sanitizer `<style>` ka poora content gira deta hai (R20). Isliye CSS yahan rehti hai aur theme use
 * **har page** ke `<head>` me daalti hai — client ka faisla: _"poori site par"_.
 *
 * ⚠️ Save karte hi live ho jaati hai (settings ka cache tag pehle se saaf hota hai), isliye yahan ki
 * ek galti poori site pe dikhti hai. Isiliye hint me ye saaf likha hai.
 */
export default function CustomCss() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [css, setCss] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setCss(res.data.data.settings.customCss ?? ''))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    /** Wahi schema jo server use karta hai (R8) — `</style` ki rok yahin dikh jaati hai, 400 se pehle. */
    const parsed = updateSettingsSchema.safeParse({ customCss: css })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      const res = await api.patch('/settings', { customCss: css })
      setCss(res.data.data.settings.customCss ?? '')
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (css === null) {
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

      <p className="subtitle">Your own CSS, added to every page of the site.</p>

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
            <h2>Custom CSS</h2>
          </div>
          <div className="panel-body">
            <div className="field">
              <label htmlFor="customCss">CSS</label>
              <textarea
                id="customCss"
                className="inp css-box"
                rows={22}
                spellCheck={false}
                value={css}
                onChange={(e) => setCss(e.target.value)}
                disabled={!canEdit}
                placeholder={'.home-offer-strip {\n  background: #f2f8fd;\n}'}
              />
              <div className="hint">
                Written straight into every page, so a mistake here shows on the whole site. Use it
                for the <b>Custom editor</b> blocks — give a block a CSS class, then style it here.
                Only CSS, no <code>&lt;style&gt;</code> tags.
              </div>
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
