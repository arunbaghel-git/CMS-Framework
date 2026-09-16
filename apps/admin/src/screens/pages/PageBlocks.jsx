import {
  AWARD_BADGES_MAX,
  ENTRY_LIST_MAX_LIMIT,
  ICONS,
  ICON_LABELS,
  IMAGE_CARDS_MAX,
  IMAGE_CARD_SHAPES,
  INFO_CARDS_MAX,
  LOGO_GRID_MAX,
  OFFER_CARDS_MAX,
  OFFER_CARD_SHAPES,
  PACKAGE_GRID_MAX,
  TESTIMONIALS_MAX,
  TEXT_VIDEO_POINTS_MAX,
  THEME_COLORS,
  VIDEO_REVIEWS_MAX,
  PAGE_BLOCK_TYPES,
  POST_LIST_MAX_FEATURED,
  POST_LIST_PER_PAGE_DEFAULT,
} from '@cms/shared'
import { useEffect, useId, useMemo, useState } from 'react'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import { useListDrag } from '../../lib/drag-list.js'
import { api, errorMessage } from '../../lib/api.js'
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
  infoCards: 'Info cards',
  imageCards: 'Image cards',
  videoReviews: 'Customer reviews',
  testimonials: 'Testimonials',
  logoGrid: 'Logo grid',
  packageGrid: 'Package grid',
  offerCards: 'Offer cards',
  textVideo: 'Text with video',
  awardBadges: 'Award badges',
  customHtml: 'Custom editor',
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
  infoCards: 'info',
  imageCards: 'image',
  videoReviews: 'reviews',
  testimonials: 'reviews',
  logoGrid: 'logos',
  packageGrid: 'list',
  offerCards: 'image',
  textVideo: 'two',
  awardBadges: 'logos',
  customHtml: 'text',
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
    /**
     * Look ke baaki khaane schema ke saade default pe (border chaaron taraf, icon upar, box ke saath).
     * ⚠️ "Start from" presets 15 Sep ko hate — unke naam Andaman site ke the, CMS har client ka hai (D-96 §15).
     */
    infoCards: {
      heading: '',
      description: '',
      items: [],
    },
    /** Look schema ke default pe — square, 4 column, phone pe 2 (D-96 §15: presets hate). */
    imageCards: {
      background: '',
      heading: '',
      description: '',
      headingAlign: 'left',
      linkLabel: '',
      linkUrl: '',
      items: [],
    },
    offerCards: {
      background: '',
      heading: '',
      description: '',
      headingAlign: 'left',
      linkLabel: '',
      linkUrl: '',
      cardStyle: 'imageTop',
      shape: 'photo',
      layout: 'slider',
      columns: 4,
      items: [],
    },
    textVideo: {
      background: '',
      heading: '',
      text: '',
      items: [],
      buttonLabel: '',
      buttonUrl: '',
      imageSide: 'right',
      imageId: null,
      videoUrl: '',
      videoTitle: '',
      videoText: '',
    },
    customHtml: { background: '', className: '', html: '' },
    awardBadges: {
      background: '',
      heading: '',
      description: '',
      headingAlign: 'center',
      linkLabel: '',
      linkUrl: '',
      badgeColor: '',
      items: [],
    },
    packageGrid: {
      background: '',
      heading: '',
      description: '',
      headingAlign: 'left',
      linkLabel: '',
      linkUrl: '',
      showFilter: true,
    },
    logoGrid: {
      background: '',
      heading: '',
      description: '',
      headingAlign: 'center',
      linkLabel: '',
      linkUrl: '',
      items: [],
      closingTitle: '',
      closingText: '',
    },
    testimonials: {
      background: '',
      heading: '',
      description: '',
      headingAlign: 'center',
      linkLabel: '',
      linkUrl: '',
      iconColor: '',
      testimonialIds: [],
    },
    videoReviews: {
      background: '',
      heading: '',
      description: '',
      headingAlign: 'left',
      linkLabel: '',
      linkUrl: '',
      reviewIds: [],
    },
    heroForm: {
      background: '',
      imageId: null,
      mobileImageId: null,
      eyebrow: '',
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
    case 'imageCards':
      return `${p.heading || 'Image cards'} — ${(p.items ?? []).length} card(s)`
    case 'offerCards':
      return `${p.heading || 'Offer cards'} — ${(p.items ?? []).length} card(s)`
    case 'customHtml': {
      const text = String(p.html ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/s+/g, ' ')
        .trim()
      return text ? text.slice(0, 70) + (text.length > 70 ? '…' : '') : 'Empty'
    }
    case 'textVideo':
      return `${p.heading || 'Text with video'} — ${(p.items ?? []).length} point(s)${p.videoUrl ? ' · video' : ''}`
    case 'awardBadges':
      return `${p.heading || 'Award badges'} — ${(p.items ?? []).length} badge(s)`
    case 'packageGrid':
      return `${p.heading || 'Package grid'} — latest published packages`
    case 'logoGrid':
      return `${p.heading || 'Logo grid'} — ${(p.items ?? []).length} logo(s)`
    case 'testimonials':
      return `${p.heading || 'Testimonials'} — ${(p.testimonialIds ?? []).length} review(s)`
    case 'videoReviews':
      return `${p.heading || 'Customer reviews'} — ${(p.reviewIds ?? []).length} video(s)`
    case 'infoCards':
      return `${p.heading || 'Info cards'} — ${(p.items ?? []).length} card(s)`
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

function FaqsBlock({ props, onChange, disabled, home }) {
  const items = props.items ?? []
  const setItems = (next) => onChange({ ...props, items: next })

  const patch = (i, key, value) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)))

  return (
    <>
      {/*
       * Background sirf **home** pe (D-96 §12) — wahan har section ka apna rang hai. Tour/Page/Post
       * pe FAQ page ke dabbe ke andar hai, rang ka koi matlab nahi; khaana dikhana jhootha control hota.
       */}
      {home && (
        <div className="row2">
          <SectionBackground
            value={props.background}
            fallback={THEME_COLORS.surface}
            onChange={(background) => onChange({ ...props, background })}
            disabled={disabled}
          />
          {/* Poora section — heading aur sawaal dono (client, 15 Sep). Sirf home pe. */}
          <div className="field">
            <label>Section alignment</label>
            <select
              className="sel"
              value={props.align ?? 'center'}
              onChange={(e) => onChange({ ...props, align: e.target.value })}
              disabled={disabled}
            >
              <option value="center">Centre</option>
              <option value="left">Left</option>
            </select>
          </div>
        </div>
      )}

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
const HERO_DEFAULT_BACKGROUND = THEME_COLORS.blue900

/**
 * Section ka background — **koi bhi rang, picker se** (client, 15 Sep, D-96).
 *
 * Har home section ke panel me sabse upar yahi. `<input type="color">` khaali value rakh hi nahi
 * sakta, isliye "Use default" ka alag button — warna ek baar rang chunne ke baad section ke apne
 * rang pe lautne ka raasta nahi bachta (wahi jo category ke badge rang pe hai, D-93).
 */
function SectionBackground(props) {
  return <ColourField label="Background colour" {...props} />
}

/** Ek rang ka khaana — picker + hex + "Use default". Background, accent aur icon ke rang sab isi se. */
function ColourField({ label, value, fallback, onChange, disabled }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
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
        <label>Eyebrow</label>
        <input
          className="inp"
          placeholder="Optional — e.g. 4.8 on Google · Govt. enlisted since 2009"
          value={props.eyebrow ?? ''}
          onChange={(e) => set({ eyebrow: e.target.value })}
          disabled={disabled}
        />
        <div className="hint">
          The small line above the title, with a star. Leave it empty to hide it.
        </div>
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

/** Info cards ka default section rang — reference me charon `sec--white` hain. */
const INFO_CARDS_DEFAULT_BACKGROUND = THEME_COLORS.surface

const emptyCard = () => ({
  id: newId(),
  icon: 'none',
  imageId: null,
  label: '',
  title: '',
  text: '',
  url: '',
})

/**
 * `Info cards` — reference ke Achievements · Certified by · Why us · Popular articles (D-96 §11).
 *
 * Panel teen hisson me: **Heading** (section ka), **Card look** (poore section ka ek look), **Cards**
 * (drag se kram). Card ka icon list se ya upload se — upload jeet-ti hai (client: _"icon list + upload"_).
 */
function InfoCardsBlock({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })
  const items = props.items ?? []

  const media = useMediaById(items.map((item) => item.imageId).filter(Boolean))

  const setItems = (next) => set({ items: next })
  const patchItem = (i, patch) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))

  /** Cards ka apna drag — blocks list ka alag instance, to card section ke bahar nahi girta. */
  const moveItem = (from, to) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    setItems(next)
  }
  const { handleProps, rowProps } = useListDrag(moveItem, !disabled)

  const accentBorder = props.border === 'top' || props.border === 'left'

  return (
    <>
      <SectionBackground
        value={props.background}
        fallback={INFO_CARDS_DEFAULT_BACKGROUND}
        onChange={(background) => set({ background })}
        disabled={disabled}
      />

      <label className="blk-sublabel">Heading</label>
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />
      <HeadingPositionFields props={props} onChange={onChange} disabled={disabled} />
      <div className="hint">
        Leave the heading empty and the section starts straight with the cards.
      </div>

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Card look
      </label>
      <div className="row2">
        <div className="field">
          <label>Columns</label>
          <select
            className="sel"
            value={props.columns ?? 4}
            onChange={(e) => set({ columns: Number(e.target.value) })}
            disabled={disabled}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
          <div className="hint">On desktop. Tablets show 2, phones 1.</div>
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>Card border</label>
          <select
            className="sel"
            value={props.border ?? 'full'}
            onChange={(e) => set({ border: e.target.value })}
            disabled={disabled}
          >
            <option value="none">No border</option>
            <option value="full">Border all round</option>
            <option value="top">Border + coloured top</option>
            <option value="left">Border + coloured left side</option>
          </select>
        </div>
        {accentBorder && (
          <ColourField
            label="Top / left colour"
            value={props.accentColor}
            fallback={THEME_COLORS.blue500}
            onChange={(accentColor) => set({ accentColor })}
            disabled={disabled}
          />
        )}
      </div>

      <div className="row2">
        <div className="field">
          <label>Icon position</label>
          <select
            className="sel"
            value={props.iconPosition ?? 'above'}
            onChange={(e) => set({ iconPosition: e.target.value })}
            disabled={disabled}
          >
            <option value="above">Above the title</option>
            <option value="inline">Beside the title</option>
          </select>
        </div>
        <div className="field">
          <label>Text alignment</label>
          <select
            className="sel"
            value={props.textAlign ?? 'left'}
            onChange={(e) => set({ textAlign: e.target.value })}
            disabled={disabled}
          >
            <option value="left">Left</option>
            <option value="center">Centre</option>
          </select>
        </div>
      </div>

      <label className="inline-lbl" style={{ display: 'block', marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={props.iconBox !== false}
          onChange={(e) => set({ iconBox: e.target.checked })}
          disabled={disabled}
        />{' '}
        Coloured box behind the icon
      </label>
      <div className="row2">
        {props.iconBox !== false && (
          <ColourField
            label="Icon box colour"
            value={props.iconBg}
            fallback={THEME_COLORS.blue50}
            onChange={(iconBg) => set({ iconBg })}
            disabled={disabled}
          />
        )}
        <ColourField
          label="Icon colour"
          value={props.iconColor}
          fallback={THEME_COLORS.blue600}
          onChange={(iconColor) => set({ iconColor })}
          disabled={disabled}
        />
      </div>

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Cards
      </label>
      {items.map((item, i) => (
        <div className="info-card" key={item.id ?? i} {...rowProps(i)}>
          <div className="info-card__head">
            {!disabled && (
              <span className="grip" {...handleProps(i)}>
                ⠿
              </span>
            )}
            <b>{item.title || `Card ${i + 1}`}</b>
            {!disabled && (
              <button
                className="blk-x"
                type="button"
                title="Remove card"
                onClick={() => {
                  if (!window.confirm('Remove this card?')) return
                  setItems(items.filter((_, idx) => idx !== i))
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="row2">
            <div className="field">
              <label>Icon</label>
              <select
                className="sel"
                value={item.icon ?? 'none'}
                onChange={(e) => patchItem(i, { icon: e.target.value })}
                disabled={disabled}
              >
                {ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {ICON_LABELS[icon] ?? icon}
                  </option>
                ))}
              </select>
            </div>
            <MediaDrop
              label="Or your own image"
              hint="Optional — shown instead of the icon."
              media={media[item.imageId]}
              onSelect={(chosen) => patchItem(i, { imageId: chosen.id })}
              onClear={() => patchItem(i, { imageId: null })}
            />
          </div>

          <div className="row2">
            <div className="field">
              <label>Label</label>
              <input
                className="inp"
                placeholder="Blog"
                value={item.label ?? ''}
                onChange={(e) => patchItem(i, { label: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div className="field">
              <label>Title</label>
              <input
                className="inp"
                value={item.title ?? ''}
                onChange={(e) => patchItem(i, { title: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="field">
            <label>Description</label>
            <HtmlEditor
              value={item.text ?? ''}
              onChange={(text) => patchItem(i, { text })}
              disabled={disabled}
              height={110}
            />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Link</label>
            <input
              className="inp"
              placeholder="Optional — e.g. /blog/where-to-stay"
              value={item.url ?? ''}
              onChange={(e) => patchItem(i, { url: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      ))}

      {!disabled && items.length < INFO_CARDS_MAX && (
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => setItems([...items, emptyCard()])}
        >
          ＋ Add card
        </button>
      )}

      <div className="hint">
        <b>Label</b> is the small coloured word above the title (&ldquo;Blog&rdquo;). With a{' '}
        <b>Link</b> the whole card is clickable and lifts on hover. In the description only bold,
        italic and links are kept. A card with nothing filled in does not appear.
      </div>
    </>
  )
}

/**
 * Heading ki jagah — Centre, ya Left + daayein link (`View all →`). Info cards aur Customer reviews dono
 * pe (D-96 §11, §13). `SectionHeadingFields` ke saath hi aata hai.
 */
function HeadingPositionFields({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })

  return (
    <>
      <div className="row2">
        <div className="field">
          <label>Heading position</label>
          <select
            className="sel"
            value={props.headingAlign ?? 'center'}
            onChange={(e) => set({ headingAlign: e.target.value })}
            disabled={disabled}
          >
            <option value="center">Centre</option>
            <option value="left">Left — with a link on the right</option>
          </select>
        </div>
      </div>
      {props.headingAlign === 'left' && (
        <div className="row2">
          <div className="field">
            <label>Link label</label>
            <input
              className="inp"
              placeholder="View all"
              value={props.linkLabel ?? ''}
              onChange={(e) => set({ linkLabel: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="field">
            <label>Link URL</label>
            <input
              className="inp"
              placeholder="/reviews"
              value={props.linkUrl ?? ''}
              onChange={(e) => set({ linkUrl: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Do-column picker — **master list ki ids chunna, kram drag se** (D-96 §13, §16).
 *
 * Customer reviews (video) aur Testimonials (text) dono yahi use karte hain — pehle ye `VideoReviewsBlock`
 * ke andar tha; doosra section aate hi alag nikla (do copies ek din alag ho jaati hain). Package list ka
 * picker (`.picker`) apne filter/search ke saath alag hai.
 *
 * @param {object} props
 * @param {string} props.endpoint      `/video-reviews` · `/reviews`
 * @param {string[]} props.ids         chune hue, kram me
 * @param {(ids: string[]) => void} props.onChange
 * @param {number} props.max
 * @param {(item: any) => string} props.meta   naam ke bagal ki chhoti line
 * @param {import('react').ReactNode} props.emptyAll   list khaali ho to kya likhein
 */
function ListPicker({ endpoint, ids, onChange, max, meta, allLabel, emptyAll, disabled }) {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .get(endpoint, { params: { limit: 200 } })
      .then((res) => !cancelled && setAll(res.data.data.items))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [endpoint])

  const byId = new Map(all.map((item) => [item.id, item]))

  const add = (id) => {
    if (ids.length < max) onChange([...ids, id])
  }
  const remove = (id) => onChange(ids.filter((x) => x !== id))
  const move = (from, to) => {
    if (to < 0 || to >= ids.length) return
    const next = [...ids]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    onChange(next)
  }
  const { handleProps, rowProps } = useListDrag(move, !disabled)

  return (
    <div className="picker">
      <div className="picker__col">
        <div className="picker__head">
          {allLabel} <span className="muted">{all.length}</span>
        </div>
        <ul className="picker__list">
          {all.map((item) => (
            <li key={item.id}>
              <span className="picker__name">{item.name}</span>
              <span className="picker__meta">{meta(item)}</span>
              {ids.includes(item.id) ? (
                <span className="picker__added" title="Already added">
                  ✓
                </span>
              ) : (
                <button
                  className="btn btn-sm"
                  type="button"
                  onClick={() => add(item.id)}
                  disabled={disabled || ids.length >= max}
                >
                  ＋
                </button>
              )}
            </li>
          ))}
          {error && <li className="picker__empty picker__error">{error}</li>}
          {!error && !loading && all.length === 0 && <li className="picker__empty">{emptyAll}</li>}
        </ul>
      </div>

      <div className="picker__col">
        <div className="picker__head">
          In this section <span className="muted">{ids.length}</span>
        </div>
        <ul className="picker__list">
          {ids.map((id, i) => {
            const item = byId.get(id)
            return (
              <li key={id} {...rowProps(i)}>
                {!disabled && (
                  <span className="grip" {...handleProps(i)}>
                    ⠿
                  </span>
                )}
                <span className="picker__name">
                  {item?.name ?? <em className="muted">{loading ? '…' : '(deleted)'}</em>}
                </span>
                <span className="picker__meta">{item ? meta(item) : ''}</span>
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
          {ids.length === 0 && (
            <li className="picker__empty">
              None yet — use ＋ on the left. Leave this empty and the section does not appear.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

/**
 * `Customer reviews` — video reviews ki rail (client, 15 Sep, D-96 §13).
 *
 * Reviews **Reviews ▸ Video reviews** me bante hain; yahan sirf **chune** jaate hain (`ListPicker`).
 */
function VideoReviewsBlock({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })

  return (
    <>
      <SectionBackground
        value={props.background}
        fallback={THEME_COLORS.surface}
        onChange={(background) => set({ background })}
        disabled={disabled}
      />

      <label className="blk-sublabel">Heading</label>
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />
      <HeadingPositionFields props={props} onChange={onChange} disabled={disabled} />

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Video reviews
      </label>
      <ListPicker
        endpoint="/video-reviews"
        ids={props.reviewIds ?? []}
        onChange={(reviewIds) => set({ reviewIds })}
        max={VIDEO_REVIEWS_MAX}
        meta={(item) => item.packageName ?? ''}
        allLabel="All video reviews"
        emptyAll={
          <>
            No video reviews yet — add them under <b>Reviews ▸ Video reviews</b>.
          </>
        }
        disabled={disabled}
      />
      <div className="hint">
        Cards appear in this order — drag <b>⠿</b> to move one. YouTube and Vimeo videos play in a
        popup; other links open in a new tab.
      </div>
    </>
  )
}

/**
 * `Testimonials` — text reviews ke cards (client, 15 Sep, D-96 §16).
 *
 * Reviews **Reviews ▸ Text reviews** me bante hain. Card pe text · naam · last line; taare aur mahina
 * nahi (reference). Quote icon fixed — sirf uska rang yahan.
 */
function TestimonialsBlock({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })

  return (
    <>
      <div className="row2">
        <SectionBackground
          value={props.background}
          fallback={THEME_COLORS.blue50}
          onChange={(background) => set({ background })}
          disabled={disabled}
        />
        <ColourField
          label="Quote icon colour"
          value={props.iconColor}
          fallback={THEME_COLORS.blue100}
          onChange={(iconColor) => set({ iconColor })}
          disabled={disabled}
        />
      </div>

      <label className="blk-sublabel">Heading</label>
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />
      <HeadingPositionFields props={props} onChange={onChange} disabled={disabled} />

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Reviews
      </label>
      <ListPicker
        endpoint="/reviews"
        ids={props.testimonialIds ?? []}
        onChange={(testimonialIds) => set({ testimonialIds })}
        max={TESTIMONIALS_MAX}
        meta={(item) => item.lastLine ?? ''}
        allLabel="All text reviews"
        emptyAll={
          <>
            No text reviews yet — add them under <b>Reviews ▸ Text reviews</b>.
          </>
        }
        disabled={disabled}
      />
      <div className="hint">
        Cards appear in this order — drag <b>⠿</b> to move one. Each card shows the review, the
        guest name and the last line; the initials in the circle come from the name. Stars and month
        are not shown here.
      </div>
    </>
  )
}

const IMAGE_CARD_SHAPE_LABEL = {
  square: 'Square (1 : 1)',
  portrait: 'Portrait — taller than wide (3 : 4)',
  tall: 'Tall (9 : 14)',
  landscape: 'Landscape — wider than tall (4 : 3)',
  wide: 'Wide (16 : 9)',
}

const emptyImageCard = () => ({
  id: newId(),
  imageId: null,
  title: '',
  subtitle: '',
  tag: '',
  url: '',
})

/**
 * `Image cards` — Andaman's best islands · Popular beaches · Places to visit (D-96 §14).
 *
 * Panel teen hisse: **Heading** (link ke saath — `All beaches →`), **Card look** (shape, columns,
 * alignment), **Cards** (image · title · do optional line · link, ⠿ drag).
 */
function ImageCardsBlock({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })
  const items = props.items ?? []

  const media = useMediaById(items.map((item) => item.imageId).filter(Boolean))

  const setItems = (next) => set({ items: next })
  const patchItem = (i, patch) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))

  const moveItem = (from, to) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    setItems(next)
  }
  const { handleProps, rowProps } = useListDrag(moveItem, !disabled)

  return (
    <>
      <SectionBackground
        value={props.background}
        fallback={THEME_COLORS.surface}
        onChange={(background) => set({ background })}
        disabled={disabled}
      />

      <label className="blk-sublabel">Heading</label>
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />
      <HeadingPositionFields props={props} onChange={onChange} disabled={disabled} />
      <div className="hint">
        The link sits on the right of a <b>Left</b> heading — e.g. &ldquo;All beaches&rdquo; or
        &ldquo;Explore on the map&rdquo;.
      </div>

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Card look
      </label>
      <div className="row2">
        <div className="field">
          <label>Card shape</label>
          <select
            className="sel"
            value={props.shape ?? 'square'}
            onChange={(e) => set({ shape: e.target.value })}
            disabled={disabled}
          >
            {IMAGE_CARD_SHAPES.map((shape) => (
              <option key={shape} value={shape}>
                {IMAGE_CARD_SHAPE_LABEL[shape] ?? shape}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>Columns on desktop</label>
          <select
            className="sel"
            value={props.columns ?? 4}
            onChange={(e) => set({ columns: Number(e.target.value) })}
            disabled={disabled}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="hint">Tablets show up to 3.</div>
        </div>
        <div className="field">
          <label>Columns on phone</label>
          <select
            className="sel"
            value={props.mobileColumns ?? 2}
            onChange={(e) => set({ mobileColumns: Number(e.target.value) })}
            disabled={disabled}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>Text alignment</label>
          <select
            className="sel"
            value={props.textAlign ?? 'left'}
            onChange={(e) => set({ textAlign: e.target.value })}
            disabled={disabled}
          >
            <option value="left">Left</option>
            <option value="center">Centre</option>
          </select>
        </div>
        <div className="field">
          <label>Text position</label>
          <select
            className="sel"
            value={props.textPosition ?? 'bottom'}
            onChange={(e) => set({ textPosition: e.target.value })}
            disabled={disabled}
          >
            <option value="bottom">Bottom of the card</option>
            <option value="middle">Middle of the card</option>
          </select>
        </div>
      </div>

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Cards
      </label>
      {items.map((item, i) => (
        <div className="info-card" key={item.id ?? i} {...rowProps(i)}>
          <div className="info-card__head">
            {!disabled && (
              <span className="grip" {...handleProps(i)}>
                ⠿
              </span>
            )}
            <b>{item.title || `Card ${i + 1}`}</b>
            {!disabled && (
              <button
                className="blk-x"
                type="button"
                title="Remove card"
                onClick={() => {
                  if (!window.confirm('Remove this card?')) return
                  setItems(items.filter((_, idx) => idx !== i))
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="row2">
            <MediaDrop
              label="Image"
              hint="Fills the whole card."
              media={media[item.imageId]}
              onSelect={(chosen) => patchItem(i, { imageId: chosen.id })}
              onClear={() => patchItem(i, { imageId: null })}
            />
            <div>
              <div className="field">
                <label>Title</label>
                <input
                  className="inp"
                  placeholder="Radhanagar Beach"
                  value={item.title ?? ''}
                  onChange={(e) => patchItem(i, { title: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="field">
                <label>Small line under the title</label>
                <input
                  className="inp"
                  placeholder="Optional — e.g. Havelock"
                  value={item.subtitle ?? ''}
                  onChange={(e) => patchItem(i, { subtitle: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="field">
                <label>Tag</label>
                <input
                  className="inp"
                  placeholder="Optional — e.g. Radhanagar · Scuba"
                  value={item.tag ?? ''}
                  onChange={(e) => patchItem(i, { tag: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Link</label>
                <input
                  className="inp"
                  placeholder="Optional — e.g. /andaman-beaches/radhanagar"
                  value={item.url ?? ''}
                  onChange={(e) => patchItem(i, { url: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {!disabled && items.length < IMAGE_CARDS_MAX && (
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => setItems([...items, emptyImageCard()])}
        >
          ＋ Add card
        </button>
      )}

      <div className="hint">
        With a <b>Link</b> the whole card is clickable. A card with no title and no image does not
        appear. For two groups (like &ldquo;Top islands&rdquo; and &ldquo;Offbeat islands&rdquo;)
        add a second Image cards section right below and leave its heading empty.
      </div>
    </>
  )
}

/**
 * `Logo grid` — _Trusted by leading organisations_ (client, 15 Sep, D-96 §17).
 *
 * Har logo **image + optional heading**. Image na ho to tile me heading text ban kar dikhti hai
 * (reference aaj yahi hai). Neeche ki closing line optional.
 */
function LogoGridBlock({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })
  const items = props.items ?? []

  const media = useMediaById(items.map((item) => item.imageId).filter(Boolean))

  const setItems = (next) => set({ items: next })
  const patchItem = (i, patch) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))

  const moveItem = (from, to) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    setItems(next)
  }
  const { handleProps, rowProps } = useListDrag(moveItem, !disabled)

  return (
    <>
      <SectionBackground
        value={props.background}
        fallback={THEME_COLORS.blue50}
        onChange={(background) => set({ background })}
        disabled={disabled}
      />

      <label className="blk-sublabel">Heading</label>
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />
      <HeadingPositionFields props={props} onChange={onChange} disabled={disabled} />

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Logos
      </label>
      <div className="logo-edit">
        {items.map((item, i) => (
          <div className="logo-edit__row" key={item.id ?? i} {...rowProps(i)}>
            {!disabled && (
              <span className="grip" {...handleProps(i)}>
                ⠿
              </span>
            )}
            <div className="logo-edit__img">
              <MediaDrop
                label=""
                media={media[item.imageId]}
                onSelect={(chosen) => patchItem(i, { imageId: chosen.id })}
                onClear={() => patchItem(i, { imageId: null })}
              />
            </div>
            <input
              className="inp"
              placeholder="Heading — optional"
              value={item.title ?? ''}
              onChange={(e) => patchItem(i, { title: e.target.value })}
              disabled={disabled}
              aria-label={`Logo ${i + 1} heading`}
            />
            {!disabled && (
              <button
                className="blk-x"
                type="button"
                title="Remove logo"
                onClick={() => {
                  if (!window.confirm('Remove this logo?')) return
                  setItems(items.filter((_, idx) => idx !== i))
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      {!disabled && items.length < LOGO_GRID_MAX && (
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => setItems([...items, { id: newId(), imageId: null, title: '' }])}
        >
          ＋ Add logo
        </button>
      )}
      <div className="hint">
        The heading shows under the logo, and is read out for the image. Leave the image empty and
        the heading is shown in the tile as text. Six tiles in a row on desktop, four on tablets,
        three on phones.
      </div>

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Closing line
      </label>
      <div className="row2">
        <div className="field">
          <label>Title</label>
          <input
            className="inp"
            placeholder="Optional — e.g. EXPERIENCE. EXCELLENCE. TRUST."
            value={props.closingTitle ?? ''}
            onChange={(e) => set({ closingTitle: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="field">
          <label>Text</label>
          <input
            className="inp"
            placeholder="Optional — the small line under it"
            value={props.closingText ?? ''}
            onChange={(e) => set({ closingText: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="hint">Leave both empty and nothing shows under the logos.</div>
    </>
  )
}

/**
 * `Package grid` — _Andaman's best-selling packages_ (client, 15 Sep, D-96 §19).
 *
 * **Chunna kuch nahi** — saare published packages apne aap, sabse naya pehle, ek waqt me 16 (client). Isliye
 * panel me sirf heading aur filter ka on/off hai; hint batati hai ki cards kahan se aate hain.
 */
function PackageGridBlock({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })

  return (
    <>
      <SectionBackground
        value={props.background}
        fallback={THEME_COLORS.blue50}
        onChange={(background) => set({ background })}
        disabled={disabled}
      />

      <label className="blk-sublabel">Heading</label>
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />
      <HeadingPositionFields props={props} onChange={onChange} disabled={disabled} />

      <label className="inline-lbl" style={{ display: 'block', margin: '12px 0 6px' }}>
        <input
          type="checkbox"
          checked={props.showFilter !== false}
          onChange={(e) => set({ showFilter: e.target.checked })}
          disabled={disabled}
        />{' '}
        Show Package Type filter
      </label>

      <div className="hint">
        Cards come from your <b>published packages</b> automatically — newest first,{' '}
        {PACKAGE_GRID_MAX} at a time. Each card shows every Package Type as a badge, the duration,
        Ferry and Breakfast, the lowest price and the rating (the package&rsquo;s own, otherwise the
        site default). Point the link on the right to your full packages page.
      </div>
    </>
  )
}

const OFFER_CARD_SHAPE_LABEL = {
  photo: 'Photo (3 : 2)',
  wide: 'Wide (16 : 9)',
  square: 'Square (1 : 1)',
  landscape: 'Landscape (4 : 3)',
}

const emptyOfferCard = () => ({
  id: newId(),
  imageId: null,
  badge: '',
  badgeColor: '',
  title: '',
  subtitle: '',
  chips: [],
  price: '',
  oldPrice: '',
  priceNote: '',
  rating: null,
  url: '',
})

/**
 * `Offer cards` — sightseeing · activities · ferries · category strip, ek static section (client, 15 Sep, D-96 §21).
 *
 * Panel: **Heading** · **Card look** (style, shape, slider/grid, kitne dikhein) · **Cards** (⠿ drag). Card ke jo
 * khaane khaali, wo site pe nahi dikhte — hint me yahi likha hai, kyunki isi se ek card charon look deta hai.
 */
function OfferCardsBlock({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })
  const items = props.items ?? []
  const isBackground = props.cardStyle === 'imageBackground'

  const media = useMediaById(items.map((item) => item.imageId).filter(Boolean))

  const setItems = (next) => set({ items: next })
  const patchItem = (i, patch) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  const setChip = (i, c, value) => {
    const chips = Array.from({ length: 3 }, (_, idx) => (items[i].chips ?? [])[idx] ?? '')
    chips[c] = value
    patchItem(i, { chips })
  }

  const moveItem = (from, to) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    setItems(next)
  }
  const { handleProps, rowProps } = useListDrag(moveItem, !disabled)

  return (
    <>
      <SectionBackground
        value={props.background}
        fallback={THEME_COLORS.surface}
        onChange={(background) => set({ background })}
        disabled={disabled}
      />

      <label className="blk-sublabel">Heading</label>
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />
      <HeadingPositionFields props={props} onChange={onChange} disabled={disabled} />

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Card look
      </label>
      <div className="row2">
        <div className="field">
          <label>Card style</label>
          <select
            className="sel"
            value={props.cardStyle ?? 'imageTop'}
            onChange={(e) => set({ cardStyle: e.target.value })}
            disabled={disabled}
          >
            <option value="imageTop">Image on top — text below</option>
            <option value="imageBackground">Image in the background — text on top</option>
          </select>
        </div>
        {!isBackground && (
          <div className="field">
            <label>Image shape</label>
            <select
              className="sel"
              value={props.shape ?? 'photo'}
              onChange={(e) => set({ shape: e.target.value })}
              disabled={disabled}
            >
              {OFFER_CARD_SHAPES.map((shape) => (
                <option key={shape} value={shape}>
                  {OFFER_CARD_SHAPE_LABEL[shape] ?? shape}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="row2">
        <div className="field">
          <label>Layout</label>
          <select
            className="sel"
            value={props.layout ?? 'slider'}
            onChange={(e) => set({ layout: e.target.value })}
            disabled={disabled}
          >
            <option value="slider">Slider — scrolls sideways</option>
            <option value="grid">Grid — all cards at once</option>
          </select>
        </div>
        <div className="field">
          <label>Cards visible on desktop</label>
          <select
            className="sel"
            value={props.columns ?? 4}
            onChange={(e) => set({ columns: Number(e.target.value) })}
            disabled={disabled}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Cards
      </label>
      {items.map((item, i) => (
        <div className="info-card" key={item.id ?? i} {...rowProps(i)}>
          <div className="info-card__head">
            {!disabled && (
              <span className="grip" {...handleProps(i)}>
                ⠿
              </span>
            )}
            <b>{item.title || `Card ${i + 1}`}</b>
            {!disabled && (
              <button
                className="blk-x"
                type="button"
                title="Remove card"
                onClick={() => {
                  if (!window.confirm('Remove this card?')) return
                  setItems(items.filter((_, idx) => idx !== i))
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="row2">
            <MediaDrop
              label="Image"
              media={media[item.imageId]}
              onSelect={(chosen) => patchItem(i, { imageId: chosen.id })}
              onClear={() => patchItem(i, { imageId: null })}
            />
            <div>
              <div className="field">
                <label>Title</label>
                <input
                  className="inp"
                  placeholder="Baratang — limestone caves & mud volcano"
                  value={item.title ?? ''}
                  onChange={(e) => patchItem(i, { title: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="field">
                <label>Small line</label>
                <input
                  className="inp"
                  placeholder="Optional — e.g. Port Blair → Havelock · 90 min"
                  value={item.subtitle ?? ''}
                  onChange={(e) => patchItem(i, { subtitle: e.target.value })}
                  disabled={disabled}
                />
              </div>
              {!isBackground && (
                <div className="row2">
                  <div className="field">
                    <label>Badge</label>
                    <input
                      className="inp"
                      placeholder="Optional — e.g. PRIVATE CAB"
                      value={item.badge ?? ''}
                      onChange={(e) => patchItem(i, { badge: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  <ColourField
                    label="Badge colour"
                    value={item.badgeColor}
                    fallback="#f4701c"
                    onChange={(badgeColor) => patchItem(i, { badgeColor })}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          </div>

          {!isBackground && (
            <div className="row3">
              {[0, 1, 2].map((c) => (
                <div className="field" key={c}>
                  <label>Chip {c + 1}</label>
                  <input
                    className="inp"
                    placeholder={c === 0 ? 'Optional — e.g. Full day' : 'Optional'}
                    value={(item.chips ?? [])[c] ?? ''}
                    onChange={(e) => setChip(i, c, e.target.value)}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="row3">
            <div className="field">
              <label>Price</label>
              <input
                className="inp"
                placeholder="₹3,950"
                value={item.price ?? ''}
                onChange={(e) => patchItem(i, { price: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div className="field">
              <label>Price note</label>
              <input
                className="inp"
                placeholder={isBackground ? 'e.g. from' : 'e.g. /cab or Deluxe'}
                value={item.priceNote ?? ''}
                onChange={(e) => patchItem(i, { priceNote: e.target.value })}
                disabled={disabled}
              />
            </div>
            {!isBackground && (
              <div className="field">
                <label>Old price</label>
                <input
                  className="inp"
                  placeholder="Optional — shown struck out"
                  value={item.oldPrice ?? ''}
                  onChange={(e) => patchItem(i, { oldPrice: e.target.value })}
                  disabled={disabled}
                />
              </div>
            )}
          </div>

          <div className="row2">
            {!isBackground && (
              <div className="field">
                <label>Rating</label>
                <input
                  className="inp"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="Optional — e.g. 4.7"
                  value={item.rating ?? ''}
                  onChange={(e) =>
                    patchItem(i, { rating: e.target.value === '' ? null : e.target.value })
                  }
                  disabled={disabled}
                />
              </div>
            )}
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Link</label>
              <input
                className="inp"
                placeholder="Optional — the whole card becomes clickable"
                value={item.url ?? ''}
                onChange={(e) => patchItem(i, { url: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ))}

      {!disabled && items.length < OFFER_CARDS_MAX && (
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => setItems([...items, emptyOfferCard()])}
        >
          ＋ Add card
        </button>
      )}

      <div className="hint">
        Anything left empty is not shown on the card. Type the price as you want it to read, with
        the currency sign — &ldquo;₹3,950&rdquo; or &ldquo;On request&rdquo;. The price note sits
        after the price on image-on-top cards (&ldquo;/cab&rdquo;) and before it on background cards
        (&ldquo;from&rdquo;). Up to {OFFER_CARDS_MAX} cards.
      </div>
    </>
  )
}

/**
 * `Custom editor` — client apna HTML khud likhta hai (client, 16 Sep, D-96 §25).
 *
 * ⚠️ **CSS yahan nahi** — editor me `<style>` likhne pe wo save hi nahi hota (sanitizer, R20). Uska ghar
 * **Settings ▸ Custom CSS** hai, aur hint me wahi raasta likha hai; bina uske client baar-baar `<style>`
 * likh kar sochta ki content gayab ho raha hai (wahi "kuch na hona" wala lakshan, D-86).
 */
function CustomHtmlBlock({ props, onChange, disabled, home }) {
  const set = (patch) => onChange({ ...props, ...patch })

  return (
    <>
      {/* Background sirf home ke sections pe — Tour page pe block column ke andar baithta hai */}
      {home && (
        <SectionBackground
          value={props.background}
          fallback={THEME_COLORS.surface}
          onChange={(background) => set({ background })}
          disabled={disabled}
        />
      )}

      <div className="field">
        <label>CSS class</label>
        <input
          className="inp"
          placeholder="Optional — e.g. home-offer-strip"
          value={props.className ?? ''}
          onChange={(e) => set({ className: e.target.value })}
          disabled={disabled}
        />
        <div className="hint">
          Goes on the block itself, so your CSS can target it —{' '}
          <code>.home-offer-strip &#123; … &#125;</code>. Letters, numbers, spaces, - and _ only.
        </div>
      </div>

      <div className="field">
        <label>Content</label>
        <HtmlEditor
          value={props.html ?? ''}
          onChange={(html) => set({ html })}
          disabled={disabled}
          height={360}
        />
        <div className="hint">
          Write your own HTML here — use the <b>Text</b> tab in the editor. Styles go in{' '}
          <b>Settings ▸ Custom CSS</b>: a <code>&lt;style&gt;</code> tag written here is removed
          when you save.
        </div>
      </div>
    </>
  )
}

/**
 * List ke kram ka saanjha hisaab — ek item patch, drag se move. Text with video aur Award badges dono pe.
 * (Purane section editors me yahi code apna-apna hai; unhe chhua nahi gaya.)
 */
function useItemList(props, onChange, disabled) {
  const items = props.items ?? []
  const setItems = (next) => onChange({ ...props, items: next })
  const patchItem = (i, patch) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  const moveItem = (from, to) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    setItems(next)
  }
  const { handleProps, rowProps } = useListDrag(moveItem, !disabled)

  return { items, setItems, patchItem, handleProps, rowProps }
}

const emptyPoint = () => ({ id: newId(), icon: 'none', imageId: null, title: '', text: '' })

/**
 * `Text with video` — reference ka About us + Our story video (client, 15 Sep, D-96 §22).
 *
 * Panel: **Text** (heading · editor · points drag se · button) aur **Image or video** (kis taraf · image ·
 * video link · caption). Video link khaali = box sirf image (client).
 */
function TextVideoBlock({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })
  const { items, setItems, patchItem, handleProps, rowProps } = useItemList(
    props,
    onChange,
    disabled,
  )

  const media = useMediaById([props.imageId, ...items.map((item) => item.imageId)].filter(Boolean))

  return (
    <>
      <SectionBackground
        value={props.background}
        fallback={THEME_COLORS.blue50}
        onChange={(background) => set({ background })}
        disabled={disabled}
      />

      <label className="blk-sublabel">Text</label>
      <div className="field">
        <label>Heading</label>
        <input
          className="inp"
          value={props.heading ?? ''}
          onChange={(e) => set({ heading: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label>Text</label>
        <HtmlEditor
          value={props.text ?? ''}
          onChange={(text) => set({ text })}
          disabled={disabled}
          height={170}
        />
      </div>

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Points
      </label>
      {items.map((item, i) => (
        <div className="info-card" key={item.id ?? i} {...rowProps(i)}>
          <div className="info-card__head">
            {!disabled && (
              <span className="grip" {...handleProps(i)}>
                ⠿
              </span>
            )}
            <b>{item.title || `Point ${i + 1}`}</b>
            {!disabled && (
              <button
                className="blk-x"
                type="button"
                title="Remove point"
                onClick={() => {
                  if (!window.confirm('Remove this point?')) return
                  setItems(items.filter((_, idx) => idx !== i))
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="row2">
            <div className="field">
              <label>Icon</label>
              <select
                className="sel"
                value={item.icon ?? 'none'}
                onChange={(e) => patchItem(i, { icon: e.target.value })}
                disabled={disabled}
              >
                {ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {ICON_LABELS[icon] ?? icon}
                  </option>
                ))}
              </select>
            </div>
            <MediaDrop
              label="Or your own image"
              hint="Optional — shown instead of the icon."
              media={media[item.imageId]}
              onSelect={(chosen) => patchItem(i, { imageId: chosen.id })}
              onClear={() => patchItem(i, { imageId: null })}
            />
          </div>

          <div className="field">
            <label>Title</label>
            <input
              className="inp"
              value={item.title ?? ''}
              onChange={(e) => patchItem(i, { title: e.target.value })}
              disabled={disabled}
            />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Description</label>
            <HtmlEditor
              value={item.text ?? ''}
              onChange={(text) => patchItem(i, { text })}
              disabled={disabled}
              height={110}
            />
          </div>
        </div>
      ))}

      {!disabled && items.length < TEXT_VIDEO_POINTS_MAX && (
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => setItems([...items, emptyPoint()])}
        >
          ＋ Add point
        </button>
      )}
      <div className="hint">
        Up to {TEXT_VIDEO_POINTS_MAX} points. In the description only bold, italic and links are
        kept. A point with nothing filled in does not appear.
      </div>

      <div className="row2" style={{ marginTop: 14 }}>
        <div className="field">
          <label>Button label</label>
          <input
            className="inp"
            placeholder="Optional — e.g. Know more"
            value={props.buttonLabel ?? ''}
            onChange={(e) => set({ buttonLabel: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="field">
          <label>Button link</label>
          <input
            className="inp"
            placeholder="/about-us"
            value={props.buttonUrl ?? ''}
            onChange={(e) => set({ buttonUrl: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="hint">The button shows only when both are filled in.</div>

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Image or video
      </label>
      <div className="row2">
        <div className="field">
          <label>Side</label>
          <select
            className="sel"
            value={props.imageSide ?? 'right'}
            onChange={(e) => set({ imageSide: e.target.value })}
            disabled={disabled}
          >
            <option value="right">Right</option>
            <option value="left">Left</option>
          </select>
          <div className="hint">On desktop. Tablets and phones show it under the text.</div>
        </div>
        <MediaDrop
          label="Image"
          media={media[props.imageId]}
          onSelect={(chosen) => set({ imageId: chosen.id })}
          onClear={() => set({ imageId: null })}
        />
      </div>

      <div className="field">
        <label>Video link</label>
        <input
          className="inp"
          placeholder="Optional — e.g. https://youtu.be/…"
          value={props.videoUrl ?? ''}
          onChange={(e) => set({ videoUrl: e.target.value })}
          disabled={disabled}
        />
        <div className="hint">
          YouTube and Vimeo links play in a popup; other links open in a new tab. Leave it empty and
          the box is just the image — no play button.
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>Caption title</label>
          <input
            className="inp"
            placeholder="Optional — e.g. Our story — watch the video"
            value={props.videoTitle ?? ''}
            onChange={(e) => set({ videoTitle: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="field">
          <label>Caption text</label>
          <input
            className="inp"
            placeholder="Optional — the small line under it"
            value={props.videoText ?? ''}
            onChange={(e) => set({ videoText: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="hint">
        The caption sits at the bottom of the image. Leave both empty and nothing shows there.
      </div>
    </>
  )
}

/**
 * `Award badges` — reference ka TripAdvisor Travellers&rsquo; Choice row (client, 15 Sep, D-96 §23).
 *
 * Har badge ek patli row (Logo grid jaisi): ⠿ · image · bada text · chhota text · ✕. Rang poore section ka ek.
 */
function AwardBadgesBlock({ props, onChange, disabled }) {
  const set = (patch) => onChange({ ...props, ...patch })
  const { items, setItems, patchItem, handleProps, rowProps } = useItemList(
    props,
    onChange,
    disabled,
  )

  const media = useMediaById(items.map((item) => item.imageId).filter(Boolean))

  return (
    <>
      <SectionBackground
        value={props.background}
        fallback={THEME_COLORS.blue50}
        onChange={(background) => set({ background })}
        disabled={disabled}
      />

      <label className="blk-sublabel">Heading</label>
      <SectionHeadingFields props={props} onChange={onChange} disabled={disabled} />
      <HeadingPositionFields props={props} onChange={onChange} disabled={disabled} />

      <label className="blk-sublabel" style={{ marginTop: 14 }}>
        Badges
      </label>
      <div className="row2">
        <ColourField
          label="Badge colour"
          value={props.badgeColor}
          fallback={THEME_COLORS.gold}
          onChange={(badgeColor) => set({ badgeColor })}
          disabled={disabled}
        />
      </div>

      <div className="logo-edit">
        {items.map((item, i) => (
          <div className="logo-edit__row badge-edit__row" key={item.id ?? i} {...rowProps(i)}>
            {!disabled && (
              <span className="grip" {...handleProps(i)}>
                ⠿
              </span>
            )}
            <div className="logo-edit__img">
              <MediaDrop
                label=""
                media={media[item.imageId]}
                onSelect={(chosen) => patchItem(i, { imageId: chosen.id })}
                onClear={() => patchItem(i, { imageId: null })}
              />
            </div>
            <input
              className="inp"
              placeholder="2018"
              value={item.title ?? ''}
              onChange={(e) => patchItem(i, { title: e.target.value })}
              disabled={disabled}
              aria-label={`Badge ${i + 1} big text`}
            />
            <input
              className="inp"
              placeholder="Choice"
              value={item.label ?? ''}
              onChange={(e) => patchItem(i, { label: e.target.value })}
              disabled={disabled}
              aria-label={`Badge ${i + 1} small text`}
            />
            {!disabled && (
              <button
                className="blk-x"
                type="button"
                title="Remove badge"
                onClick={() => {
                  if (!window.confirm('Remove this badge?')) return
                  setItems(items.filter((_, idx) => idx !== i))
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      {!disabled && items.length < AWARD_BADGES_MAX && (
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => setItems([...items, { id: newId(), imageId: null, title: '', label: '' }])}
        >
          ＋ Add badge
        </button>
      )}
      <div className="hint">
        Each badge is a circle with big text (&ldquo;2018&rdquo;) and small text
        (&ldquo;Choice&rdquo;) in the badge colour. Add an image — such as the award&rsquo;s own
        badge — and it is shown instead of the circle, with the text read out for it. Up to{' '}
        {AWARD_BADGES_MAX} badges.
      </div>
    </>
  )
}

const EDITORS = {
  customHtml: CustomHtmlBlock,
  textVideo: TextVideoBlock,
  awardBadges: AwardBadgesBlock,
  offerCards: OfferCardsBlock,
  packageGrid: PackageGridBlock,
  logoGrid: LogoGridBlock,
  testimonials: TestimonialsBlock,
  imageCards: ImageCardsBlock,
  videoReviews: VideoReviewsBlock,
  heroForm: HeroFormBlock,
  infoCards: InfoCardsBlock,
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
 * @param {boolean} [props.home]    Home Page ke sections — shared blocks pe background colour dikhe (D-96 §12)
 */
export default function PageBlocks({
  blocks,
  types = PAGE_BLOCK_TYPES,
  onChange,
  disabled,
  open,
  onToggle,
  home = false,
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
                    home={home}
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
