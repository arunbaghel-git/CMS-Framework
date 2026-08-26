import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { contentFromRichText, emptyContent } from '@cms/shared'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import RichTextEditor from './RichTextEditor.jsx'
import TagsInput from './TagsInput.jsx'
import { PACKAGE_TYPE, useMediaById, usePackage, useTaxonomyList } from './usePackages.js'
import './Packages.css'

/**
 * Add New / Edit Package — `admin-design.html` ke `#s-package-edit` se.
 *
 * **Panels wahi hain jo spec 007 §5.1 ki mapping table kehti hai** — na kam, na zyada:
 *
 * | Design ka panel | Yahan |
 * | --- | --- |
 * | Title · Permalink · Overview | ✅ |
 * | Publish (Status · Visibility · Availability) | ✅ |
 * | Package Details | ✅ par **paanch field hataye** — Package Code, Difficulty, Group Size, Trending ribbon, Enable enquiry form (client, 26 Aug) |
 * | Destinations | ✅ |
 * | Travel Themes | ✅ par ab wo **Package Type** hai — free-tag input ki jagah managed list (spec 007 §1.2) |
 * | Gallery | ✅ sirf **banner** — media grid hata diya gaya (§5.1) |
 * | SEO | ✅ |
 * | Itinerary Builder · Pricing · FAQs | ❌ **Slice 4-6** |
 * | Inclusions & Exclusions | ❌ **hata diya gaya** — ab wo global hai (§1.5) |
 *
 * Jo panels abhi nahi hain wo **khaali dikhaye bhi nahi jaate**. Ek panel jisme kuch na
 * ho, wo "abhi nahi bana" nahi lagta — wo "toota hua" lagta hai (D-30 ka ulta).
 *
 * Overview ka editor **TipTap** hai (A-8). Uska `getJSON()` seedha `content.blocks[0]
 * .props.doc` me jaata hai — wahi shape jo spec 002 ka `richText` block rakhta hai. Jab
 * editor ek saada textarea tha tab bhi yahi doc banta tha, isliye is switch pe **koi
 * migration nahi lagi**.
 */

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending review' },
  { value: 'published', label: 'Published' },
]

/** Nested checklist — design ka `.checklist` (India → Kerala → Munnar). */
function TaxonomyChecklist({ items, selected, onToggle, disabled }) {
  const byParent = new Map()
  for (const item of items) {
    const key = item.parentId ?? 'root'
    byParent.set(key, [...(byParent.get(key) ?? []), item])
  }

  const render = (parentKey, depth) =>
    (byParent.get(parentKey) ?? []).map((item) => (
      <div key={item.id}>
        <label className="inline-lbl" style={{ paddingLeft: depth * 18 }}>
          <input
            type="checkbox"
            checked={selected.includes(item.id)}
            onChange={() => onToggle(item.id)}
            disabled={disabled}
          />{' '}
          {item.name}
        </label>
        {render(item.id, depth + 1)}
      </div>
    ))

  if (items.length === 0) return <p className="muted">Nothing here yet.</p>

  return <div className="checklist">{render('root', 0)}</div>
}

export default function PackageEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()

  const { entry, loading, error: loadError, reload } = usePackage(id)
  const destinations = useTaxonomyList('destination')
  const packageTypes = useTaxonomyList('packageType')

  const [form, setForm] = useState(null)
  const [editingSlug, setEditingSlug] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  const media = useMediaById([form?.fields?.bannerImage].filter(Boolean))

  /** Server ka jawab → form ka shape. Ek hi jagah, taaki create aur load dono same rahein. */
  useEffect(() => {
    if (id && !entry) return

    setForm({
      title: entry?.title ?? '',
      slug: entry?.slug ?? '',
      /** TipTap ka doc — `content.blocks[0].props.doc`. */
      doc: entry?.content?.blocks?.find((b) => b.type === 'richText')?.props?.doc ?? null,
      status: entry?.status === 'private' ? 'published' : (entry?.status ?? 'draft'),
      visibility: entry?.status === 'private' ? 'private' : 'public',
      availability: entry?.availability ?? 'open',
      fields: entry?.fields ?? {},
      taxonomies: {
        destinations: entry?.taxonomies?.destinations ?? [],
        packageTypes: entry?.taxonomies?.packageTypes ?? [],
      },
      seo: entry?.seo ?? {},
      version: entry?.version ?? 0,
    })
  }, [id, entry])

  if (loading || !form) return <p className="subtitle">Loading…</p>

  const readOnly = !(can('entry.update') || can('entry.update.own'))

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setField = (key, value) => setForm((f) => ({ ...f, fields: { ...f.fields, [key]: value } }))
  const setSeo = (key, value) => setForm((f) => ({ ...f, seo: { ...f.seo, [key]: value } }))

  function toggleTaxonomy(key, taxonomyId) {
    setForm((f) => {
      const current = f.taxonomies[key]
      const next = current.includes(taxonomyId)
        ? current.filter((x) => x !== taxonomyId)
        : [...current, taxonomyId]

      return { ...f, taxonomies: { ...f.taxonomies, [key]: next } }
    })
  }

  async function uploadBanner(file) {
    if (!file) return

    setUploading(true)
    setError(null)

    const body = new FormData()
    body.append('file', file)

    try {
      const res = await api.post('/media', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setField('bannerImage', res.data.data.media.id)
      setNotice('Banner uploaded. Save to apply it.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  /**
   * Save — teen kadam, isi order me.
   *
   * Status ke liye alag call isliye hai ki **create se publish nahi hota** (D-47 §1) aur
   * `PATCH` status ko chhoota hi nahi: live karne ka ek hi raasta hai, jahan permission
   * check aur publish-revision dono hote hain.
   */
  async function save() {
    setSaving(true)
    setNotice(null)
    setError(null)

    const payload = {
      title: form.title,
      content: form.doc ? contentFromRichText(form.doc) : emptyContent(),
      fields: form.fields,
      taxonomies: form.taxonomies,
      seo: form.seo,
      availability: form.availability,
      ...(form.slug ? { slug: form.slug } : {}),
    }

    try {
      let entryId = id

      if (!entryId) {
        const res = await api.post('/entries', { type: PACKAGE_TYPE, ...payload })
        entryId = res.data.data.entry.id
      } else {
        await api.patch(`/entries/${entryId}`, { ...payload, version: form.version })
      }

      const currentStatus = entry?.status ?? 'draft'
      const wantsPublished = form.status === 'published'
      const wantsPrivate = form.visibility === 'private'
      const isLive = currentStatus === 'published' || currentStatus === 'private'

      if (wantsPublished && (!isLive || (currentStatus === 'private') !== wantsPrivate)) {
        await api.post(`/entries/${entryId}/publish`, {
          visibility: wantsPrivate ? 'private' : 'public',
        })
      } else if (!wantsPublished && isLive) {
        await api.post(`/entries/${entryId}/unpublish`)
      } else if (form.status === 'pending' && currentStatus === 'draft') {
        await api.post(`/entries/${entryId}/submit-review`)
      }

      setNotice('Saved.')

      if (!id) {
        navigate(`/packages/${entryId}`, { replace: true })
        return
      }

      reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function trash() {
    setSaving(true)
    setError(null)

    try {
      await api.post(`/entries/${id}/trash`)
      navigate('/packages')
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  const permalink = `/packages/${form.slug || '…'}`

  return (
    <>
      <div className="page-head">
        <h1>{id ? 'Edit Package' : 'Add New Package'}</h1>
        {id && can('entry.create') && (
          <Link className="btn page-title-action" to="/packages/new">
            Add New
          </Link>
        )}
      </div>

      {(error || loadError) && (
        <div className="notice err" role="alert">
          <span>{error ?? loadError}</span>
        </div>
      )}

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
        </div>
      )}

      <div className="edit-grid">
        <div>
          <div className="field">
            <input
              className="inp title-input"
              placeholder="Package title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              disabled={readOnly}
            />
            <div className="permalink">
              Permalink: <b>{permalink}</b>{' '}
              {!readOnly && (
                <a
                  href="#slug"
                  onClick={(e) => {
                    e.preventDefault()
                    setEditingSlug((v) => !v)
                  }}
                >
                  Edit
                </a>
              )}
            </div>
            {editingSlug && (
              <input
                className="inp"
                style={{ marginTop: 8 }}
                placeholder="url-slug"
                value={form.slug}
                onChange={(e) => set({ slug: e.target.value })}
              />
            )}
          </div>

          <RichTextEditor doc={form.doc} onChange={(doc) => set({ doc })} disabled={readOnly} />
        </div>

        <aside>
          <div className="panel">
            <div className="panel-head">
              <h2>Publish</h2>
            </div>
            <div className="panel-body">
              <div className="field">
                <label>Status</label>
                <select
                  className="sel"
                  value={form.status}
                  onChange={(e) => set({ status: e.target.value })}
                  disabled={readOnly}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Visibility</label>
                <select
                  className="sel"
                  value={form.visibility}
                  onChange={(e) => set({ visibility: e.target.value })}
                  disabled={readOnly || form.status !== 'published'}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="field">
                <label>Availability</label>
                <select
                  className="sel"
                  value={form.availability}
                  onChange={(e) => set({ availability: e.target.value })}
                  disabled={readOnly}
                >
                  <option value="open">Open</option>
                  <option value="soldOut">Sold Out</option>
                </select>
              </div>

              <div className="pub-row">
                <span className="k">Last updated:</span>
                <span className="muted">
                  {entry?.updatedAt ? new Date(entry.updatedAt).toLocaleString() : '—'}
                </span>
              </div>
            </div>

            <div className="pub-actions">
              {id && can('entry.delete') && (
                <button className="btn btn-danger btn-sm" type="button" onClick={trash}>
                  Trash
                </button>
              )}
              <button
                className="btn btn-primary"
                type="button"
                onClick={save}
                disabled={saving || readOnly || !form.title.trim()}
              >
                {saving ? 'Saving…' : id ? 'Update' : 'Save'}
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Package Details</h2>
            </div>
            <div className="panel-body">
              <div className="row2">
                <div className="field">
                  <label>Nights</label>
                  <input
                    className="inp"
                    type="number"
                    value={form.fields.nights ?? ''}
                    onChange={(e) =>
                      setField('nights', e.target.value === '' ? undefined : Number(e.target.value))
                    }
                    disabled={readOnly}
                  />
                </div>
                <div className="field">
                  <label>Days</label>
                  <input
                    className="inp"
                    type="number"
                    value={form.fields.days ?? ''}
                    onChange={(e) =>
                      setField('days', e.target.value === '' ? undefined : Number(e.target.value))
                    }
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div className="field">
                <label>Short description</label>
                <textarea
                  className="ta"
                  value={form.fields.shortDescription ?? ''}
                  onChange={(e) => setField('shortDescription', e.target.value)}
                  disabled={readOnly}
                />
              </div>

              <div className="field">
                <label>Best Season</label>
                <input
                  className="inp"
                  placeholder="Oct – May"
                  value={form.fields.bestSeason ?? ''}
                  onChange={(e) => setField('bestSeason', e.target.value)}
                  disabled={readOnly}
                />
              </div>

              <TagsInput
                label="Best for"
                hint="Couples, First-timers, 5–7 days"
                value={form.fields.bestFor ?? []}
                onChange={(next) => setField('bestFor', next)}
                disabled={readOnly}
              />

              <label className="inline-lbl">
                <input
                  type="checkbox"
                  checked={Boolean(form.fields.featured)}
                  onChange={(e) => setField('featured', e.target.checked)}
                  disabled={readOnly}
                />{' '}
                Featured on homepage
              </label>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Destinations</h2>
            </div>
            <div className="panel-body">
              <TaxonomyChecklist
                items={destinations}
                selected={form.taxonomies.destinations}
                onToggle={(taxonomyId) => toggleTaxonomy('destinations', taxonomyId)}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Package Type</h2>
            </div>
            <div className="panel-body">
              <TaxonomyChecklist
                items={packageTypes}
                selected={form.taxonomies.packageTypes}
                onToggle={(taxonomyId) => toggleTaxonomy('packageTypes', taxonomyId)}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Gallery</h2>
            </div>
            <div className="panel-body">
              <MediaDrop
                label="Banner image"
                hint="1600×900 · PNG, JPG or WebP"
                media={media[form.fields.bannerImage]}
                uploading={uploading}
                onUpload={uploadBanner}
                onClear={() => setField('bannerImage', null)}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>SEO</h2>
            </div>
            <div className="panel-body">
              <div className="field">
                <label>SEO Title</label>
                <input
                  className="inp"
                  value={form.seo.title ?? ''}
                  onChange={(e) => setSeo('title', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="field">
                <label>Meta Description</label>
                <textarea
                  className="ta"
                  value={form.seo.description ?? ''}
                  onChange={(e) => setSeo('description', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <label className="inline-lbl">
                <input
                  type="checkbox"
                  checked={Boolean(form.fields.seoSchema)}
                  onChange={(e) => setField('seoSchema', e.target.checked)}
                  disabled={readOnly}
                />{' '}
                Emit Product + Trip schema
              </label>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
