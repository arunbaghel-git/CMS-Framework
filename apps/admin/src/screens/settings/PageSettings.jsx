import { updateSettingsSchema } from '@cms/shared'
import { useEffect, useState } from 'react'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useMediaById } from '../../lib/use-entries.js'
import './Settings.css'

/**
 * `Pages ▸ Pages settings` — saade pages ki global settings (client, 14 Sep shaam, D-95 §12).
 *
 * Do cheezein, dono **sab pages** ke liye:
 *
 * | Kya | Kyun yahan |
 * | --- | --- |
 * | Banner image | Page ki Featured image na ho to hero isi se. Subah fallback tha hi nahi |
 * | Show "On this page" | Subah har page pe checkbox tha; client ne ek jagah maanga |
 *
 * `TourSettings` / `BlogSettings` ka hi saancha — storage `settings.pageSettings`, permission
 * `settings.read`/`settings.update`, aur Settings ke tabs nahi (menu Pages ke neeche hai).
 */

const EMPTY = { bannerMediaId: null, showToc: true }

export default function PageSettings() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [pages, setPages] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const media = useMediaById([pages?.bannerMediaId].filter(Boolean))

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setPages({ ...EMPTY, ...(res.data.data.settings.pageSettings ?? {}) }))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const set = (key, value) => setPages((p) => ({ ...p, [key]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    /** Wahi schema jo server use karta hai (R8) — galti yahin pakdi jaaye, 400 se pehle. */
    const parsed = updateSettingsSchema.safeParse({ pageSettings: pages })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      const res = await api.patch('/settings', { pageSettings: pages })
      setPages({ ...EMPTY, ...(res.data.data.settings.pageSettings ?? {}) })
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!pages) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <h1>Pages settings</h1>
      </div>

      <p className="subtitle">Settings used on every page.</p>

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
            <h2>Banner image</h2>
          </div>
          <div className="panel-body">
            <MediaDrop
              label="Banner image"
              hint="1600×900 · PNG, JPG or WebP. Used on pages without their own Featured image."
              media={media[pages.bannerMediaId]}
              onSelect={(chosen) => set('bannerMediaId', chosen.id)}
              onClear={() => set('bannerMediaId', null)}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Sidebar</h2>
          </div>
          <div className="panel-body">
            <label className="inline-lbl">
              <input
                type="checkbox"
                checked={pages.showToc !== false}
                onChange={(e) => set('showToc', e.target.checked)}
                disabled={!canEdit}
              />{' '}
              Show &ldquo;On this page&rdquo;
            </label>
            <div className="hint">
              A contents list at the top of the sidebar, built from the H2 headings in the content.
              It appears on pages that have a sidebar and at least three headings.
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
