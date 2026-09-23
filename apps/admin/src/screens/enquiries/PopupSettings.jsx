import { POPUP_PAGE_TYPES, updateSettingsSchema } from '@cms/shared'
import { useEffect, useMemo, useState } from 'react'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useForms } from '../forms/useForms.js'
import HtmlEditor from '../packages/HtmlEditor.jsx'
import '../settings/Settings.css'

/**
 * **Enquiries ▸ Popup** — poori site ka ek popup form (client, 21 Sep, D-103).
 *
 * ## Screen yahan hai, data `settings` me — aur ye teesri baar hai
 *
 * Client ne jagah khud chuni: _"popup enquiries me banega as a submenu"_. Storage phir bhi
 * `settings.popupSettings` hai, kyunki ye ek **singleton** hai (client: _"single popup only and
 * single setting for all pages"_). Bilkul wahi batwara jo `Tour settings` (8 Sep) aur
 * `Blog settings` (D-93) pe hua — **screen ki jagah data ki jagah tay nahi karti**.
 *
 * ## Popup ke apne fields nahi hain
 *
 * Screenshot me saat khaane the (Name · Email · Phone · Date of Travel · Trip Duration · Number
 * of People · Message). Wo sab yahan **nahi** banaye jaate — client `Enquiry Forms` me form
 * banata hai aur yahan use sirf **chun** leta hai. Form ki paribhasha do jagah rakhne ka nateeja
 * D-86 me dekha ja chuka hai.
 */

/** Khaali — naye instance pe `popupSettings` `{}` hota hai. */
const EMPTY = {
  enabled: false,
  formId: '',
  heading: '',
  formHeading: '',
  imageIds: [],
  delaySeconds: 5,
  frequency: 'session',
  frequencyDays: 7,
  showOn: Object.fromEntries(POPUP_PAGE_TYPES.map((t) => [t, false])),
}

/** UI ke naam — value hi contract hai (R11/R17). Internal naam kabhi nahi dikhte. */
const PAGE_TYPE_LABELS = {
  homePage: 'Home page',
  package: 'Packages',
  tourPage: 'Tour pages',
  post: 'Blog posts',
  blogPage: 'Blog listing',
  page: 'Pages',
}

const FREQUENCY_LABELS = {
  session: 'Once per visit',
  once: 'Only once, ever',
  days: 'Again after a few days',
  always: 'Every time the page opens',
}

export default function PopupSettings() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [popup, setPopup] = useState(null)
  const [media, setMedia] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  /**
   * ⚠️ `useMemo` ke bina har render pe naya object banta aur requests ka infinite loop chal
   * padta — wahi bug jo 8 Sep ko `PageEdit` pe pakda gaya tha (_"Bahut zyada requests"_).
   */
  const formQuery = useMemo(() => ({ status: 'active', limit: 200 }), [])
  const { data: forms, loading: formsLoading } = useForms(formQuery)

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => {
        const saved = res.data.data.settings.popupSettings ?? {}
        const next = {
          ...EMPTY,
          ...saved,
          showOn: { ...EMPTY.showOn, ...(saved.showOn ?? {}) },
          imageIds: saved.imageIds ?? [],
        }
        setPopup(next)
        return loadMedia(next.imageIds)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  /** Har chuni hui image ka poora record — preview ke liye. Na mile to chhod do (D-42 §2). */
  async function loadMedia(ids) {
    const entries = await Promise.all(
      (ids ?? []).filter(Boolean).map(async (id) => {
        try {
          return [id, (await api.get(`/media/${id}`)).data.data.media]
        } catch {
          return [id, null]
        }
      }),
    )
    setMedia((cur) => ({ ...cur, ...Object.fromEntries(entries.filter(([, m]) => m)) }))
  }

  const set = (key, value) => setPopup((p) => ({ ...p, [key]: value }))
  const setShowOn = (type, value) =>
    setPopup((p) => ({ ...p, showOn: { ...p.showOn, [type]: value } }))

  /**
   * Popup ki **ek** image (client, 23 Sep — pehle 0–3 thi). Contract abhi bhi array hai
   * (`POPUP_MAX_IMAGES` = 1), isliye yahan `[id]` ya `[]`. Khaali = popup sirf form.
   */
  const setImage = (id) => set('imageIds', id ? [id] : [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    /** Wahi schema jo server use karta hai (R8) — galti yahin pakdi jaaye, 400 se pehle. */
    const parsed = updateSettingsSchema.safeParse({ popupSettings: popup })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      /**
       * ⚠️ **Iska test response nahi, DB padhta hai.** Gate do jagah khisak sakta hai: field
       * `schemas/settings.js` me na ho to Zod use chup-chaap gira degi, aur `settings/model.js`
       * me na ho to **Mongoose `strict`**. Dono soorat me API `200` degi aur yahan `"Saved."`
       * chhapega, par DB me purani value rahegi.
       */
      const res = await api.patch('/settings', { popupSettings: parsed.data.popupSettings })
      const saved = res.data.data.settings.popupSettings ?? {}
      setPopup({
        ...EMPTY,
        ...saved,
        showOn: { ...EMPTY.showOn, ...(saved.showOn ?? {}) },
        imageIds: saved.imageIds ?? [],
      })
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!popup) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  const chosenPages = POPUP_PAGE_TYPES.filter((t) => popup.showOn[t])
  const imageId = popup.imageIds[0] ?? ''

  return (
    <>
      <div className="page-head">
        <h1>Popup</h1>
      </div>

      <p className="subtitle">
        One popup for the whole site. It uses a form you have already built in Enquiry Forms.
      </p>

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice ok" role="status">
          <span>{notice}</span>
        </div>
      )}
      {!canEdit && (
        <div className="notice warn">
          <span>You can view these settings but not change them.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={!canEdit}>
          <div className="panel">
            <div className="panel-head">
              <h2>The popup</h2>
            </div>

            <div className="panel-body">
              <div className="field">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={popup.enabled}
                    onChange={(e) => set('enabled', e.target.checked)}
                  />
                  <span>Show this popup on the site</span>
                </label>
                <div className="hint">
                  Turn this off when a campaign ends. Everything you have filled in is kept, so the
                  next campaign only needs the wording changed.
                </div>
              </div>

              <div className="field">
                <label htmlFor="pop-form">Enquiry form</label>
                <select
                  id="pop-form"
                  className="sel"
                  value={popup.formId}
                  onChange={(e) => set('formId', e.target.value)}
                >
                  <option value="">— Select a form —</option>
                  {(forms ?? []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <div className="hint">
                  {formsLoading
                    ? 'Loading forms…'
                    : 'Only active forms are listed. Without a form the popup is never shown.'}
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>What it says</h2>
            </div>

            <div className="panel-body">
              {/*
                ⚠️ Label `HtmlEditor` ko **prop se nahi** diya jaata — wo use leta hai par
                render nahi karta (pre-existing, lint isi pe error deta hai). Baaki har screen
                (`SidebarWidgets`, `BookingPanel`) label bahar `.field` me likhti hai; wahi
                yahan bhi. Prop bhej dene se label chup-chaap gayab hota — is repo wala hi
                "bana hua par juda nahi".
              */}
              <div className="field">
                <label>Heading</label>
                <HtmlEditor
                  value={popup.heading}
                  onChange={(v) => set('heading', v)}
                  disabled={!canEdit}
                  height={120}
                />
                <div className="hint">Sits over the image, e.g. “Special Offers”.</div>
              </div>

              <div className="field">
                <label>Heading above the form</label>
                <HtmlEditor
                  value={popup.formHeading}
                  onChange={(v) => set('formHeading', v)}
                  disabled={!canEdit}
                  height={120}
                />
              </div>

              {/*
                `Text above the form` 23 Sep ko hata (client: _"popup se hatao"_) — D-103 §11.
              */}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Image</h2>
            </div>

            <div className="panel-body">
              <MediaDrop
                label="Image"
                hint="1200×800 · PNG, JPG or WebP"
                media={media[imageId]}
                onSelect={(chosen) => {
                  setImage(chosen.id)
                  setMedia((cur) => ({ ...cur, [chosen.id]: chosen }))
                }}
                onClear={() => setImage(null)}
              />
              <div className="hint">
                One image across the top of the popup. Leave it empty and the popup is just the
                form.
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>When it appears</h2>
            </div>

            <div className="panel-body row2">
              <div className="field">
                <label htmlFor="pop-delay">Show after</label>
                <input
                  id="pop-delay"
                  className="inp"
                  type="number"
                  min="0"
                  max="300"
                  value={popup.delaySeconds}
                  onChange={(e) => set('delaySeconds', Number(e.target.value))}
                />
                <div className="hint">
                  Seconds after the page opens. <b>0</b> shows it straight away.
                </div>
              </div>

              <div className="field">
                <label htmlFor="pop-freq">Show again</label>
                <select
                  id="pop-freq"
                  className="sel"
                  value={popup.frequency}
                  onChange={(e) => set('frequency', e.target.value)}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <div className="hint">
                  Counted in the visitor’s own browser. If they clear their history the popup can
                  come back.
                </div>
              </div>

              {/*
                Days ka khaana sirf tab jab uska matlab ho — warna wo ek aisa number hai jo
                chup-chaap kuch nahi karta, aur client uspe bharosa kar baithta hai.
              */}
              {popup.frequency === 'days' && (
                <div className="field">
                  <label htmlFor="pop-days">Days before it shows again</label>
                  <input
                    id="pop-days"
                    className="inp"
                    type="number"
                    min="1"
                    max="365"
                    value={popup.frequencyDays}
                    onChange={(e) => set('frequencyDays', Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Where it appears</h2>
            </div>

            <div className="panel-body">
              {POPUP_PAGE_TYPES.map((type) => (
                <div className="field" key={type}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={popup.showOn[type]}
                      onChange={(e) => setShowOn(type, e.target.checked)}
                    />
                    <span>{PAGE_TYPE_LABELS[type]}</span>
                  </label>
                </div>
              ))}

              <div className="hint">
                {chosenPages.length === 0
                  ? 'Nothing is ticked, so the popup is not shown anywhere.'
                  : 'New pages of a ticked kind get the popup on their own — you do not have to come back here.'}
              </div>
            </div>

            <div className="panel-foot">
              <button className="btn primary" type="submit" disabled={saving || !canEdit}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </>
  )
}
