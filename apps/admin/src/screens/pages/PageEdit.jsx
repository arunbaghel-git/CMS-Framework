import {
  BLOG_PAGE_BLOCK_TYPES,
  CURRENT_CONTENT_VERSION,
  ENTRY_LIST_MAX_LIMIT,
  POST_BLOCK_TYPES,
} from '@cms/shared'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import Panel from '../../components/admin/Panel.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useEntry, useEntryList, useMediaById } from '../../lib/use-entries.js'
import { useSidebars } from '../appearance/useSidebars.js'
import HtmlEditor from '../packages/HtmlEditor.jsx'
import { useTaxonomyList } from '../packages/usePackages.js'
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
    /** `Page header` panel — heading + sub heading. */
    header: true,
    /** Eyebrow + Stat rail — `tour-v3.html` ke hero wale panel. */
    hero: true,
    /** Sidebar ka chunav page pe (D-88). */
    sidebar: true,
    blocks: ['richText', 'twoColumn', 'cards', 'packageList', 'faqs'],
  },

  /**
   * Blog ka listing page — `blog-v1.html` (spec 008).
   *
   * ⚠️ `hero: false` — na Eyebrow, na Stat rail. Dono `tour-v3.html` ke hero ki cheezein hain
   * aur `blog-v1.html` me hain hi nahi; Eyebrow ko client ne **saaf mana kiya** (_"Written on
   * the islands · updated for 2026"_ hataana tha). Isiliye `BLOG_PAGE_FIELDS` bhi
   * `TOUR_PAGE_FIELDS` se alag hai — do khaali khaane admin me padey rehna hi wo sawaal
   * paida karta hai jiska koi jawab nahi hota.
   */
  blogPage: {
    key: 'blogPage',
    label: 'Blog Page',
    basePath: '/blog-page',
    header: true,
    hero: false,
    sidebar: true,
    blocks: BLOG_PAGE_BLOCK_TYPES,
  },

  /**
   * Blog post — `blog-detail-v1.html` (spec 008).
   *
   * ⚠️ **`header: false`** — post ka `<h1>` uska **Title hi** hai. D-90 ne `fields.heading`
   * `tourPage` ke liye banaya tha kyunki wahan `<h1>` me `<em>` se rang chahiye tha aur
   * `title` har doosri jagah (SEO, `<title>` tag) bhi jaata hai. Blog pe reference ka
   * `.ahead__t` bilkul wahi text hai jo breadcrumb aur card pe dikhta hai — do field ek hi
   * cheez ke do naam bana dete (D-86).
   *
   * ⚠️ **`sidebar: false`** — post ki sidebar `Settings ▸ Blog settings` me ek baar chunti hai
   * (client, 9 Sep: TOC ke liye bhi _"sabke liye"_). Har post pe do dropdown bharwane ka
   * matlab hota ki ek din koi bhool jaaye aur us post pe sidebar chup-chaap gayab ho.
   */
  post: {
    key: 'post',
    label: 'Post',
    basePath: '/posts',
    header: false,
    hero: false,
    sidebar: false,
    /** Excerpt aur Category sirf post pe — `tourPage` ko dono ki zaroorat hi nahi. */
    excerpt: true,
    categories: true,
    blocks: POST_BLOCK_TYPES,
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

  /**
   * "Which sidebar" ka dropdown (D-88).
   *
   * ⚠️ Ye hook yahan hai, us `if (loading) return` ke **neeche nahi** jahan wo padha jaata hai —
   * conditional hook React ka rule tod deta hai. Aur list hamesha load hoti hai, chahe page pe
   * `sidebar: 'none'` ho: use `sidebar` ki value pe rokne ka matlab hota ki client left chunte
   * hi ek khaali dropdown dekhe aur phir wo bhar jaaye.
   */
  const { data: sidebars, loading: sidebarsLoading } = useSidebars({ limit: 200 })

  /**
   * Post ka Category dropdown (spec 008).
   *
   * ⚠️ **Wahi hook jo Packages ka Destinations/Package Type bharta hai** — nayi list nahi
   * likhi. Do copies ka nateeja is repo me kai baar ho chuka hai (D-65/D-51/D-58).
   *
   * Hook hamesha chalta hai, chahe type `post` na ho — conditional hook React ka rule tod
   * deta hai. Ek `category` taxonomy ki list saste me aa jaati hai.
   */
  const categories = useTaxonomyList('category')

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

      /** Sirf `post` pe dikhta hai, par state hamesha bharta hai — ek hi shape (spec 008). */
      excerpt: entry?.excerpt ?? '',
      /**
       * ⚠️ Form me **ek** id, par DB me wo `taxonomies.categories[]` hai (D-49 ka shape).
       * Wahi jodi jo `sidebarId` pe hai: UI ek dropdown, storage apne asli shape me.
       */
      categoryId: entry?.taxonomies?.categories?.[0] ?? '',
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
        const row = stats[idx] ?? { value: '', suffix: '', label: '', highlight: false }
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

      /**
       * ⚠️ **Dono sirf un types pe bheje jaate hain jinke paas wo field hai** — wahi rok jo
       * upar `statRail` pe hai. `entries` ka `fields`/`taxonomies` ke saath problem ye hai ki
       * undeclared value chup-chaap store ho jaati hai, aur ek Tour page ke document me
       * `excerpt: ''` ya khaali `categories: []` padi rehna sirf bhram paida karta hai.
       *
       * ⚠️ `taxonomies` **poora object** jaata hai, sirf ek key nahi: `entrySchema` `.strict()`
       * pe hai aur galat key chup-chaap girti nahi, phenkti hai (D-43 §3 ka trap).
       */
      ...(config.excerpt ? { excerpt: form.excerpt } : {}),
      ...(config.categories
        ? { taxonomies: { categories: form.categoryId ? [form.categoryId] : [] } }
        : {}),
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
          {config.header && (
            <Panel title="Page header">
              <div className="panel-body">
                {/* Eyebrow `tour-v3.html` ke hero se aata hai — saade page pe wo nahi hai. */}
                {/*
                 * Page ka **dikhne wala** `<h1>` — client, 9 Sep.
                 *
                 * ⚠️ Iske aane se upar wale `Title` ka kaam **chhota ho gaya**: ab wo slug,
                 * breadcrumb, admin ki list, SEO aur schema ke liye hai. Client ne yahi maanga tha
                 * — _"current jo hai use only slug ke liye rakhte hain, to breadcrumb bhi simple ho
                 * jayega"_.
                 *
                 * ⚠️ **Editor bilkul wahi hai jo baaki jagah hai** — client, 9 Sep:
                 * _"page header ka editor different kyu hai other editors se, make it same
                 * becouse admin could be confuse."_ Pehle iska apna chhota toolbar tha (bold ·
                 * highlight · link) aur tabs bhi nahi the.
                 *
                 * ⚠️ **Iski ek keemat hai, aur wo hint me likhi hai:** toolbar me heading dropdown,
                 * list aur image ab dikhte hain, par ye field `<h1>` ke **andar** chhapta hai —
                 * `pageHeadingSchema` inline profile pe hai, to block tags save pe gir jaate hain.
                 * Client ko wo pehle se bata dena hi ek raasta bacha, kyunki toolbar ab chhota nahi
                 * kiya ja sakta.
                 */}
                <div className="field">
                  <label>Page heading</label>
                  <HtmlEditor
                    value={form.fields.heading ?? ''}
                    onChange={(heading) => setField('heading', heading)}
                    disabled={readOnly}
                    height={160}
                  />
                  <div className="hint">
                    Shown as the page’s H1. Leave it empty and the <b>Title</b> above is used.{' '}
                    <b>Italic</b> marks the part that should stand out in the accent colour. Only
                    bold, italic and links are kept here — headings, lists and images are dropped
                    when you save, because this is a heading.
                  </div>
                </div>

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
            </Panel>
          )}

          {/* ---- EXCERPT ---- sirf post pe (spec 008) ---- */}
          {config.excerpt && (
            /*
             * ⚠️ Excerpt do jagah dikhta hai — listing card ka `.bp__x` **aur** meta
             * description ka fallback. Isiliye hint me wo likha hai: client ise "sirf card ki
             * line" samajh kar chhota likh de to SEO wali jagah bhi chhoti ho jaati hai.
             */
            <Panel title="Excerpt">
              <div className="panel-body">
                <div className="field">
                  <textarea
                    className="inp"
                    rows={3}
                    value={form.excerpt ?? ''}
                    onChange={(e) => set({ excerpt: e.target.value })}
                    disabled={readOnly}
                  />
                  <div className="hint">
                    The line under the title on listing cards. Also used as the meta description
                    when the <b>SEO</b> panel below is left empty.
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {/* ---- STAT RAIL ---- reference ka `.vrail`, sirf Tour page pe ---- */}
          {config.hero && (
            /*
             * ⚠️ **Design me ye band khulta hai** (`#s-page-edit` me `▸` aur
             * `panel-body style="display:none"`). Chaar row hamesha dikhti hain aur wo poori
             * screen ghere rehti — jabki client aksar unhe ek baar bhar kar chhod deta hai.
             *
             * Head pe summary rehti hai (`₹11,499 · 40+ · 2–13`), isliye band hone pe bhi pata
             * chalta hai ki andar kya hai.
             */
            <Panel
              title="Stat rail"
              defaultOpen={false}
              aside={
                <span className="muted">
                  {stats
                    .map((s) => s?.value)
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </span>
              }
            >
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

                      {/*
                       * ⚠️ **Highlight — client ne 9 Sep ko pakda ki design me `₹11,499` neela
                       * hai aur hamare paas nahi.**
                       *
                       * `statSchema.highlight` D-87 se maujood tha, payload use bhejta tha, aur
                       * theme uspe `.vrail__c--p` lagati thi — bas **admin me use tick karne ka
                       * koi raasta hi nahi tha**. Yaani wo hamesha `false` rehta aur neela rang
                       * kabhi aata hi nahi.
                       *
                       * Ye us din ka teesra aisa gap tha (per-package rating aur trust badges
                       * bhi wahi shakl ke the): schema + payload + theme teenon taiyaar, aur
                       * admin me control nadaarad.
                       */}
                      <label className="inline-lbl">
                        <input
                          type="checkbox"
                          checked={Boolean(row.highlight)}
                          onChange={(e) => setStat(i, 'highlight', e.target.checked)}
                          disabled={readOnly}
                        />{' '}
                        Highlight this one
                      </label>
                    </div>
                  )
                })}
                <div className="hint">
                  Leave all four empty and this rail does not appear on the page.
                </div>
              </div>
            </Panel>
          )}

          {/* ---- CONTENT ---- */}
          <Panel title="Content" aside={<span className="muted">{form.blocks.length} blocks</span>}>
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
          </Panel>
        </div>

        {/* ================= SIDEBAR ================= */}
        <aside>
          {/*
           * ⚠️ **Save/Trash `footer` me hain, body me nahi** — `Panel` ka apna niyam: body band
           * hone pe render hi nahi hoti, aur Save chhup jaane ka matlab hota ki user ko lage
           * kaam bachane ka raasta hi nahi bacha. Ek panel band karna Save chhupane ki keemat
           * pe nahi hona chahiye.
           */}
          <Panel
            title="Publish"
            footer={
              <div className="panel-foot">
                {id && !readOnly ? (
                  <button className="btn btn-sm btn-danger" type="button" onClick={trash}>
                    Trash
                  </button>
                ) : (
                  <span />
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
            }
          >
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
            </div>
          </Panel>

          <Panel title="Page settings">
            <div className="panel-body">
              {/* ---- CATEGORY ---- sirf post pe (spec 008) ---- */}
              {config.categories && (
                /*
                 * ⚠️ **Ek hi category**, list nahi — aur wo `entry.taxonomies.categories[]`
                 * ke andar bhejti jaati hai (D-49 ka shape). Reference me card pe ek hi badge
                 * hai (`.bcat`) aur sidebar ke Topics me har post ek hi baar ginta hai; do
                 * category ki ijaazat dene ka matlab hota ki wo ginti do jagah bhare aur
                 * `.bfilter` ka total cards se zyada ho jaaye.
                 *
                 * ⚠️ **Tags yahan nahi hain** — client ne 9 Sep ko mana kiya, aur `post` ke
                 * `taxonomyTypes` se bhi wo hat chuka hai.
                 */
                <div className="field">
                  <label>Category</label>
                  <select
                    className="sel"
                    value={form.categoryId ?? ''}
                    onChange={(e) => set({ categoryId: e.target.value })}
                    disabled={readOnly}
                  >
                    <option value="">— no category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <div className="hint">
                      No categories yet — add one under <b>Posts ▸ Categories</b>.
                    </div>
                  )}
                </div>
              )}

              {/*
               * Sidebar — **sirf layout aur visibility** (client, 8 Sep).
               *
               * ⚠️ Usme kaunsa form dikhega wo yahan tay nahi hota; wo `Appearance ▸ Sidebar`
               * ka kaam hai (Slice E). Client ne wo lakeer khud khinchi, aur wo theek jagah
               * hai: layout page ka apna faisla hai, content site ka.
               *
               * ⚠️ **Post pe ye dono field nahi hain** (spec 008) — uski sidebar
               * `Settings ▸ Blog settings` me ek baar chunti hai, har post pe nahi.
               */}
              {config.sidebar && (
                <>
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

                  {/*
                   * "Which sidebar" — **left/right chunne ke baad hi** (client, D-88 #6).
                   *
                   * ⚠️ `none` par ye dropdown chhup jaata hai par uski **value mitti nahi** — client
                   * left/right toggle karke wapas aayega aur uska chunav bacha rehna chahiye. Wahi
                   * soch jo D-87 §3 ki rating pe hai: override karta hai, mitata nahi.
                   */}
                  {(form.fields.sidebar ?? 'none') !== 'none' && (
                    <div className="field">
                      <label>Which sidebar</label>
                      <select
                        className="sel"
                        value={form.fields.sidebarId ?? ''}
                        onChange={(e) => setField('sidebarId', e.target.value)}
                        disabled={readOnly || sidebarsLoading}
                      >
                        <option value="">
                          {sidebarsLoading ? 'Loading…' : '— choose a sidebar —'}
                        </option>
                        {sidebars.map((sidebar) => (
                          <option key={sidebar.id} value={sidebar.id}>
                            {sidebar.name}
                          </option>
                        ))}
                      </select>

                      {/*
                       * Khaali list ka matlab "abhi banayi hi nahi" hai — aur wo saaf likha hona
                       * chahiye. 8 Sep ko package picker pe ulta hua tha: request 400 de rahi thi
                       * aur screen pe sirf khaali list dikhti thi, yaani **failure khaali state ki
                       * shakl me** aa raha tha (D-86).
                       */}
                      {!sidebarsLoading && sidebars.length === 0 && (
                        <div className="hint">
                          No sidebars yet — create one under <b>Appearance ▸ Sidebar</b>.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

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
          </Panel>

          <Panel title="SEO" defaultOpen={false}>
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
          </Panel>
        </aside>
      </div>
    </>
  )
}
