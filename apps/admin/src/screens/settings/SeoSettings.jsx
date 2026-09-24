import { DEFAULT_ROBOTS_TXT, DEFAULT_TITLE_TEMPLATE, updateSettingsSchema } from '@cms/shared'
import { useEffect, useState } from 'react'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useMediaById } from '../../lib/use-entries.js'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * `Settings ▸ SEO & Schema` — `Global SEO Defaults` (client, 24 Sep; `admin-design-v2.html:1414`).
 *
 * Reference ke chaar khaane + ek checkbox:
 *
 * | Khaana | Site pe |
 * | --- | --- |
 * | Title Template | `<title>` — sirf jab page ka SEO Title khaali ho |
 * | Default Meta Description | page ka SEO description / short description / excerpt teeno khaali hon tab |
 * | Default OG Image | share image jab page ki apni banner/featured image na ho |
 * | robots.txt | `/robots.txt` jaisa likha |
 * | Allow search engines | band = `Disallow: /` + har page `noindex` (client ne yahan maanga) |
 *
 * ⚠️ Reference ka `Organization Schema` box **nahi** — client ne sirf chaar khaane maange. Aur
 * robots.txt me `Sitemap:` line default me nahi, kyunki `sitemap.xml` bana hi nahi.
 *
 * Saancha `PageSettings`/`CustomCss` ka — `settings.seoSettings`, `settings.read`/`settings.update`.
 */

const EMPTY = {
  titleTemplate: DEFAULT_TITLE_TEMPLATE,
  defaultDescription: '',
  defaultOgImageId: null,
  robotsTxt: DEFAULT_ROBOTS_TXT,
}

export default function SeoSettings() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [seo, setSeo] = useState(null)
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const media = useMediaById([seo?.defaultOgImageId].filter(Boolean))

  function load(settings) {
    setSeo({ ...EMPTY, ...(settings.seoSettings ?? {}) })
    setVisible(settings.searchEngineVisible === true)
  }

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => load(res.data.data.settings))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const set = (key, value) => setSeo((s) => ({ ...s, [key]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    const body = { seoSettings: seo, searchEngineVisible: visible }

    /** Wahi schema jo server use karta hai (R8) — `%title%` ki rok yahin dikh jaati hai, 400 se pehle. */
    const parsed = updateSettingsSchema.safeParse(body)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      const res = await api.patch('/settings', body)
      load(res.data.data.settings)
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!seo) {
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
      {!visible && (
        <div className="notice warn" role="status">
          <span>
            Search engines are blocked. Every page is marked <code>noindex</code> and robots.txt
            tells them to stay away.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="panel">
          <div className="panel-head">
            <h2>Global SEO Defaults</h2>
          </div>
          <div className="panel-body">
            <div className="field">
              <label htmlFor="seo-title">Title Template</label>
              <input
                id="seo-title"
                className="inp"
                value={seo.titleTemplate}
                onChange={(e) => set('titleTemplate', e.target.value)}
                disabled={!canEdit}
              />
              <div className="hint">
                Used when a page has no SEO Title of its own. <code>%title%</code> is the page
                title, <code>%sitename%</code> the site title, <code>%tagline%</code> the tagline.
              </div>
            </div>

            <div className="field">
              <label htmlFor="seo-desc">Default Meta Description</label>
              <textarea
                id="seo-desc"
                className="ta"
                style={{ minHeight: 70 }}
                value={seo.defaultDescription}
                onChange={(e) => set('defaultDescription', e.target.value)}
                disabled={!canEdit}
              />
              <div className="hint">
                Used on pages with no meta description, short description or excerpt.
              </div>
            </div>

            <MediaDrop
              label="Default OG Image"
              hint="1200×630 · Shown when a page is shared and has no banner or featured image."
              media={media[seo.defaultOgImageId]}
              onSelect={(chosen) => set('defaultOgImageId', chosen.id)}
              onClear={() => set('defaultOgImageId', null)}
            />

            <div className="field">
              <label htmlFor="seo-robots">robots.txt</label>
              <textarea
                id="seo-robots"
                className="ta"
                style={{ minHeight: 80, fontFamily: 'monospace' }}
                value={seo.robotsTxt}
                onChange={(e) => set('robotsTxt', e.target.value)}
                disabled={!canEdit || !visible}
              />
              <div className="hint">
                {visible
                  ? 'Served at /robots.txt exactly as written.'
                  : 'Not used while search engines are blocked — robots.txt says Disallow: / instead.'}
              </div>
            </div>

            <label className="inline-lbl">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
                disabled={!canEdit}
              />{' '}
              Allow search engines to index this site
            </label>
            <div className="hint">
              Untick only on a staging or unfinished site. The live site should always be ticked.
            </div>
          </div>

          {canEdit && (
            <div className="panel-foot">
              <span />
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </form>
    </>
  )
}
