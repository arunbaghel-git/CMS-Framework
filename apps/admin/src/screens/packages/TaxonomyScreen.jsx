import { useCallback, useEffect, useMemo, useState } from 'react'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useMediaById } from './usePackages.js'
import './Packages.css'

/**
 * Destinations aur Package Type — `admin-design.html` ke `#s-taxonomy` se.
 *
 * **Ek hi screen dono ke liye.** Wahi wajah jo API pe hai (D-49): dono ek hi `taxonomies`
 * collection me hain, `type` se alag. Do alag screens likhne ka matlab hota wahi form, wahi
 * table, wahi delete guard — do jagah.
 *
 * Do farq design se, dono `type` ki wajah se:
 *
 * - **Parent dropdown sirf hierarchical type pe** dikhta hai. Package Type flat hai
 *   (spec 007 §1.2), aur wahan ek dropdown dikhana jiska server har baar 422 de — wo
 *   "toota hua" hai, "khaali" nahi.
 * - **Banner Image sirf Destinations pe.** Package Type ka banner kahin render hi nahi
 *   hota (§1.1 me sirf destination ka zikr hai).
 *
 * Design ka checkbox column **nahi** hai — bulk actions in chhoti liston pe bane hi nahi
 * hain. Wahi precedent jo `UsersList` pe hai: aisa checkbox jo select to ho par kuch kar
 * na sake, wo "khaali" nahi "toota hua" lagta hai.
 */
/**
 * @param {object} props
 * @param {boolean} [props.hasColor]    Badge ka rang — sirf Categories pe (client, 11 Sep, D-93)
 * @param {string} [props.countLabel]   Ginti wale column ka naam — Categories pe `Posts`, baaki
 *   pe `Packages`. Pehle har jagah `Packages` likha tha, Categories pe bhi (client ne pakda).
 */
export default function TaxonomyScreen({
  type,
  title,
  subtitle,
  hierarchical,
  hasBanner,
  hasColor = false,
  countLabel = 'Packages',
}) {
  const { can } = useAuth()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  /** `null` = "Add New" form, warna us row ka edit. */
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    parentId: '',
    description: '',
    color: '',
  })
  const [bannerMediaId, setBannerMediaId] = useState(null)

  const media = useMediaById([bannerMediaId].filter(Boolean))

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await api.get('/taxonomies', {
        params: { type, limit: 200, sort: 'name', order: 'asc' },
      })
      setItems(res.data.data.taxonomies)
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    load()
  }, [load])

  const canWrite = can('taxonomy.create') || can('taxonomy.update')

  /**
   * Tree ka flat order — parent ke turant baad uske bachche, depth ke saath.
   *
   * Design me depth `—` prefix se dikhti hai (`— Kerala`, `—— Munnar`), isliye order
   * maayne rakhta hai: alphabetical flat list me bachcha apne parent se door chala jaata
   * hai aur prefix ka koi matlab nahi bachta.
   */
  const ordered = useMemo(() => {
    const byParent = new Map()
    for (const item of items) {
      const key = item.parentId ?? 'root'
      byParent.set(key, [...(byParent.get(key) ?? []), item])
    }

    const out = []
    const walk = (parentKey, depth) => {
      for (const item of byParent.get(parentKey) ?? []) {
        out.push({ ...item, depth })
        walk(item.id, depth + 1)
      }
    }
    walk('root', 0)

    /**
     * Orphan rows — jinka parent is list me nahi mila. Aisa nahi hona chahiye (delete pe
     * guard hai), par agar ho to wo row **gayab nahi honi chahiye**: chup-chaap kho jaana
     * usse bura hai ki wo bina indent ke dikh jaaye.
     */
    if (out.length < items.length) {
      const seen = new Set(out.map((i) => i.id))
      for (const item of items) if (!seen.has(item.id)) out.push({ ...item, depth: 0 })
    }

    return out
  }, [items])

  function resetForm() {
    setEditingId(null)
    setForm({ name: '', slug: '', parentId: '', description: '', color: '' })
    setBannerMediaId(null)
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      slug: item.slug,
      parentId: item.parentId ?? '',
      description: item.description ?? '',
      color: item.color ?? '',
    })
    setBannerMediaId(item.bannerMediaId ?? null)
    setNotice(null)
    setError(null)
  }

  async function uploadBanner(file) {
    if (!file) return

    setUploading(true)
    const body = new FormData()
    body.append('file', file)

    try {
      const res = await api.post('/media', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setBannerMediaId(res.data.data.media.id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    const payload = {
      name: form.name,
      description: form.description,
      ...(form.slug ? { slug: form.slug } : {}),
      ...(hierarchical ? { parentId: form.parentId || null } : {}),
      ...(hasBanner ? { bannerMediaId } : {}),
      /** Sirf Categories pe — Destination/Package Type ke document me khaali `color` na pade. */
      ...(hasColor ? { color: form.color } : {}),
    }

    try {
      if (editingId) {
        await api.patch(`/taxonomies/${editingId}`, payload)
        setNotice(`${form.name} updated.`)
      } else {
        await api.post('/taxonomies', { type, ...payload })
        setNotice(`${form.name} added.`)
      }

      resetForm()
      load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(item) {
    setError(null)
    setNotice(null)

    try {
      await api.delete(`/taxonomies/${item.id}`)
      setNotice(`${item.name} deleted.`)
      if (editingId === item.id) resetForm()
      load()
    } catch (err) {
      /**
       * Delete ke teen guard server pe hain (bachche · hotels · entries). Unka message
       * seedha dikhta hai — wahi user ko batata hai ki **kya** hataana pehle hoga.
       */
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
      </div>
      {subtitle && <p className="subtitle">{subtitle}</p>}

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

      <div className="edit-grid tax-grid">
        {canWrite && (
          <form className="panel" onSubmit={submit}>
            <div className="panel-head">
              <h2>{editingId ? `Edit ${title}` : `Add New ${title}`}</h2>
            </div>
            <div className="panel-body">
              <div className="field">
                <label>Name</label>
                <input
                  className="inp"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label>Slug</label>
                <input
                  className="inp"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
                <div className="hint">
                  URL-friendly, lowercase, hyphens only. Leave empty to build it from the name.
                </div>
              </div>

              {hierarchical && (
                <div className="field">
                  <label>Parent</label>
                  <select
                    className="sel"
                    value={form.parentId}
                    onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  >
                    <option value="">None</option>
                    {ordered
                      /* Khud ko apna parent nahi bana sakte — server bhi rokta hai (422),
                         par wo option dikhana hi nahi chahiye */
                      .filter((item) => item.id !== editingId)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {'— '.repeat(item.depth)}
                          {item.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="field">
                <label>Description</label>
                <textarea
                  className="ta"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/*
               * Badge ka rang — client, 11 Sep (D-93): _"badge color option a colorpicker"_.
               *
               * ⚠️ **Khaali = Automatic**, aur wo ek asli vikalp hai: site reference ke chaar rang me
               * se ek khud chunti hai (10 Sep se wahi hota aaya hai). `<input type="color">` khaali
               * value rakh hi nahi sakta, isliye "Automatic" ka alag button hai — warna ek baar rang
               * chunne ke baad wapas jaane ka raasta hi nahi bachta.
               */}
              {hasColor && (
                <div className="field">
                  <label>Badge colour</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="color"
                      value={form.color || '#1a73e8'}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      aria-label="Badge colour"
                    />
                    <span className="muted">{form.color || 'Automatic'}</span>
                    {form.color && (
                      <button
                        className="btn btn-sm btn-plain"
                        type="button"
                        onClick={() => setForm({ ...form, color: '' })}
                      >
                        Use automatic
                      </button>
                    )}
                  </div>
                  <div className="hint">
                    The colour of this category’s badge on post cards and at the top of each post.
                    Leave it on Automatic and the site picks one.
                  </div>
                </div>
              )}

              {hasBanner && (
                <MediaDrop
                  label="Banner Image"
                  hint="Choose image"
                  media={media[bannerMediaId]}
                  uploading={uploading}
                  onUpload={uploadBanner}
                  onSelect={(chosen) => setBannerMediaId(chosen.id)}
                  onClear={() => setBannerMediaId(null)}
                />
              )}

              <button className="btn btn-primary" type="submit" disabled={saving || !form.name}>
                {editingId ? 'Update' : `Add New ${title}`}
              </button>
              {editingId && (
                <button className="btn btn-plain" type="button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <table className="list">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Description</th>
              <th>{countLabel}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="muted">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && ordered.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Nothing here yet.
                </td>
              </tr>
            )}

            {ordered.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.depth > 0 && <span className="muted">{'—'.repeat(item.depth)} </span>}
                  {/* Chuna hua badge rang — ek nazar me dikhe ki kis category ka kaunsa hai (D-93). */}
                  {hasColor && item.color && (
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: item.color,
                        marginRight: 6,
                        verticalAlign: 'middle',
                      }}
                    />
                  )}
                  <a
                    className="row-title"
                    href="#edit"
                    onClick={(e) => {
                      e.preventDefault()
                      startEdit(item)
                    }}
                  >
                    {item.name}
                  </a>
                  {canWrite && (
                    <div className="row-actions">
                      <span>
                        <a
                          href="#edit"
                          onClick={(e) => {
                            e.preventDefault()
                            startEdit(item)
                          }}
                        >
                          Edit
                        </a>
                      </span>
                      {can('taxonomy.delete') && (
                        <span>
                          <a
                            className="del"
                            href="#delete"
                            onClick={(e) => {
                              e.preventDefault()
                              remove(item)
                            }}
                          >
                            Delete
                          </a>
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="muted">{item.slug}</td>
                <td className="muted">{item.description || '—'}</td>
                <td>{item.usageCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
