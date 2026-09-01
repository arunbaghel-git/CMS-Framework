import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { contentFromRichText, emptyContent } from '@cms/shared'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import Panel from '../../components/admin/Panel.jsx'
import SortablePanels from '../../components/admin/SortablePanels.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import FaqsPanel from './FaqsPanel.jsx'
import HotelsPanel from './HotelsPanel.jsx'
import ItineraryBuilder from './ItineraryBuilder.jsx'
import PricingPanel from './PricingPanel.jsx'
import RichTextEditor from './RichTextEditor.jsx'
import {
  PACKAGE_TYPE,
  useAddOnList,
  useHotelList,
  useMediaById,
  usePackage,
  useTaxonomyList,
  useTransferList,
} from './usePackages.js'
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
 * | Package Details | ✅ par **sidebar se main column me** — client, 26 Aug. Paanch field bhi hataye: Package Code, Difficulty, Group Size, Trending ribbon, Enable enquiry form |
 * | Destinations | ✅ |
 * | Travel Themes | ✅ par ab wo **Package Type** hai — free-tag input ki jagah managed list (spec 007 §1.2) |
 * | Gallery | ✅ sirf **banner** — media grid hata diya gaya (§5.1) |
 * | SEO | ✅ |
 * | Itinerary Builder | ✅ Slice 4 — `ItineraryBuilder.jsx` |
 * | Pricing · FAQs | ❌ **Slice 5-6** |
 * | Inclusions & Exclusions | ❌ **hata diya gaya** — ab wo global hai (§1.5) |
 *
 * Jo panels abhi nahi hain wo **khaali dikhaye bhi nahi jaate**. Ek panel jisme kuch na
 * ho, wo "abhi nahi bana" nahi lagta — wo "toota hua" lagta hai (D-30 ka ulta).
 *
 * ⚠️ **`shortDescription` main column me hai, sidebar me nahi** — client ka faisla (26 Aug).
 * Wo public page ka `pintro` hai, yaani page ka content. Baaki Package Details (nights/days,
 * best season, featured) sidebar me hi hain, design ke hisaab se.
 *
 * `bestFor` aur `ferriesNote` ek **Info** panel me hain — dono is package ke *baare me*
 * hain, uske structure ka hissa nahi (D-55).
 *
 * **Sidebar ke panels collapsible hain** — design me har panel ke head me `▾` hai (40
 * jagah), wo pehle chhoot gaya tha.
 *
 * Overview ka editor **TipTap** hai (A-8). Uska `getJSON()` seedha `content.blocks[0]
 * .props.doc` me jaata hai — wahi shape jo spec 002 ka `richText` block rakhta hai. Jab
 * editor ek saada textarea tha tab bhi yahi doc banta tha, isliye is switch pe **koi
 * migration nahi lagi**.
 */

/**
 * Status ke do hi vikalp — **Draft aur Published** (client, 1 Sep).
 *
 * `Pending review` yahan se hat gaya. Wo sirf ek dropdown option nahi tha: uske peeche
 * `POST /entries/:id/submit-review` hai, aur `contributor` role publish **kar hi nahi
 * sakta** — uske liye review ke liye bhejna hi ek raasta tha (D-25 / D-26).
 *
 * API ka wo raasta **jaisa ka waisa hai** — sirf is screen se chunav hat gaya. Client ke
 * paas aaj koi contributor user hai hi nahi, aur jis din banega us din ye option wapas is
 * list me daalna ek line ka kaam hai. Route hata dena uska ulta hota: permission, service
 * aur test sab dobara likhne padte.
 */
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
]

/**
 * Purani `pending` wali entry ke liye ek chhupa hua option.
 *
 * Iske bina bug **chup** hota: `<select>` ki `value` un options me se kisi se match nahi
 * karti, to browser pehla option (`Draft`) dikha deta — aur user ko lagta ki entry draft
 * hai. Save karte hi wo sach me draft ban jaati, bina kisi ke chhue.
 *
 * Ye tabhi judta hai jab entry sach me `pending` pe ho. Chunne laayak nahi hai: yahan se
 * nikalne ka raasta hai, wapas jaane ka nahi.
 */
const PENDING_OPTION = { value: 'pending', label: 'Pending review (old)', disabled: true }

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
  const transfers = useTransferList()
  const hotels = useHotelList()
  const addOns = useAddOnList()

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
      }
      /*
       * Yahan pehle ek teesri branch thi — `pending` chunne pe `submit-review`. Status ka
       * wo option 1 Sep ko hat gaya (upar), isliye wo branch pahunch se bahar ho gayi thi.
       * API ka route abhi bhi hai; option wapas aane pe branch bhi wapas aayegi.
       */

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

          {/*
           * Ek field — koi panel nahi, koi heading nahi (client, 26 Aug).
           *
           * `shortDescription` public page ka `pintro` hai — title ke turant neeche wali
           * line. Isliye wo editor ke saath baithta hai, sidebar ke meta boxes me nahi.
           */}
          <div className="field">
            <label>Short description</label>
            <textarea
              className="ta"
              value={form.fields.shortDescription ?? ''}
              onChange={(e) => setField('shortDescription', e.target.value)}
              disabled={readOnly}
            />
          </div>

          {/*
           * "Info" — page ke At-a-glance wale hisse ke fields (client, 26 Aug).
           *
           * Ye Package Details se alag hain: nights/days/best season **package ka structure**
           * batate hain, jabki ye do us structure ke **baare me** hain — kiske liye theek
           * hai, aur ferries ka kya hisaab. Isliye ye main column me itinerary ke paas hain,
           * sidebar ke meta boxes me nahi.
           */}
          <SortablePanels storageKey="package-edit-panels" disabled={readOnly}>
            <Panel key="info" title="Info">
              <div className="panel-body">
                <div className="field">
                  <label>Best for</label>
                  <input
                    className="inp"
                    placeholder="first-timers on a short break"
                    value={form.fields.bestFor ?? ''}
                    onChange={(e) => setField('bestFor', e.target.value)}
                    disabled={readOnly}
                  />
                  <div className="hint">
                    Shows on the listing card — this line comes after <b>Best for</b>. Not on the
                    package page.
                  </div>
                </div>

                <div className="field">
                  <label>Ferries</label>
                  <input
                    className="inp"
                    placeholder="3 legs, included"
                    value={form.fields.ferriesNote ?? ''}
                    onChange={(e) => setField('ferriesNote', e.target.value)}
                    disabled={readOnly}
                  />
                  <div className="hint">
                    Shows in &quot;At a glance&quot; on the page. Not counted automatically —
                    something like &quot;included&quot; can&rsquo;t be worked out from the
                    itinerary.
                  </div>
                </div>
              </div>
            </Panel>

            <ItineraryBuilder
              key="itinerary"
              days={form.fields.itinerary ?? []}
              onChange={(itinerary) => setField('itinerary', itinerary)}
              destinations={destinations}
              transfers={transfers}
              disabled={readOnly}
            />

            {/*
             * Pricing aur Hotels — design me ye Itinerary Builder ke baad hi aate hain
             * ("Pricing & Departures" panel), aur wahi default kram yahan bhi hai.
             *
             * Do alag panel hone ki wajah: pricing poore package ki baat hai aur hotels har
             * destination ki. Ek panel me daalne ka matlab hota ek lambi body jisme do alag
             * kism ki tables hain.
             */}
            <Panel key="pricing" title="Pricing">
              <PricingPanel
                pricing={form.fields.pricing}
                onChange={(pricing) => setField('pricing', pricing)}
                disabled={readOnly}
              />
            </Panel>

            <Panel key="hotels" title="Hotels">
              <HotelsPanel
                rows={form.fields.hotels ?? []}
                onChange={(rows) => setField('hotels', rows)}
                days={form.fields.itinerary ?? []}
                pricing={form.fields.pricing}
                destinations={destinations}
                hotels={hotels}
                disabled={readOnly}
              />
            </Panel>

            {/*
             * FAQs — design me ye panel "FAQs & Policies" tha; client ne sirf FAQs maanga
             * (27 Aug, D-59). Cancellation policy wahin hai jahan wo pehle se thi —
             * packageDefaults, kyunki wo har package pe same hai (§2.1).
             */}
            <Panel key="faqs" title="FAQs">
              <FaqsPanel
                faqs={form.fields.faqs ?? []}
                onChange={(faqs) => setField('faqs', faqs)}
                disabled={readOnly}
              />
            </Panel>
          </SortablePanels>
        </div>

        <aside>
          <Panel
            title="Publish"
            footer={
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
                  {(form.status === 'pending'
                    ? [PENDING_OPTION, ...STATUS_OPTIONS]
                    : STATUS_OPTIONS
                  ).map((o) => (
                    <option key={o.value} value={o.value} disabled={o.disabled}>
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

              <div className="pub-row">
                <span className="k">Last updated:</span>
                <span className="muted">
                  {entry?.updatedAt ? new Date(entry.updatedAt).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Package Details">
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
                <label>Best Season</label>
                <input
                  className="inp"
                  placeholder="Oct – May"
                  value={form.fields.bestSeason ?? ''}
                  onChange={(e) => setField('bestSeason', e.target.value)}
                  disabled={readOnly}
                />
              </div>

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
          </Panel>

          <Panel title="Destinations">
            <div className="panel-body">
              <TaxonomyChecklist
                items={destinations}
                selected={form.taxonomies.destinations}
                onToggle={(taxonomyId) => toggleTaxonomy('destinations', taxonomyId)}
                disabled={readOnly}
              />
            </div>
          </Panel>

          <Panel title="Package Type">
            <div className="panel-body">
              <TaxonomyChecklist
                items={packageTypes}
                selected={form.taxonomies.packageTypes}
                onToggle={(taxonomyId) => toggleTaxonomy('packageTypes', taxonomyId)}
                disabled={readOnly}
              />
            </div>
          </Panel>

          {/*
           * Add-ons — spec §1.4: "editor me checkbox list hogi".
           *
           * Sidebar me isliye ki ye Destinations aur Package Type jaisa hi kaam hai: ek
           * managed list me se **chunna**.
           *
           * ⚠️ Ye panel D-61 me hata diya gaya tha (add-ons tab global ho gaye the) aur D-64
           * me wapas aaya. Aaj ka niyam wahi hai jo spec §1.4 me likha tha — poori list kabhi
           * nahi chhapti, kyunki jo package Havelock jaata hi nahi uspe wahan ke add-ons
           * dikhana galat hai.
           */}
          <Panel title="Add-ons">
            <div className="panel-body">
              {addOns.length === 0 ? (
                <p className="subtitle" style={{ margin: 0 }}>
                  No add-ons yet.
                </p>
              ) : (
                <div className="checklist">
                  {addOns.map((addOn) => (
                    /*
                     * `.inline-lbl` — wahi primitive jo upar TaxonomyChecklist use karta hai.
                     *
                     * Iske bina ye `<label>` browser ke default **inline** pe the, to teen-teen
                     * ek line me bharte the aur naam beech se toot jaate the (client, 1 Sep).
                     * Destinations ki checklist pehle se theek dikhti thi — farq sirf ye class
                     * thi.
                     */
                    <label className="inline-lbl" key={addOn.id}>
                      <input
                        type="checkbox"
                        checked={(form.fields.addOns ?? []).includes(addOn.id)}
                        disabled={readOnly}
                        onChange={() => {
                          const current = form.fields.addOns ?? []
                          setField(
                            'addOns',
                            current.includes(addOn.id)
                              ? current.filter((x) => x !== addOn.id)
                              : [...current, addOn.id],
                          )
                        }}
                      />
                      {addOn.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Gallery">
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
          </Panel>

          <Panel title="SEO">
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
          </Panel>
        </aside>
      </div>
    </>
  )
}
