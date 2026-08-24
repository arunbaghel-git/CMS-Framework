import { useEffect, useState } from 'react'
import { FOOTER_MENU_LOCATION_IDS, SOCIAL_KEYS } from '@cms/shared'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import AppearanceTabs from './AppearanceTabs.jsx'
import './Appearance.css'

/**
 * Appearance → Footer.
 *
 * **Design me is tab ka koi content spec nahi hai** — `admin-design.html` me "Footer"
 * sirf ek tab ka label hai (`#s-appearance > .tabs`). Isliye yahan WordPress ko **sirf
 * UX reference** ki tarah liya gaya hai: ek simple settings panel. Uska data model ya UI
 * copy nahi hua.
 *
 * Scope jaan-boojh kar bahut chhota hai (spec 006 §7.2) — D-27 kehta hai "footer columns,
 * social links, copyright". Columns menu system se aate hain (isliye yahan sirf ek
 * pointer hai), social links `settings.social` me **pehle se** the, to naya field sirf ek
 * hai: `footerCopyright`.
 *
 * **Andaman-specific kuch nahi** — office addresses, support blocks, certification text
 * jaisi cheezein approved CMS scope me nahi hain.
 *
 * Screen Appearance ke neeche hai par likhti `settings` document me hai — UI ki jagah aur
 * storage ki jagah alag hone me koi dikkat nahi, aur isse naya collection ya nayi
 * permission nahi banani padti.
 */

const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube' }

export default function Footer() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setSettings(res.data.data.settings))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const setSocial = (key) => (e) => {
    const { value } = e.target
    setSettings((s) => ({ ...s, social: { ...s.social, [key]: value } }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      // Sirf is screen ke fields — poora settings object wapas bhejne se doosri screen
      // ka koi parallel change chup-chaap overwrite ho sakta hai.
      const res = await api.patch('/settings', {
        social: settings.social,
        footerCopyright: settings.footerCopyright,
      })

      setSettings(res.data.data.settings)
      setNotice('Footer settings saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>
  if (!settings) return <div className="notice notice-error">{error}</div>

  return (
    <>
      <div className="page-head">
        <h1>Appearance</h1>
      </div>
      <AppearanceTabs />

      {error && <div className="notice notice-error">{error}</div>}
      {notice && <div className="notice notice-success">{notice}</div>}

      <form onSubmit={handleSubmit}>
        <div className="panel">
          <div className="panel-head">
            <h2>Footer Columns</h2>
          </div>
          <div className="panel-body">
            <p className="hint">
              Footer columns are menus. Create them under Appearance → Menus and assign them to{' '}
              {FOOTER_MENU_LOCATION_IDS.length} footer locations there. Each column heading comes
              from the menu name.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Social Links</h2>
          </div>
          <div className="panel-body">
            <div className="row3">
              {SOCIAL_KEYS.map((key) => (
                <div className="field" key={key}>
                  <label htmlFor={`social-${key}`}>{SOCIAL_LABELS[key]}</label>
                  <input
                    id={`social-${key}`}
                    className="inp"
                    value={settings.social?.[key] ?? ''}
                    placeholder="https://"
                    disabled={!canEdit}
                    onChange={setSocial(key)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Copyright</h2>
          </div>
          <div className="panel-body">
            <div className="field">
              <label htmlFor="footer-copyright">Copyright text</label>
              <input
                id="footer-copyright"
                className="inp"
                value={settings.footerCopyright ?? ''}
                placeholder="© {year} Your Company. All rights reserved."
                disabled={!canEdit}
                onChange={(e) => setSettings((s) => ({ ...s, footerCopyright: e.target.value }))}
              />
              <p className="hint">
                Use {'{year}'} for the current year so this line never goes out of date.
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="panel-foot">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </form>
    </>
  )
}
