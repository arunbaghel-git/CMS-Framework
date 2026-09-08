import { CURRENT_CONTENT_VERSION, ENTRY_LIST_MAX_LIMIT } from '@cms/shared'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useEntry, useEntryList, useMediaById } from '../../lib/use-entries.js'
import HtmlEditor from '../packages/HtmlEditor.jsx'
import PageBlocks from './PageBlocks.jsx'
import '../packages/Packages.css'

/**
 * Tour Page ka editor — **type se chalta hai, hardcoded nahi** (D-87, client ka faisla #2).
 *
 * Client ne 7 Sep ko "do template" wala plan rad kiya: koi chooser nahi, koi template dropdown
 * nahi, koi switch-confirm nahi.
 *
 * ⚠️ **Aaj sirf `/tour` isko use karta hai.** Kuch ghante ke liye `/pages` bhi isi pe tha, par
 * Pages par kaam ho hi nahi raha (client, 8 Sep) — wo wapas `NotBuiltYet` pe hai. Component
 * `type` prop se chalta hai, isliye jis din Pages ka kaam aayega tab `TYPE_CONFIG` me ek row
 * aur do route jodne se ye wahan bhi chal jaayega.
 *
 * Screen ka dhaancha `admin-design-v3.html` ke `#s-page-edit` se hai:
 *
 * ```
 * Title + permalink
 * ▾ Page header    Eyebrow · Sub heading (editor)
 * ▸ Stat rail      chaar cards
 * ▾ Content        blocks ki list + "Add block" dropdown
 *                                          ▾ Publish
 *                                          ▾ Page settings   Parent · Featured image
 *                                          ▸ SEO
 * ```
 *
 * ⚠️ **Byline ke liye koi field nahi hai** (faisla #9) — author, updated aur read time teenon
 * page pe apne aap bante hain. Publish panel unhe **dikhata** hai, taaki client ko pata ho ki
 * wo kahan se aa rahe hain.
 *
 * ⚠️ **Breadcrumb ka apna field bhi nahi hai** (faisla #12) — wo `Parent` se banta hai. Ye do
 * cheezein design me paas-paas hain aur dikhne me ek jaisi lagti hain, isliye dono jagah hint
 * likhi hui hai.
 */

/**
 * Kaunsa type kaunse panel aur blocks paata hai.
 *
 * ⚠️ **Abhi sirf `tourPage` hai** — Pages par kaam ho hi nahi raha (client, 8 Sep), aur uski
 * screens `NotBuiltYet` pe hain. Kuch ghante ke liye yahan `page` bhi tha aur use Tour ke saare
 * panel mil gaye the (Eyebrow · Stat rail · `Package list` block); wo teenon `tour-v3.html` ke
 * hero/listing ki cheezein hain aur ek About Us page pe unka koi kaam nahi.
 *
 * Jis din Pages ka kaam aayega, yahan **ek row** jodni hai aur do route — component `type` prop
 * se pehle se chalta hai. `hero`/`blocks` yahin tay hote hain, JSX me bikhre
 * `type === 'tourPage'` se nahi (wahi hardcoding jise D-09 ne mana kiya tha).
 */
const TYPE_CONFIG = {
  tourPage: {
    key: 'tourPage',
    label: 'Tour Page',
    basePath: '/tour',
    /** Eyebrow + Stat rail — `tour-v3.html` ke hero wale panel. */
    hero: true,
    blocks: ['richText', 'twoColumn', 'cards', 'packageList', 'faqs'],
  },
}

export default function PageEdit({ type = 'tourPage' }) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.tourPage
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()

  const { entry, loading, error: loadError, reload } = useEntry(id)

  /**
   * Parent ka dropdown — **sirf `page`** ki list se.
   *
   * Tour pages nested nahi hote (`hierarchical: false`), par unpe `parentId` phir bhi lagta
   * hai: URL flat rehta hai aur breadcrumb parent se banta hai (D-87 §7). Isliye dropdown
   * dono screens pe dikhta hai, par usme hamesha Pages hi aate hain — ek Tour page ko doosre
   * Tour page ke andar rakhna kisi kaam ka nahi.
   */
  const { data: parentOptions } = useEntryList('page', {
    limit: ENTRY_LIST_MAX_LIMIT,
    status: 'published',
  })

  const [form, setForm] = useState(null)
  const [editingSlug, setEditingSlug] = useState(false)
  const [openBlocks, setOpenBlocks] = useState([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  const media = useMediaById([form?.featuredImageId].filter(Boolean))

  /** Server ka jawab → form ka shape. Ek hi jagah, taaki create aur load dono same rahein. */
  useEffect(() => {
    if (id && !entry) return

    setForm({
      title: entry?.title ?? '',
      slug: entry?.slug ?? '',
      /** Content ab blocks ki **list** hai (D-87 §7) — ek hi richText nahi. */
      blocks: entry?.content?.blocks ?? [],
      status: entry?.status === 'private' ? 'published' : (entry?.status ?? 'draft'),
      visibility: entry?.status === 'private' ? 'private' : 'public',
      fields: entry?.fields ?? {},
      parentId: entry?.parentId ?? '',
      featuredImageId: entry?.featuredImageId ?? null,
      seo: entry?.seo ?? {},
      version: entry?.version ?? 0,
    })
  }, [id, entry])

  if (loading || !form) return <p className="subtitle">Loading…</p>

  const readOnly = !(can('entry.update') || can('entry.update.own'))

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setField = (key, value) => setForm((f) => ({ ...f, fields: { ...f.fields, [key]: value } }))
  const setSeo = (key, value) => setForm((f) => ({ ...f, seo: { ...f.seo, [key]: value } }))

  const stats = form.fields.statRail ?? []
  const setStat = (i, key, value) =>
    setField(
      'statRail',
      Array.from({ length: 4 }, (_, idx) => {
        const row = stats[idx] ?? { value: '', suffix: '', label: '' }
        return idx === i ? { ...row, [key]: value } : row
      }),
    )

  function toggleBlock(blockId) {
    setOpenBlocks((o) => (o.includes(blockId) ? o.filter((x) => x !== blockId) : [...o, blockId]))
  }

  /**
   * Save — wahi teen kadam jo `PackageEdit` pe hain, usi order me.
   *
   * Status ke liye alag call isliye hai ki **create se publish nahi hota** (D-47 §1) aur
   * `PATCH` status ko chhoota hi nahi: live karne ka ek hi raasta hai, jahan permission check
   * aur publish-revision dono hote hain.
   */
  async function save() {
    setSaving(true)
    setNotice(null)
    setError(null)

    /**
     * ⚠️ Khaali stat rows **bheji nahi jaatin**. Form hamesha chaar row dikhata hai (design se),
     * par jinme `value` nahi hai wo page pe render hi nahi hoti — unhe store karne ka matlab
     * hota DB me chaar khaali object har page pe.
     *
     * ⚠️ Aur jis type pe hero hai hi nahi (`page`), wahan `statRail` **bheja hi nahi jaata**.
     * `entries.fields` Mixed hai, yaani undeclared field bhi chup-chaap store ho jaata —
     * ek saade page ke `fields` me `statRail: []` padi rehti, jiska koi matlab nahi.
     */
    const fields = config.hero
      ? { ...form.fields, statRail: stats.filter((s) => s?.value?.trim()) }
      : form.fields

    const payload = {
      title: form.title,
      content: { version: CURRENT_CONTENT_VERSION, blocks: form.blocks },
      fields,
      seo: form.seo,
      parentId: form.parentId || null,
      featuredImageId: form.featuredImageId,
      ...(form.slug ? { slug: form.slug } : {}),
    }

    try {
      let entryId = id

      if (!entryId) {
        const res = await api.post('/entries', { type: config.key, ...payload })
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
      }

      setNotice('Saved.')

      if (!id) {
        navigate(`${config.basePath}/${entryId}`, { replace: true })
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
    if (!window.confirm('Move this page to Trash?')) return

    setSaving(true)
    setError(null)

    try {
      await api.post(`/entries/${id}/trash`)
      navigate(config.basePath)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  /** Dono types root pe baithte hain — `/{slug}` (D-87 §1). */
  const permalink = `/${form.slug || '…'}`

  return (
    <>
      <div className="page-head">
        <h1>
          {id ? 'Edit' : 'Add New'} {config.label}
        </h1>
        <Link className="btn page-title-action" to={config.basePath}>
          Back to list
        </Link>
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
              placeholder="Add title"
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
                style={{ marginTop: 6, maxWidth: 320 }}
                value={form.slug}
                placeholder="Leave empty to build it from the title"
                onChange={(e) => set({ slug: e.target.value })}
              />
            )}
          </div>

          {/* ---- PAGE HEADER ---- */}
          <div className="panel">
            <div className="panel-head">
              <h2>Page header</h2>
            </div>
            <div className="panel-body">
              {/* Eyebrow `tour-v3.html` ke hero se aata hai — saade page pe wo nahi hai. */}
              {config.hero && (
                <div className="field">
                  <label>Eyebrow line</label>
                  <input
                    className="inp"
                    value={form.fields.eyebrow ?? ''}
                    onChange={(e) => setField('eyebrow', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
              )}
              <div className="field">
                <label>Sub heading</label>
                <HtmlEditor
                  value={form.fields.subheading ?? ''}
                  onChange={(v) => setField('subheading', v)}
                  disabled={readOnly}
                  height={140}
                />
              </div>
              <div className="hint">
                The big heading comes from the Title above. The breadcrumb is built from the
                page&rsquo;s <b>Parent</b>. The banner image comes from Settings — a page with its
                own Featured image uses that instead.
              </div>
            </div>
          </div>

          {/* ---- STAT RAIL ---- reference ka `.vrail`, sirf Tour page pe ---- */}
          {config.hero && (
            <div className="panel">
              <div className="panel-head">
                <h2>Stat rail</h2>
                <span className="muted">
                  {stats
                    .map((s) => s?.value)
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </span>
              </div>
              <div className="panel-body">
                {Array.from({ length: 4 }, (_, i) => {
                  const row = stats[i] ?? {}
                  return (
                    <div className="row3" key={i}>
                      <div className="field">
                        <label>Value</label>
                        <input
                          className="inp"
                          value={row.value ?? ''}
                          onChange={(e) => setStat(i, 'value', e.target.value)}
                          disabled={readOnly}
                        />
                      </div>
                      <div className="field">
                        <label>Suffix</label>
                        <input
                          className="inp"
                          placeholder="—"
                          value={row.suffix ?? ''}
                          onChange={(e) => setStat(i, 'suffix', e.target.value)}
                          disabled={readOnly}
                        />
                      </div>
                      <div className="field">
                        <label>Label</label>
                        <input
                          className="inp"
                          value={row.label ?? ''}
                          onChange={(e) => setStat(i, 'label', e.target.value)}
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="hint">
                  Leave all four empty and this rail does not appear on the page.
                </div>
              </div>
            </div>
          )}

          {/* ---- CONTENT ---- */}
          <div className="panel">
            <div className="panel-head">
              <h2>Content</h2>
              <span className="muted">{form.blocks.length} blocks</span>
            </div>
            <div className="panel-body">
              <PageBlocks
                blocks={form.blocks}
                types={config.blocks}
                onChange={(blocks) => set({ blocks })}
                disabled={readOnly}
                open={openBlocks}
                onToggle={toggleBlock}
              />
              <div className="hint">
                Blocks appear on the page in this order. Write normally inside a Text block —
                headings, paragraphs, bullets, tables, quotes, images. No classes or code.
              </div>
            </div>
          </div>
        </div>

        {/* ================= SIDEBAR ================= */}
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
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
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

              <div className="hint">
                The byline on the page (<i>author · Updated · min read</i>) is built from these{' '}
                <b>automatically</b> — there is no field for it.
              </div>

              <div className="pub-actions">
                {id && !readOnly && (
                  <button className="btn btn-sm btn-danger" type="button" onClick={trash}>
                    Trash
                  </button>
                )}
                {!readOnly && (
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={save}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : id ? 'Update' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Page settings</h2>
            </div>
            <div className="panel-body">
              {/*
               * Sidebar — **sirf layout aur visibility** (client, 8 Sep).
               *
               * ⚠️ Usme kaunsa form dikhega wo yahan tay nahi hota; wo `Appearance ▸ Sidebar`
               * ka kaam hai (Slice E). Client ne wo lakeer khud khinchi, aur wo theek jagah
               * hai: layout page ka apna faisla hai, content site ka.
               */}
              <div className="field">
                <label>Sidebar</label>
                <select
                  className="sel"
                  value={form.fields.sidebar ?? 'none'}
                  onChange={(e) => setField('sidebar', e.target.value)}
                  disabled={readOnly}
                >
                  <option value="none">No sidebar</option>
                  <option value="left">Left — content on the right</option>
                  <option value="right">Right — content on the left</option>
                </select>
                <div className="hint">
                  What goes inside it — the form, the widgets — comes from{' '}
                  <b>Appearance ▸ Sidebar</b>.
                </div>
              </div>

              <div className="field">
                <label>Parent</label>
                <select
                  className="sel"
                  value={form.parentId}
                  onChange={(e) => set({ parentId: e.target.value })}
                  disabled={readOnly}
                >
                  <option value="">(no parent)</option>
                  {parentOptions
                    .filter((p) => p.id !== id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
                <div className="hint">
                  The breadcrumb is built from this.
                  {config.key === 'tourPage' && ' Tour page ka URL isse nahi badalta.'}
                </div>
              </div>

              {/*
               * ⚠️ `onSelect` ko **poora media document** milta hai, uski id nahi — wahi shape
               * jo `PackageEdit` pe hai. Library se chunna hi pehla raasta hai (D-78).
               */}
              <MediaDrop
                label="Featured image"
                hint="Optional. Na daali to Settings wali universal image aayegi."
                media={media[form.featuredImageId]}
                onSelect={(chosen) => set({ featuredImageId: chosen.id })}
                onClear={() => set({ featuredImageId: null })}
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
                  style={{ minHeight: 70 }}
                  value={form.seo.description ?? ''}
                  onChange={(e) => setSeo('description', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="hint">
                The FAQ and breadcrumb schema is emitted automatically — from the FAQs block and
                from the page&rsquo;s parent.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
