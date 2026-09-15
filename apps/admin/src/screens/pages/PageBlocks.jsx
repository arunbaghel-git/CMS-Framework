import {
  ENTRY_LIST_MAX_LIMIT,
  PAGE_BLOCK_TYPES,
  POST_LIST_MAX_FEATURED,
  POST_LIST_PER_PAGE_DEFAULT,
} from '@cms/shared'
import { useEffect, useId, useMemo, useState } from 'react'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import { useListDrag } from '../../lib/drag-list.js'
import { useEntryList, useMediaById } from '../../lib/use-entries.js'
import { useForms } from '../forms/useForms.js'
import HtmlEditor from '../packages/HtmlEditor.jsx'
import { useTaxonomyList } from '../packages/usePackages.js'
import './PageBlocks.css'

/**
 * Content ke blocks ka editor — `admin-design-v3.html` ke `#s-page-edit` se (D-87 §7).
 *
 * ⚠️ **Blocks content editor ke ANDAR nahi bante** — client ka faisla (7 Sep). Har block apna
 * panel hai, `Add block` dropdown se judta hai, aur grip se reorder hota hai. Pehle wala model
 * (blocks HTML ke andar `<div id="blk-…">`) client ne demo me dekh kar mana kiya.
 *
 * **Normal likhai bhi ek block hai** (`richText`, UI me "Text"). Isi se layout blocks content
 * ke **beech** me aa sakte hain — jaise reference page pe hain (`h2 → package list → h2 →
 * cards`). Ek page pe kai Text block hote hain, aur wo bilkul normal haalat hai.
 */

/** Dropdown ke naam — `type` DB me stored data hai (R6), label sirf UI ke liye. */
const BLOCK_LABEL = {
  richText: 'Text',
  twoColumn: 'Two column',
  cards: 'Cards',
  packageList: 'Package list',
  postList: 'Post list',
  faqs: 'FAQs',
  heroForm: 'Hero with form',
}

/** Har block ka apna rang — design se hi (`.blk--*`). */
const BLOCK_CLASS = {
  richText: 'text',
  twoColumn: 'two',
  cards: 'cards',
  packageList: 'list',
  postList: 'list',
  faqs: 'faq',
  heroForm: 'hero',
}

/** `id` client pe banti hai — server bhi bhar deta hai, par reorder ke liye abhi chahiye. */
const newId = () =>
  `blk-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

/** Naye block ka khaali shape. Props server pe `.parse()` se bharenge, yahan sirf shuruaat. */
function emptyBlock(type) {
  const props = {
    richText: { html: '' },
    twoColumn: {
      heading: '',
      description: '',
      ratio: '50-50',
      left: '',
      right: '',
      reverseOnMobile: false,
    },
    cards: { heading: '', description: '', columns: 3, items: [] },
    packageList: {},
    postList: { heading: '', subheading: '', linkLabel: '', linkUrl: '', featuredIds: [] },
    faqs: { heading: '', description: '', items: [] },
    heroForm: {
      background: '',
      imageId: null,
      mobileImageId: null,
      title: '',
      description: '',
      stats: [],
      ribbon: '',
      formId: '',
      formHeading: '',
      formDescription: '',
    },
  }[type]

  return { id: newId(), type, props: props ?? {} }
}

/**
 * Band block pe bhi ek line dikhe — warna list sirf rangeen chip ki qatar ban jaati hai aur
 * client ko har block khol kar dekhna padta hai ki usme kya hai.
 */
function summarize(block) {
  const p = block.props ?? {}

  switch (block.type) {
    case 'richText': {
      const text = String(p.html ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return text ? text.slice(0, 90) + (text.length > 90 ? '…' : '') : 'Empty'
    }
    /*
     * Heading ab in dono pe bhi hai (D-88 §9), aur band panel pe wahi sabse kaam ki cheez hai —
     * client section ko uske naam se pehchanta hai, uske `50-50` ya `3 columns` se nahi.
     */
    case 'twoColumn':
      return p.heading || (p.ratio ?? '50-50')
    case 'cards':
      return `${p.heading ? `${p.heading} — ` : ''}${(p.items ?? []).length} card(s) · ${p.columns ?? 3} columns`
    case 'postList':
      return `${p.heading || 'Post list'} — ${(p.featuredIds ?? []).length} featured`
    case 'packageList':
      return p.heading || 'Package list'
    case 'faqs':
      return `${p.heading || 'FAQs'} — ${(p.items ?? []).length} question(s)`
    case 'heroForm': {
      const text = String(p.title ?? '')
        .replace(/<[^>]*>/g, '')
        .trim()
      return text || 'No title yet'
    }
    default:
      return block.type
  }
}

/* ── ek-ek block ka editor ─────────────────────────────────────────────────── */

function TextBlock({ props, onChange, disabled }) {
  return (
    <HtmlEditor
      value={props.html ?? ''}
      onChange={(html) => onChange({ ...props, html })}
      disabled={disabled}
      height={260}
    />
  )
}

function TwoColumnBlock({ props, onChange, disabled }) {
  return (
    <>
      {/* Cards wali hi wajah — D-88 §9. Design ke panel me sirf `Split` tha. */}
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />

      <div className="row2">
        {/*
         * ⚠️ `Included / Not included` pe poora look badal jaata hai (do rangeen dabbe), aur
         * wahan `Split` lagta hi nahi — design me wo dono khaane hamesha barabar hain.
         */}
        <div className="field">
          <label>Style</label>
          <select
            className="sel"
            value={props.style ?? 'plain'}
            onChange={(e) => onChange({ ...props, style: e.target.value })}
            disabled={disabled}
          >
            <option value="plain">Plain columns</option>
            <option value="includedExcluded">Included / Not included</option>
          </select>
        </div>

        {(props.style ?? 'plain') === 'plain' && (
          <div className="field">
            <label>Split</label>
            <select
              className="sel"
              value={props.ratio ?? '50-50'}
              onChange={(e) => onChange({ ...props, ratio: e.target.value })}
              disabled={disabled}
            >
              <option value="50-50">50 / 50</option>
              <option value="60-40">60 / 40</option>
              <option value="40-60">40 / 60</option>
            </select>
          </div>
        )}
      </div>

      {props.style === 'includedExcluded' && (
        <div className="hint">
          The left column is shown as <b>Included</b> (blue) and the right one as{' '}
          <b>Not included</b> (pink). Both columns are always equal width in this style.
        </div>
      )}

      {/*
       * Dono khaane apne-apne editor hain, ek hi HTML ke do hisse nahi (D-87 §7). Ek hi
       * field me rakhne ka matlab hota ki panel ko usme se apna hissa kaat kar nikaalna
       * pade — theek wahi jugaad jise client ne mana kiya.
       */}
      <div className="twocol">
        <div>
          <label className="blk-sublabel">Left</label>
          <HtmlEditor
            value={props.left ?? ''}
            onChange={(left) => onChange({ ...props, left })}
            disabled={disabled}
            height={170}
          />
        </div>
        <div>
          <label className="blk-sublabel">Right</label>
          <HtmlEditor
            value={props.right ?? ''}
            onChange={(right) => onChange({ ...props, right })}
            disabled={disabled}
            height={170}
          />
        </div>
      </div>

      <label className="inline-lbl" style={{ marginTop: 8 }}>
        <input
          type="checkbox"
          checked={Boolean(props.reverseOnMobile)}
          onChange={(e) => onChange({ ...props, reverseOnMobile: e.target.checked })}
          disabled={disabled}
        />{' '}
        On mobile, show the right column first
      </label>
    </>
  )
}

/**
 * Section ka heading + uske neeche ki line — **Cards, Two column aur FAQs teenon pe wahi**.
 *
 * ⚠️ Alag component isliye ki ye teen jagah bilkul ek jaisa hai, aur is repo me teen copies ka
 * nateeja pehle ho chuka hai (D-65/D-51/D-58, aur `bestFor` similar cards pe chhoot jaana).
 *
 * Description ek **asli editor** hai, plain text nahi (client, 8 Sep) — wahi jodi jo
 * `packageDefaults.sectionLabels` pe hai (D-65/D-69): client ko usme bold aur link chahiye
 * hote hain.
 */
function SectionHeadingFields({ props, onChange, disabled }) {
  return (
    <>
      <div className="field">
        <label>Heading</label>
        <input
          className="inp"
          value={props.heading ?? ''}
          onChange={(e) => onChange({ ...props, heading: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="field">
        <label>Description</label>
        <HtmlEditor
          value={props.description ?? ''}
          onChange={(description) => onChange({ ...props, description })}
          disabled={disabled}
          height={130}
        />
      </div>
    </>
  )
}

function CardsBlock({ props, onChange, disabled }) {
  const items = props.items ?? []
  const setItems = (next) => onChange({ ...props, items: next })

  const patch = (i, key, value) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)))

  return (
    <>
      {/*
       * ⚠️ Heading + description D-88 §9 me jude — design ke Cards panel me ye nahi hain
       * (`admin-design-v3.html:906` me sirf `Columns` hai).
       *
       * Design me ye upar wale **Text block** ki maani gayi thin, kyunki reference me teenon ek
       * hi `.blk` ke andar hain. Par hamare model me Text apna block hai — yaani admin me do
       * panel aur page pe ek dabba, jo client ko bug jaisa dikhta. Ab har layout block apna
       * poora section hai, aur wo `faqs`/`packageList` se bhi mel khaata hai.
       */}
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />

      <div className="field" style={{ maxWidth: 200 }}>
        <label>Columns</label>
        <select
          className="sel"
          value={props.columns ?? 3}
          onChange={(e) => onChange({ ...props, columns: Number(e.target.value) })}
          disabled={disabled}
        >
          <option value={2}>2 columns</option>
          <option value={3}>3 columns</option>
          <option value={4}>4 columns</option>
        </select>
      </div>

      <div className="cards-grid" style={{ '--cols': props.columns ?? 3 }}>
        {items.map((item, i) => (
          <div className="card-edit" key={item.id ?? i}>
            <input
              className="inp"
              style={{ fontWeight: 700 }}
              placeholder="Title"
              value={item.title ?? ''}
              onChange={(e) => patch(i, 'title', e.target.value)}
              disabled={disabled}
            />
            <textarea
              className="ta"
              style={{ minHeight: 64, fontSize: 12 }}
              value={item.text ?? ''}
              onChange={(e) => patch(i, 'text', e.target.value)}
              disabled={disabled}
            />
            {/*
             * `Tag (optional)` — design se. Pehle yahan ek icon ka dropdown banaya gaya tha;
             * wo mera andaza tha, design me kahin icon hai hi nahi (R15).
             */}
            <input
              className="inp"
              style={{ fontSize: 12 }}
              placeholder="Tag (optional)"
              value={item.tag ?? ''}
              onChange={(e) => patch(i, 'tag', e.target.value)}
              disabled={disabled}
            />
            {!disabled && (
              <button
                className="btn btn-sm btn-danger"
                type="button"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => setItems([...items, { id: newId(), title: '', text: '', tag: '' }])}
        >
          ＋ Card
        </button>
      )}
    </>
  )
}

/** Duration ke pills ke naam — reference se hi (`tour-v3.html`). */
const DURATION_LABEL = {
  d2: '2N / 3D',
  d3: '3N / 4D',
  d4: '4N / 5D',
  d5: '5N / 6D',
  d6: '6N / 7D',
  d7: '7N / 8D',
  d8plus: '8N and longer',
}

/** Picker me naam ke aage chhota meta — `5N / 6D`. Dono me se ek bhi na ho to khaali. */
function durationOf(fields) {
  const nights = fields?.nights
  const days = fields?.days

  if (nights == null && days == null) return ''

  return `${nights ?? '?'}N / ${days ?? '?'}D`
}

/**
 * `Package list` — **do column ka picker** (client, 8 Sep).
 *
 * ```
 * ◉ All  ○ Package Type [Honeymoon ▾]  ○ Destination [… ▾]  ○ Day wise
 *
 * ┌── SAARE PACKAGES ────────┐   ┌── IS PAGE PE ──────────────┐
 * │ Emerald Andaman    [＋]  │   │ ⠿ Discover Andaman    [✕]  │
 * │ Andaman Thrills    [＋]  │   │ ⠿ Andaman Escape      [✕]  │
 * │ Discover Andaman    ✓    │   │                            │
 * └──────────────────────────┘   └────────────────────────────┘
 * ```
 *
 * ⚠️ **Ye 7 Sep wale model se ulta hai.** Pehle block ek *filter* tha: client kasauti chunta
 * tha aur server list banata tha. Client ne wo dekh kar picker maanga — isliye `sort`,
 * `featuredFirst`, `durations` aur `limit` chaaron hat gaye. Jab kram aur ginti dono client tay
 * kar raha hai, unka koi matlab nahi bachta.
 *
 * ⚠️ **Radio, checkbox nahi** — client ka faisla: ek waqt me ek hi kasauti. Aur `Day wise` ka ek
 * **aur** kaam hai: wahi ek option page pe duration ki pills laata hai.
 */
function PackageListBlock({ props, onChange, disabled }) {
  /** Radio group ka naam har block pe alag hona chahiye — warna do Package list block ek doosre ka chunav badal dete. */
  const radioName = useId()
  const destinations = useTaxonomyList('destination')
  const packageTypes = useTaxonomyList('packageType')

  const browseBy = props.browseBy ?? 'all'
  const pageFilter = props.pageFilter ?? 'none'
  const chosen = props.packageIds ?? []

  /**
   * Search — **server pe** chalti hai (`q`, `searchText` pe regex), browser me nahi (R14).
   *
   * ⚠️ Debounce zaroori hai: bina uske har keystroke ek API call banati, kyunki hook apni dep
   * badalte hi refetch karta hai. 300ms wahi hai jo aadmi ke rukne aur list ke badalne ke beech
   * chubhta nahi.
   */
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setApplied(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  /**
   * Baayen wali list — **filter server pe lagta hai, browser me nahi** (R14).
   *
   * ⚠️ Yahan `browseBy` chalta hai, `pageFilter` **nahi**. Dono alag cheezein hain: ye picker me
   * dhoondhne ke liye hai, wo page pe visitor ke liye (client, 8 Sep).
   */
  const {
    data: pool,
    loading,
    error,
  } = useEntryList('package', {
    /**
     * ⚠️ **`ENTRY_LIST_MAX_LIMIT` se, haath se likha number nahi.** Pehle yahan `200` tha — wo
     * `useTaxonomyList` se uthaya gaya tha, jahan cap sach me 200 hai. Entries pe cap 100 hai,
     * to har request 400 khaati thi aur picker khaali dikhta tha.
     */
    limit: ENTRY_LIST_MAX_LIMIT,
    status: 'published',
    ...(applied ? { q: applied } : {}),
    ...(browseBy === 'packageType' && props.packageTypeId
      ? { packageTypes: props.packageTypeId }
      : {}),
    ...(browseBy === 'destination' && props.destinationId
      ? { destinations: props.destinationId }
      : {}),
    ...(browseBy === 'duration' && props.browseDuration ? { duration: props.browseDuration } : {}),
  })

  /** Daayen wali list ka kram — `packageIds` hi kram hai, isliye reorder yahin hota hai. */
  const move = (from, to) => {
    if (to < 0 || to >= chosen.length) return
    const next = [...chosen]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    onChange({ ...props, packageIds: next })
  }

  const { handleProps, rowProps } = useListDrag(move, !disabled)

  const byId = new Map(pool.map((p) => [p.id, p]))
  const add = (id) => !chosen.includes(id) && onChange({ ...props, packageIds: [...chosen, id] })
  const remove = (id) => onChange({ ...props, packageIds: chosen.filter((x) => x !== id) })

  /** Radio badalne pe uski value bhi saaf — warna "All" pe bhi purani type chipki rehti. */
  const setBrowseBy = (next) =>
    onChange({
      ...props,
      browseBy: next,
      ...(next === 'packageType' ? {} : { packageTypeId: null }),
      ...(next === 'destination' ? {} : { destinationId: null }),
      ...(next === 'duration' ? {} : { browseDuration: null }),
    })

  /**
   * Page wala filter — **checkbox dikhta hai, chalta radio ki tarah hai** (client: _"single
   * check kar sake, not multiple"_).
   *
   * Chuna hua dobara click karne pe `none` pe wapas — checkbox ka yahi ek faayda radio pe hai,
   * aur usse "koi filter nahi" chunna mumkin rehta hai.
   */
  const setPageFilter = (next) =>
    onChange({ ...props, pageFilter: pageFilter === next ? 'none' : next })

  const BROWSE = [
    { key: 'all', label: 'All' },
    { key: 'packageType', label: 'Package Type' },
    { key: 'destination', label: 'Destination' },
    { key: 'duration', label: 'Day wise' },
  ]

  const PAGE_FILTERS = [
    { key: 'packageType', label: 'Package Type' },
    { key: 'destination', label: 'Destination' },
    { key: 'duration', label: 'Day wise' },
  ]

  return (
    <>
      <div className="row2">
        <div className="field">
          <label>Heading</label>
          <input
            className="inp"
            value={props.heading ?? ''}
            onChange={(e) => onChange({ ...props, heading: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="field">
          <label>Line under heading</label>
          <input
            className="inp"
            value={props.subheading ?? ''}
            onChange={(e) => onChange({ ...props, subheading: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      {/*
       * Heading ke daayein wala link — reference ka `.viewall`
       * (`tour-v3.html:1436`: _"Need something custom? →"_). Client, 9 Sep.
       *
       * ⚠️ **Text bhi field hai, sirf URL nahi** — client ka chunav. Theme me likh dene ka matlab
       * hota ki wo har client ki site pe wahi rahe; wahi Q-9 wala kaanta jo `TAB_NOTE` pe abhi
       * tak khula hai.
       */}
      <div className="row2">
        <div className="field">
          <label>Link label</label>
          <input
            className="inp"
            value={props.linkLabel ?? ''}
            placeholder="Need something custom?"
            onChange={(e) => onChange({ ...props, linkLabel: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="field">
          <label>Link URL</label>
          <input
            className="inp"
            value={props.linkUrl ?? ''}
            placeholder="#enquiry"
            onChange={(e) => onChange({ ...props, linkUrl: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="hint">Both are needed — with either one empty the link does not appear.</div>

      <div className="picker">
        <div className="picker__col">
          <div className="picker__head">
            All packages <span className="muted">{loading ? '…' : pool.length}</span>
          </div>

          {/*
           * Baayen ke dono control — search aur browse filter — **sirf dhoondhne ke liye**
           * hain. Inka page pe koi asar nahi (client, 8 Sep).
           */}
          <div className="picker__tools">
            <input
              className="inp"
              type="search"
              placeholder="Search packages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={disabled}
            />

            <div className="pick-filter">
              {BROWSE.map(({ key, label }) => (
                <label className="inline-lbl" key={key}>
                  <input
                    type="radio"
                    name={radioName}
                    checked={browseBy === key}
                    onChange={() => setBrowseBy(key)}
                    disabled={disabled}
                  />{' '}
                  {label}
                </label>
              ))}
            </div>

            {browseBy === 'packageType' && (
              <select
                className="sel"
                value={props.packageTypeId ?? ''}
                onChange={(e) => onChange({ ...props, packageTypeId: e.target.value || null })}
                disabled={disabled}
              >
                <option value="">— choose —</option>
                {packageTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            {browseBy === 'destination' && (
              <select
                className="sel"
                value={props.destinationId ?? ''}
                onChange={(e) => onChange({ ...props, destinationId: e.target.value || null })}
                disabled={disabled}
              >
                <option value="">— choose —</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {/*
             * Day wise — filter **server pe** lagta hai (`duration` param → `fields.nights`).
             * Pehle ye option hata diya gaya tha kyunki list endpoint uspe filter nahi karta
             * tha; client ne poochha ki kyun hataya, aur wo theek tha — option hatane ki jagah
             * use chalana chahiye tha.
             */}
            {browseBy === 'duration' && (
              <select
                className="sel"
                value={props.browseDuration ?? ''}
                onChange={(e) => onChange({ ...props, browseDuration: e.target.value || null })}
                disabled={disabled}
              >
                <option value="">— choose —</option>
                {Object.entries(DURATION_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <ul className="picker__list">
            {pool.map((pkg) => {
              const added = chosen.includes(pkg.id)
              return (
                <li key={pkg.id}>
                  <span className="picker__name">{pkg.title}</span>
                  <span className="picker__meta">{durationOf(pkg.fields)}</span>
                  {added ? (
                    <span className="picker__added" title="Already added">
                      ✓
                    </span>
                  ) : (
                    <button
                      className="btn btn-sm"
                      type="button"
                      onClick={() => add(pkg.id)}
                      disabled={disabled}
                    >
                      ＋
                    </button>
                  )}
                </li>
              )
            })}
            {/*
             * ⚠️ **Error alag se dikhta hai, khaali list ki tarah nahi.**
             *
             * Pehle picker sirf `data` padhta tha. Jab list call 400 de rahi thi (limit 200 vs
             * cap 100) to screen pe "koi package nahi" jaisa dikhta tha — yaani ek **failure**
             * ek **khaali state** ki shakl me. Wahi shakl D-86 wale guard ki thi: guard ka na
             * chalna kabhi error nahi deta, wo sirf "kuch na hone" jaisa dikhta hai.
             */}
            {error && <li className="picker__empty picker__error">{error}</li>}

            {!error && !loading && pool.length === 0 && (
              <li className="picker__empty">No packages match this filter.</li>
            )}
          </ul>
        </div>

        <div className="picker__col">
          <div className="picker__head">
            On this page <span className="muted">{chosen.length}</span>
          </div>

          {/*
           * Page ka filter — **checkbox dikhta hai, chalta radio ki tarah hai** (client:
           * _"single check kar sake, not multiple"_). Chuna hua dobara click karne pe `none`
           * pe wapas — checkbox ka yahi ek faayda radio pe hai.
           *
           * ⚠️ Ye baayen wale se **bilkul alag** hai: wo sirf admin me list chhoti karta hai,
           * ye visitor ko page pe milta hai.
           */}
          <div className="picker__tools">
            <span className="picker__toolslabel">Filter on the page</span>
            <div className="pick-filter">
              {PAGE_FILTERS.map(({ key, label }) => (
                <label className="inline-lbl" key={key}>
                  <input
                    type="checkbox"
                    checked={pageFilter === key}
                    onChange={() => setPageFilter(key)}
                    disabled={disabled}
                  />{' '}
                  {label}
                </label>
              ))}
            </div>
            <div className="hint" style={{ margin: 0 }}>
              {pageFilter === 'none'
                ? 'No filter bar on the page.'
                : 'The page shows a filter bar, built from the packages you picked.'}
            </div>
          </div>

          <ul className="picker__list">
            {chosen.map((id, i) => {
              /**
               * ⚠️ Jo package pool me na mile (draft ho gaya, ya trash me chala gaya) uski id
               * phir bhi dikhti hai — chup-chaap gira dena client ka chunav uske bina bataye
               * mita dena hota. Page pe wo waise bhi render nahi hoga.
               */
              const pkg = byId.get(id)
              return (
                <li key={id} {...rowProps(i)}>
                  <span className="grip" {...handleProps(i)}>
                    ⠿
                  </span>
                  <span className="picker__name">
                    {pkg?.title ?? <em className="muted">(no longer available)</em>}
                  </span>
                  <span className="picker__meta">{pkg ? durationOf(pkg.fields) : ''}</span>
                  <button
                    className="btn btn-sm btn-danger"
                    type="button"
                    onClick={() => remove(id)}
                    disabled={disabled}
                  >
                    ✕
                  </button>
                </li>
              )
            })}
            {chosen.length === 0 && (
              <li className="picker__empty">
                No packages yet — use ＋ on the left. Leave this empty and the section does not
                appear on the page.
              </li>
            )}
          </ul>
        </div>
      </div>
    </>
  )
}

/**
 * `Post list` — blog listing page ka block (spec 008).
 *
 * ## ⚠️ Picker sirf **featured teen** ke liye hai, poori list ke liye nahi
 *
 * `PackageListBlock` me client **har** package chunta hai. Yahan wo galat hota: blog ki list
 * query se banti hai (naya post publish karo, wo apne aap aa jaaye). Client sirf `Start here`
 * ke teen chunta hai — ek bada aur do chhote.
 *
 * Isiliye baayen wali list pe `browseBy` jaisa kuch nahi hai — sirf search. Filter ka sawaal
 * hi nahi uthta, kyunki ye chunav sirf teen ka hai.
 */
function PostListBlock({ props, onChange, disabled }) {
  const categories = useTaxonomyList('category')
  const chosen = props.featuredIds ?? []

  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')

  /** 300ms — bina iske har keystroke ek API call banati (wahi debounce jo package picker pe hai). */
  useEffect(() => {
    const timer = setTimeout(() => setApplied(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const {
    data: pool,
    loading,
    error,
  } = useEntryList('post', {
    limit: ENTRY_LIST_MAX_LIMIT,
    status: 'published',
    ...(applied ? { q: applied } : {}),
  })

  const move = (from, to) => {
    if (to < 0 || to >= chosen.length) return
    const next = [...chosen]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    onChange({ ...props, featuredIds: next })
  }

  const { handleProps, rowProps } = useListDrag(move, !disabled)

  const byId = new Map(pool.map((p) => [p.id, p]))
  const full = chosen.length >= POST_LIST_MAX_FEATURED
  const add = (id) =>
    !chosen.includes(id) && !full && onChange({ ...props, featuredIds: [...chosen, id] })
  const remove = (id) => onChange({ ...props, featuredIds: chosen.filter((x) => x !== id) })

  return (
    <>
      <div className="row2">
        <div className="field">
          <label>Heading</label>
          <input
            className="inp"
            value={props.heading ?? ''}
            onChange={(e) => onChange({ ...props, heading: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="field">
          <label>Sub heading</label>
          <input
            className="inp"
            value={props.subheading ?? ''}
            onChange={(e) => onChange({ ...props, subheading: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>Link text</label>
          <input
            className="inp"
            value={props.linkLabel ?? ''}
            onChange={(e) => onChange({ ...props, linkLabel: e.target.value })}
            disabled={disabled}
            placeholder="All articles"
          />
        </div>
        <div className="field">
          <label>Link URL</label>
          <input
            className="inp"
            value={props.linkUrl ?? ''}
            onChange={(e) => onChange({ ...props, linkUrl: e.target.value })}
            disabled={disabled}
          />
          {/* Aadha link ek aisa button hai jo click pe kuch nahi karta (D-30, D-90). */}
          <div className="hint">Both are needed — with only one, no link is shown.</div>
        </div>
      </div>

      <div className="row3">
        <div className="field">
          <label>Only this topic</label>
          <select
            className="sel"
            value={props.categoryId ?? ''}
            onChange={(e) => onChange({ ...props, categoryId: e.target.value || null })}
            disabled={disabled}
          >
            <option value="">All topics</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {/* Topic-wise landing page ka poora raasta yahi hai — koi alag route nahi. */}
          <div className="hint">Pick one to make this a single-topic page.</div>
        </div>

        <div className="field">
          <label>Posts per page</label>
          <input
            className="inp"
            type="number"
            min={1}
            max={50}
            value={props.perPage ?? POST_LIST_PER_PAGE_DEFAULT}
            onChange={(e) => onChange({ ...props, perPage: Number(e.target.value) || 1 })}
            disabled={disabled}
          />
        </div>

        <div className="field">
          <label>Topic filter</label>
          <label className="inline-lbl">
            <input
              type="checkbox"
              checked={props.showFilter !== false}
              onChange={(e) => onChange({ ...props, showFilter: e.target.checked })}
              disabled={disabled}
            />{' '}
            Show the filter pills
          </label>
        </div>
      </div>

      <div className="picker">
        <div className="picker__col">
          <div className="picker__head">
            All posts <span className="muted">{pool.length}</span>
          </div>
          <div className="picker__tools">
            <input
              className="inp"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts…"
              disabled={disabled}
            />
          </div>
          <ul className="picker__list">
            {pool.map((post) => {
              const added = chosen.includes(post.id)
              return (
                <li key={post.id}>
                  <span className="picker__name">{post.title}</span>
                  {added ? (
                    <span className="picker__added" title="Already added">
                      ✓
                    </span>
                  ) : (
                    <button
                      className="btn btn-sm"
                      type="button"
                      onClick={() => add(post.id)}
                      disabled={disabled || full}
                    >
                      ＋
                    </button>
                  )}
                </li>
              )
            })}
            {/*
             * ⚠️ Error khaali list ki tarah **nahi** dikhta — 8 Sep ko package picker pe wahi
             * hua tha: request 400 de rahi thi aur screen "koi package nahi" keh raha tha,
             * yaani failure khaali state ki shakl me (D-86).
             */}
            {error && <li className="picker__empty picker__error">{error}</li>}
            {!error && !loading && pool.length === 0 && (
              <li className="picker__empty">No published posts yet.</li>
            )}
          </ul>
        </div>

        <div className="picker__col">
          <div className="picker__head">
            Featured{' '}
            <span className="muted">
              {chosen.length} / {POST_LIST_MAX_FEATURED}
            </span>
          </div>
          <ul className="picker__list">
            {chosen.map((id, i) => {
              /**
               * ⚠️ Jo post pool me na mile (draft ho gaya, ya trash me) uski id phir bhi dikhti
               * hai — chup-chaap gira dena client ka chunav uske bina bataye mita dena hota.
               * Page pe wo waise bhi render nahi hoga.
               */
              const post = byId.get(id)
              return (
                <li key={id} {...rowProps(i)}>
                  <span className="grip" {...handleProps(i)}>
                    ⠿
                  </span>
                  <span className="picker__name">
                    {post?.title ?? <em className="muted">(no longer available)</em>}
                  </span>
                  {/* Kram mayne rakhta hai — pehla bada card banta hai (`.fcard--lg`). */}
                  <span className="picker__meta">{i === 0 ? 'Big card' : 'Small'}</span>
                  <button
                    className="btn btn-sm btn-danger"
                    type="button"
                    onClick={() => remove(id)}
                    disabled={disabled}
                  >
                    ✕
                  </button>
                </li>
              )
            })}
            {chosen.length === 0 && (
              <li className="picker__empty">
                None yet — use ＋ on the left. Leave this empty and the “Start here” section does
                not appear. These three are left out of the list below.
              </li>
            )}
          </ul>
        </div>
      </div>
    </>
  )
}

function FaqsBlock({ props, onChange, disabled }) {
  const items = props.items ?? []
  const setItems = (next) => onChange({ ...props, items: next })

  const patch = (i, key, value) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)))

  return (
    <>
      {/* Wahi do field jo ab Cards aur Two column pe bhi hain — D-88 §9. */}
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />

      {items.map((faq, i) => (
        <div className="day" key={faq.id ?? i}>
          <div className="day-body">
            <div className="field">
              <label>Question</label>
              <input
                className="inp"
                value={faq.question ?? ''}
                onChange={(e) => patch(i, 'question', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="field">
              <label>Answer</label>
              <HtmlEditor
                value={faq.answer ?? ''}
                onChange={(answer) => patch(i, 'answer', answer)}
                disabled={disabled}
                height={140}
              />
            </div>
            {!disabled && (
              <button
                className="btn btn-sm btn-danger"
                type="button"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              >
                Remove question
              </button>
            )}
          </div>
        </div>
      ))}

      {!disabled && (
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => setItems([...items, { id: newId(), question: '', answer: '' }])}
        >
          ＋ Question
        </button>
      )}

      <div className="hint">
        Google&rsquo;s FAQ schema is emitted automatically — every FAQ block on this page goes into
        one FAQPage.
      </div>
    </>
  )
}

/* ── home page ke sections (D-96) ──────────────────────────────────────────── */

/** Hero ka apna rang — reference ka `.hero` (`--blue-900`). Khaali background pe yahi lagta hai. */
const HERO_DEFAULT_BACKGROUND = '#0b2b4a'

/**
 * Section ka background — **koi bhi rang, picker se** (client, 15 Sep, D-96).
 *
 * Har home section ke panel me sabse upar yahi. `<input type="color">` khaali value rakh hi nahi
 * sakta, isliye "Use default" ka alag button — warna ek baar rang chunne ke baad section ke apne
 * rang pe lautne ka raasta nahi bachta (wahi jo category ke badge rang pe hai, D-93).
 */
function SectionBackground({ value, fallback, onChange, disabled }) {
  return (
    <div className="field">
      <label>Background colour</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label="Background colour"
        />
        <span className="muted">{value || `Default (${fallback})`}</span>
        {value && !disabled && (
          <button className="btn btn-sm btn-plain" type="button" onClick={() => onChange('')}>
            Use default
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * `Hero with form` — `home-nav-v3.html` ka `3. HERO` (client, 15 Sep).
 *
 * ⚠️ **Form yahin chunta hai, sidebar se nahi** — hero me ek hi card ki jagah hai. Dropdown me
 * sirf `active` form (wahi rok jo sidebar ke widget pe hai): draft form payload me jaata hi nahi,
 * to use chunne dena jhootha control hota.
 *
 * ⚠️ Button ka text **form ki setting** hai (`Enquiry Forms ▸ Button label`), yahan nahi — client:
 * _"future me helpful ho"_. Isliye hint me uska raasta likha hai.
 */
function HeroFormBlock({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })

  const media = useMediaById([props.imageId, props.mobileImageId].filter(Boolean))

  /** ⚠️ Memo zaroori — `useForms` ki dep query ki identity hai, naya object har render pe loop. */
  const formQuery = useMemo(() => ({ status: 'active', limit: 200 }), [])
  const { data: forms, loading: formsLoading } = useForms(formQuery)

  const stats = props.stats ?? []
  const setStat = (i, key, value) =>
    set({
      stats: Array.from({ length: 4 }, (_, idx) => {
        const row = stats[idx] ?? { value: '', label: '' }
        return idx === i ? { ...row, [key]: value } : row
      }),
    })

  return (
    <>
      <SectionBackground
        value={props.background}
        fallback={HERO_DEFAULT_BACKGROUND}
        onChange={(background) => set({ background })}
        disabled={disabled}
      />

      <div className="row2">
        <MediaDrop
          label="Desktop image"
          hint="The photo behind the hero."
          media={media[props.imageId]}
          onSelect={(chosen) => set({ imageId: chosen.id })}
          onClear={() => set({ imageId: null })}
        />
        <MediaDrop
          label="Mobile image"
          hint="Optional — leave it empty and the desktop image is used."
          media={media[props.mobileImageId]}
          onSelect={(chosen) => set({ mobileImageId: chosen.id })}
          onClear={() => set({ mobileImageId: null })}
        />
      </div>

      <div className="field">
        <label>Title</label>
        <HtmlEditor
          value={props.title ?? ''}
          onChange={(title) => set({ title })}
          disabled={disabled}
          height={150}
        />
        <div className="hint">
          The page’s H1. <b>Italic</b> marks the part shown in the accent colour. Only bold, italic
          and links are kept — headings, lists and images are dropped when you save.
        </div>
      </div>

      <div className="field">
        <label>Description</label>
        <HtmlEditor
          value={props.description ?? ''}
          onChange={(description) => set({ description })}
          disabled={disabled}
          height={130}
        />
      </div>

      <label className="blk-sublabel">Stats</label>
      {Array.from({ length: 4 }, (_, i) => {
        const row = stats[i] ?? {}
        return (
          <div className="row2" key={i}>
            <div className="field">
              <label>Value</label>
              <input
                className="inp"
                placeholder={i === 0 ? '17 yrs' : ''}
                value={row.value ?? ''}
                onChange={(e) => setStat(i, 'value', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="field">
              <label>Label</label>
              <input
                className="inp"
                placeholder={i === 0 ? 'Operating from Port Blair' : ''}
                value={row.label ?? ''}
                onChange={(e) => setStat(i, 'label', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        )
      })}
      <div className="hint">A row with an empty value does not appear on the page.</div>

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Form card
      </label>

      <div className="row2">
        <div className="field">
          <label>Form</label>
          <select
            className="sel"
            value={props.formId ?? ''}
            onChange={(e) => set({ formId: e.target.value })}
            disabled={disabled || formsLoading}
          >
            <option value="">{formsLoading ? 'Loading…' : '— choose a form —'}</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.name}
              </option>
            ))}
          </select>
          {!formsLoading && forms.length === 0 && (
            <div className="hint">
              No active forms yet. Create one under <b>Enquiry Forms</b>, then set it to Active.
            </div>
          )}
        </div>

        <div className="field">
          <label>Ribbon</label>
          <input
            className="inp"
            placeholder="Free · No obligation"
            value={props.ribbon ?? ''}
            onChange={(e) => set({ ribbon: e.target.value })}
            disabled={disabled}
          />
          <div className="hint">
            The small green label on top of the card. Leave it empty to hide it.
          </div>
        </div>
      </div>

      <div className="field">
        <label>Heading</label>
        <input
          className="inp"
          placeholder="Plan your Andaman trip"
          value={props.formHeading ?? ''}
          onChange={(e) => set({ formHeading: e.target.value })}
          disabled={disabled}
        />
      </div>

      <div className="field">
        <label>Description</label>
        <HtmlEditor
          value={props.formDescription ?? ''}
          onChange={(formDescription) => set({ formDescription })}
          disabled={disabled}
          height={110}
        />
      </div>

      <div className="hint">
        The fields, the button text and the note under the button come from the form itself —{' '}
        <b>Enquiry Forms</b>. Without an active form the card does not appear.
      </div>
    </>
  )
}

const EDITORS = {
  heroForm: HeroFormBlock,
  richText: TextBlock,
  twoColumn: TwoColumnBlock,
  cards: CardsBlock,
  packageList: PackageListBlock,
  postList: PostListBlock,
  faqs: FaqsBlock,
}

/* ── blocks ki list ────────────────────────────────────────────────────────── */

/**
 * @param {object} props
 * @param {any[]} props.blocks
 * @param {string[]} [props.types]    kaunse block jud sakte hain — content type se aata hai
 * @param {(next: any[]) => void} props.onChange
 * @param {boolean} props.disabled
 * @param {string[]} props.open       khule hue block ids
 * @param {(id: string) => void} props.onToggle
 */
export default function PageBlocks({
  blocks,
  types = PAGE_BLOCK_TYPES,
  onChange,
  disabled,
  open,
  onToggle,
}) {
  const patchBlock = (i, nextProps) =>
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, props: nextProps } : b)))

  /**
   * Kram badalna — **drag se, grip pe** (client, 8 Sep).
   *
   * ⚠️ Pehle yahan ⌃⌄ ke do button the. Wo "abhi ke liye" wala shortcut tha aur galat tha: usi
   * screen ke picker me `useListDrag` pehle se chal raha hai, yaani drag ka poora intezaam
   * maujood tha aur maine use yahan lagaya hi nahi.
   *
   * `useListDrag` **keyboard bhi deta hai** (grip pe ↑/↓), isliye drag pe jaane se wo raasta
   * khota nahi — wahi jodi jo `SortablePanels`, itinerary aur menu items pe hai.
   */
  const move = (from, to) => {
    if (to < 0 || to >= blocks.length) return

    const next = [...blocks]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    onChange(next)
  }

  const { handleProps, rowProps } = useListDrag(move, !disabled)

  return (
    <>
      {blocks.map((block, i) => {
        const Editor = EDITORS[block.type]
        const isOpen = open.includes(block.id)

        return (
          <div
            className={`blk blk--${BLOCK_CLASS[block.type] ?? 'text'}`}
            key={block.id ?? i}
            {...rowProps(i)}
          >
            {/*
             * ⚠️ **Poora head hi toggle hai**, sirf ▾ ka akshar nahi.
             *
             * Pehle `▾` ek saada `<span>` tha — dikhta button jaisa tha par kuch karta nahi tha,
             * aur toggle sirf summary wale text pe lagta tha. Client ne wahi pakda: _"blocks are
             * not opening and closing by the icon."_
             *
             * Ab wahi shakl hai jo `Panel` ki hai: head `role="button"`, aur grip aur ✕ apna
             * click rok lete hain (`stopPropagation`) — warna har drag ya remove ke baad panel
             * khul/band ho jaata aur wo bilkul galti jaisa lagta.
             */}
            <div
              className="blk-head"
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => onToggle(block.id)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                onToggle(block.id)
              }}
            >
              {!disabled && (
                <span
                  className="grip"
                  {...handleProps(i)}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    handleProps(i).onKeyDown?.(e)
                  }}
                >
                  ⠿
                </span>
              )}

              <span className="blk-chip">{BLOCK_LABEL[block.type] ?? block.type}</span>
              <span className="blk-sum">{summarize(block)}</span>
              <span className="toggle-ico">{isOpen ? '▾' : '▸'}</span>

              {!disabled && (
                <button
                  className="blk-x"
                  type="button"
                  title="Remove block"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!window.confirm('Remove this block? Its content goes with it.')) {
                      return
                    }
                    onChange(blocks.filter((_, idx) => idx !== i))
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {isOpen && (
              <div className="blk-body">
                {Editor ? (
                  <Editor
                    props={block.props ?? {}}
                    onChange={(next) => patchBlock(i, next)}
                    disabled={disabled}
                  />
                ) : (
                  /*
                   * Anjaan type — Phase 5 ka koi block, ya purana data. Uske props chhoot
                   * jaate hain (server pe bhi), isliye yahan bhi use chhedna galat hoga.
                   */
                  <div className="hint">
                    There is no editor for this block (<code>{block.type}</code>) yet. Its content
                    is left exactly as it is.
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {!disabled && (
        <div className="blk-add">
          <select
            className="sel"
            style={{ width: 'auto' }}
            value=""
            onChange={(e) => {
              if (!e.target.value) return
              const block = emptyBlock(e.target.value)
              onChange([...blocks, block])
              onToggle(block.id)
              e.target.value = ''
            }}
            aria-label="Add block"
          >
            <option value="">＋ Add block…</option>
            {/*
             * ⚠️ Sirf wahi types jo is content type pe chalte hain. `Package list` saade page
             * pe nahi aata — packages ki listing Tour page ka kaam hai (8 Sep).
             *
             * Ye ek **UI ki rok** hai, suraksha ki nahi: purana ya API se bheja hua block phir
             * bhi render hota hai, kyunki use chup-chaap girana content kho dena hota.
             */}
            {types.map((type) => (
              <option key={type} value={type}>
                {BLOCK_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
