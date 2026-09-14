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
 * Chaar type isko use karte hain — `page` (`/pages`, 14 Sep se, D-95), `tourPage` (`/tour`),
 * `blogPage` aur `post`. Kya dikhega wo sab `TYPE_CONFIG` ki row se tay hota hai.
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
 * ⚠️ 7–8 Sep ke beech kuch ghante yahan `page` ko Tour ke saare panel mil gaye the, aur client ne
 * mana kiya. 14 Sep ko `page` apni **alag** row ke saath aaya (D-95) — Tour ki copy nahi.
 *
 * Panel aur blocks yahin tay hote hain, JSX me bikhre `type === 'tourPage'` se nahi (wahi
 * hardcoding jise D-09 ne mana kiya tha).
 */
const TYPE_CONFIG = {
  /**
   * Saada page — `page-template-text.html` (client, 14 Sep, D-95).
   *
   * ⚠️ **Tour ki row copy nahi ki.** Client ne jo maanga:
   *
   * | Kya | Kyun |
   * | --- | --- |
   * | `header: false` | `<h1>` = **Title** (Post jaisa, D-93) — `Page heading` nahi |
   * | `eyebrow: false` | _"Andaman beaches · updated for 2026"_ hataya |
   * | `statRail: true` | _"ha rahegi"_ |
   * | `heroButtons: true` | _"pages par specific rahega inside edit page"_ — Settings me nahi |
   * | `toc: true` | `On this page` ka checkbox **har page pe** (sidebar bhi per-page hai) |
   * | `blocks` | Text + FAQs — Post wale hi (`POST_BLOCK_TYPES`) |
   */
  page: {
    key: 'page',
    label: 'Page',
    basePath: '/pages',
    header: false,
    subheading: true,
    eyebrow: false,
    statRail: true,
    heroButtons: true,
    toc: true,
    sidebar: true,
    parent: true,
    /** Page ka URL parent ke neeche banta hai (`hierarchical: true`, D-09) — Tour ka nahi. */
    nested: true,
    /** Byline me author nahi — client ne `Andaman Tourism team` hataya. */
    bylineHint: 'Updated · min read',
    /** Featured image na ho to hero bina image ke — koi Settings wala fallback nahi. */
    featuredHint:
      'Optional. The banner behind the page heading — leave it empty and there is no banner.',
    blocks: POST_BLOCK_TYPES,
  },

  tourPage: {
    key: 'tourPage',
    label: 'Tour Page',
    basePath: '/tour',
    /** `Page header` panel — heading + sub heading. */
    header: true,
    subheading: true,
    /** Eyebrow + Stat rail — `tour-v3.html` ke hero wale panel. */
    eyebrow: true,
    statRail: true,
    /** Sidebar ka chunav page pe (D-88). */
    sidebar: true,
    /** `Parent` ka dropdown — breadcrumb isi se banta hai (D-87 §12). */
    parent: true,
    featuredHint: 'Optional. Na daali to Settings wali universal image aayegi.',
    blocks: ['richText', 'twoColumn', 'cards', 'packageList', 'faqs'],
  },

  /**
   * Blog ka listing page — `blog-v1.html` (spec 008).
   *
   * ⚠️ `eyebrow`/`statRail` `false` — na Eyebrow, na Stat rail. Dono `tour-v3.html` ke hero ki cheezein hain
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
    subheading: true,
    eyebrow: false,
    statRail: false,
    sidebar: true,
    /**
     * ⚠️ **`parent: false` — client, 10 Sep: _"ye to khud hi parent hai"_.**
     *
     * Blog listing page site ka ek top-level page hai, aur (spec 008 ke URL switch ke baad)
     * **post uske bachche** honge. Use kisi aur page ke andar rakhne ka koi matlab nahi banta;
     * dropdown wahan hota to wo ek aisa control hota jise chunne ki zaroorat kabhi na padti —
     * aur khaali/bemaani control wahi cheez hai jo client se sawaal karwati hai (D-30).
     */
    parent: false,
    featuredHint: 'Optional. Na daali to Settings wali universal image aayegi.',
    blocks: BLOG_PAGE_BLOCK_TYPES,
  },

  /**
   * Blog post — `blog-detail-v1.html` (spec 008).
   *
   * ⚠️ **`header: false` — 11 Sep (client, D-93).** Page Header hat gaya, post ka `<h1>` ab
   * uska **Title** hai: _"heading will be title now no need extra same heading same title"_.
   * 10 Sep ko yahan `header: true` tha (_"blog ki heading aur slug alag rahenge"_). Poora tark
   * `content-types.js` me `POST_FIELDS` ke upar hai.
   *
   * `subheading` phir bhi nahi hai — uski jagah **Excerpt** hai, jo listing card pe bhi wahi
   * text dikhata hai.
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
    subheading: false,
    eyebrow: false,
    statRail: false,
    sidebar: false,
    /**
     * ⚠️ **Post ka parent bhi dropdown se nahi chunta.** Uska URL `post` type ke `urlPattern`
     * se banta hai (`/blog/{slug}`), aur wo chunav `Settings ▸ Blog settings` me ek baar hota
     * hai — har post pe nahi. Yahan dropdown rakhne ka matlab hota do jagah ek hi faisla.
     */
    parent: false,
    /** Excerpt aur Category sirf post pe — `tourPage` ko dono ki zaroorat hi nahi. */
    excerpt: true,
    categories: true,
    featuredHint: 'Optional. Na daali to Settings wali universal image aayegi.',
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
      /** Kai categories — checkboxes (client, 11 Sep, D-93). DB ka shape wahi `categories[]`. */
      categoryIds: entry?.taxonomies?.categories ?? [],
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
    const fields = config.statRail
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
      ...(config.categories ? { taxonomies: { categories: form.categoryIds } } : {}),
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

  /**
   * Tour/Blog page root pe baithte hain — `/{slug}` (D-87 §1). **Page** parent ke neeche
   * (`hierarchical`, D-09): `/andaman-beaches/beach-name`. Asli path server banata hai; ye sirf
   * dikhane ke liye hai.
   */
  const parentPath = config.nested
    ? (parentOptions.find((p) => p.id === form.parentId)?.path ?? '').replace(/\/$/, '')
    : ''
  const permalink = `${parentPath}/${form.slug || '…'}`

  /**
   * Hero button ka ek khaana badlo — dusra waisa ka waisa. Khaali object se shuru, taaki naye
   * page pe `fields.heroButton` na ho tab bhi chale.
   */
  const setHeroButton = (key, value) =>
    setField('heroButton', { label: '', url: '', ...form.fields.heroButton, [key]: value })

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
          {(config.header || config.subheading || config.heroButtons) && (
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
                {config.header && (
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
                )}

                {config.eyebrow && (
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
                {/*
                 * ⚠️ **Post pe sub heading nahi hai** — uski jagah **Excerpt** ka panel hai, jo
                 * listing card pe bhi wahi text dikhata hai. Do field rakhne ka matlab hota ki
                 * card kuch kahe aur page kuch aur (D-86).
                 *
                 * Neeche wali hint bhi post pe galat hoti: uska banner Settings se nahi aata.
                 */}
                {config.subheading && (
                  <>
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
                      {config.key === 'page' ? (
                        <>
                          The big heading is the <b>Title</b> above. The breadcrumb is built from
                          the page&rsquo;s <b>Parent</b>. The banner image is the page&rsquo;s{' '}
                          <b>Featured image</b>.
                        </>
                      ) : (
                        <>
                          The big heading comes from the Title above. The breadcrumb is built from
                          the page&rsquo;s <b>Parent</b>. The banner image comes from Settings — a
                          page with its own Featured image uses that instead.
                        </>
                      )}
                    </div>
                  </>
                )}

                {/*
                 * Hero ke do button — **page ka apna** (client, 14 Sep, D-95): _"pages par specific
                 * rahega inside edit page"_. Tour page ka button `Tour settings` me hai, sab Tour
                 * pages ke liye ek.
                 *
                 * ⚠️ WhatsApp ka **number yahan nahi** — Settings ▸ General ka hi. Page sirf tick
                 * karta hai ki button dikhe. Default **ticked** (payload `!== false` padhta hai),
                 * reference me dono button hain.
                 */}
                {config.heroButtons && (
                  <>
                    <div className="row2">
                      <div className="field">
                        <label>Button label</label>
                        <input
                          className="inp"
                          placeholder="Plan a trip here"
                          value={form.fields.heroButton?.label ?? ''}
                          onChange={(e) => setHeroButton('label', e.target.value)}
                          disabled={readOnly}
                        />
                      </div>
                      <div className="field">
                        <label>Button link</label>
                        <input
                          className="inp"
                          placeholder="#enquiry or /contact-us"
                          value={form.fields.heroButton?.url ?? ''}
                          onChange={(e) => setHeroButton('url', e.target.value)}
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                    <label className="inline-lbl">
                      <input
                        type="checkbox"
                        checked={form.fields.showWhatsapp !== false}
                        onChange={(e) => setField('showWhatsapp', e.target.checked)}
                        disabled={readOnly}
                      />{' '}
                      Show WhatsApp button
                    </label>
                    <div className="hint">
                      Leave the label or the link empty and that button does not appear. The
                      WhatsApp number comes from <b>Settings ▸ General</b>.
                    </div>
                  </>
                )}
              </div>
            </Panel>
          )}

          {/* ---- STAT RAIL ---- reference ka `.vrail` — Tour aur Page (D-95) ---- */}
          {config.statRail && (
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

          {/* ---- EXCERPT ---- sirf post pe (spec 008) ---- */}
          {config.excerpt && (
            /*
             * ⚠️ **Content (aur uske FAQ block) ke baad** — client, 11 Sep (D-93). Pehle ye Page
             * Header ke neeche, content se upar tha.
             *
             * **Optional hai.** Khaali ho to card content ki pehli lines dikhata hai (server pe,
             * `autoExcerpt()`), aur post page pe excerpt waise bhi nahi chhapta. Likha ho to wo meta
             * description ka fallback bhi hai — isiliye hint me dono baatein likhi hain.
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
                    Optional. The line under the title on listing cards — leave it empty and the
                    card shows the first lines of the content instead. When filled in, it is also
                    the meta description if the <b>SEO</b> panel is left empty.
                  </div>
                </div>
              </div>
            </Panel>
          )}
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
                The byline on the page (<i>{config.bylineHint ?? 'author · Updated · min read'}</i>)
                is built from these <b>automatically</b> — there is no field for it.
              </div>
            </div>
          </Panel>

          <Panel title="Page settings">
            <div className="panel-body">
              {/* ---- CATEGORY ---- sirf post pe (spec 008) ---- */}
              {config.categories && (
                /*
                 * ⚠️ **Kai categories — checkboxes** (client, 11 Sep, D-93: _"category will be
                 * checkbox not dropdown so user can choose multiple"_). 10 Sep se yahan ek
                 * dropdown tha. Nateeje client ne jaan kar chune: card aur hero pe **saare**
                 * badge, aur pills/Topics me post har chuni hui category me ginta hai.
                 *
                 * Kram **list ka** hai, tick karne ka nahi — warna do post pe wahi categories
                 * alag kram me badge dikhatin.
                 *
                 * ⚠️ **Tags yahan nahi hain** — client ne 9 Sep ko mana kiya, aur `post` ke
                 * `taxonomyTypes` se bhi wo hat chuka hai.
                 */
                <div className="field">
                  <label>Categories</label>
                  {categories.map((c) => (
                    <label
                      key={c.id}
                      className="inline-lbl"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}
                    >
                      <input
                        type="checkbox"
                        checked={form.categoryIds.includes(c.id)}
                        disabled={readOnly}
                        onChange={(e) => {
                          const next = new Set(form.categoryIds)
                          if (e.target.checked) next.add(c.id)
                          else next.delete(c.id)
                          set({
                            categoryIds: categories.map((x) => x.id).filter((x) => next.has(x)),
                          })
                        }}
                      />
                      {c.name}
                    </label>
                  ))}
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

                  {/*
                   * `On this page` — **har page pe** (client, 14 Sep, D-95). Post pe yahi checkbox
                   * `Blog settings` me sab posts ke liye ek hai; page ki sidebar hi per-page hai.
                   *
                   * ⚠️ Sirf sidebar chuni ho tabhi dikhta hai — TOC sidebar ke **andar** baithti hai.
                   * `none` pe checkbox dikhana ek aisa control hota jo kuch nahi karta (D-30). Value
                   * mitti nahi, `sidebarId` jaisi hi.
                   */}
                  {config.toc && (form.fields.sidebar ?? 'none') !== 'none' && (
                    <div className="field">
                      <label className="inline-lbl">
                        <input
                          type="checkbox"
                          checked={form.fields.showToc !== false}
                          onChange={(e) => setField('showToc', e.target.checked)}
                          disabled={readOnly}
                        />{' '}
                        Show &ldquo;On this page&rdquo;
                      </label>
                      <div className="hint">
                        A contents list at the top of the sidebar, built from the H2 headings in the
                        content. It appears once the page has at least three.
                      </div>
                    </div>
                  )}
                </>
              )}

              {/*
               * ⚠️ **Parent sirf wahan jahan wo sach me chunna padta hai.** Blog page khud
               * parent hai aur post ka parent URL pattern se aata hai — dono jagah ye dropdown
               * ek aisa control hota jise koi kabhi chhoota hi nahi.
               */}
              {config.parent && (
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
                    {config.nested && ' The page address goes under the parent’s address too.'}
                  </div>
                </div>
              )}

              {/*
               * ⚠️ `onSelect` ko **poora media document** milta hai, uski id nahi — wahi shape
               * jo `PackageEdit` pe hai. Library se chunna hi pehla raasta hai (D-78).
               */}
              <MediaDrop
                label="Featured image"
                hint={config.featuredHint}
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
