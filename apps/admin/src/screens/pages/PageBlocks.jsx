import { ENTRY_LIST_MAX_LIMIT, PAGE_BLOCK_TYPES } from '@cms/shared'
import { useId } from 'react'

import { useListDrag } from '../../lib/drag-list.js'
import { useEntryList } from '../../lib/use-entries.js'
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
  faqs: 'FAQs',
}

/** Har block ka apna rang — design se hi (`.blk--*`). */
const BLOCK_CLASS = {
  richText: 'text',
  twoColumn: 'two',
  cards: 'cards',
  packageList: 'list',
  faqs: 'faq',
}

/** `id` client pe banti hai — server bhi bhar deta hai, par reorder ke liye abhi chahiye. */
const newId = () =>
  `blk-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

/** Naye block ka khaali shape. Props server pe `.parse()` se bharenge, yahan sirf shuruaat. */
function emptyBlock(type) {
  const props = {
    richText: { html: '' },
    twoColumn: { ratio: '50-50', left: '', right: '', reverseOnMobile: false },
    cards: { columns: 3, items: [] },
    packageList: {},
    faqs: { heading: '', items: [], emitSchema: true },
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
    case 'twoColumn':
      return p.ratio ?? '50-50'
    case 'cards':
      return `${(p.items ?? []).length} card(s) · ${p.columns ?? 3} columns`
    case 'packageList':
      return p.heading || 'Package list'
    case 'faqs':
      return `${p.heading || 'FAQs'} — ${(p.items ?? []).length} question(s)`
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
      <div className="field" style={{ maxWidth: 200 }}>
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

function CardsBlock({ props, onChange, disabled }) {
  const items = props.items ?? []
  const setItems = (next) => onChange({ ...props, items: next })

  const patch = (i, key, value) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)))

  return (
    <>
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

  const filter = props.filter ?? 'all'
  const chosen = props.packageIds ?? []

  /**
   * Baayen wali list — **filter server pe lagta hai, browser me nahi** (R14).
   *
   * `duration` pe koi narrowing nahi hoti: `nights` `fields` ke andar hai aur list endpoint uspe
   * filter nahi karta. Wo radio waise bhi dhoondhne ke liye nahi hai — uska kaam page pe pills
   * laana hai.
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
    ...(filter === 'packageType' && props.packageTypeId
      ? { packageTypes: props.packageTypeId }
      : {}),
    ...(filter === 'destination' && props.destinationId
      ? { destinations: props.destinationId }
      : {}),
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
  const setFilter = (next) =>
    onChange({
      ...props,
      filter: next,
      ...(next === 'packageType' ? {} : { packageTypeId: null }),
      ...(next === 'destination' ? {} : { destinationId: null }),
    })

  const RADIOS = [
    { key: 'all', label: 'All' },
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

      <label className="blk-sublabel">Filter</label>
      <div className="pick-filter">
        {RADIOS.map(({ key, label }) => (
          <label className="inline-lbl" key={key}>
            <input
              type="radio"
              name={radioName}
              checked={filter === key}
              onChange={() => setFilter(key)}
              disabled={disabled}
            />{' '}
            {label}
          </label>
        ))}

        {filter === 'packageType' && (
          <select
            className="sel"
            style={{ width: 'auto' }}
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

        {filter === 'destination' && (
          <select
            className="sel"
            style={{ width: 'auto' }}
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
      </div>

      {filter === 'duration' && (
        <div className="hint">
          The page shows duration pills, built from the packages you picked.
        </div>
      )}

      <div className="picker">
        <div className="picker__col">
          <div className="picker__head">
            All packages <span className="muted">{loading ? '…' : pool.length}</span>
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
            Is page pe <span className="muted">{chosen.length}</span>
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

      <label className="inline-lbl" style={{ marginTop: 10 }}>
        <input
          type="checkbox"
          checked={props.showBadges !== false}
          onChange={(e) => onChange({ ...props, showBadges: e.target.checked })}
          disabled={disabled}
        />{' '}
        Show the rating and discount badge
      </label>
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
      <div className="field">
        <label>Heading</label>
        <input
          className="inp"
          value={props.heading ?? ''}
          onChange={(e) => onChange({ ...props, heading: e.target.value })}
          disabled={disabled}
        />
      </div>

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

      <label className="inline-lbl" style={{ marginTop: 10 }}>
        <input
          type="checkbox"
          checked={props.emitSchema !== false}
          onChange={(e) => onChange({ ...props, emitSchema: e.target.checked })}
          disabled={disabled}
        />{' '}
        Google ka FAQ schema is block se banaayein
      </label>
    </>
  )
}

const EDITORS = {
  richText: TextBlock,
  twoColumn: TwoColumnBlock,
  cards: CardsBlock,
  packageList: PackageListBlock,
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

  const move = (i, delta) => {
    const j = i + delta
    if (j < 0 || j >= blocks.length) return

    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <>
      {blocks.map((block, i) => {
        const Editor = EDITORS[block.type]
        const isOpen = open.includes(block.id)

        return (
          <div className={`blk blk--${BLOCK_CLASS[block.type] ?? 'text'}`} key={block.id ?? i}>
            <div className="blk-head">
              {/*
               * Reorder abhi ⌃/⌄ se hai, drag se nahi. Kaam wahi hota hai aur keyboard se bhi
               * chalta hai; drag `SortablePanels` ki tarah baad me lag sakta hai.
               */}
              {!disabled && (
                <span className="blk-move">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>
                    ⌃
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === blocks.length - 1}
                  >
                    ⌄
                  </button>
                </span>
              )}

              <span className="blk-chip">{BLOCK_LABEL[block.type] ?? block.type}</span>

              <button
                className="blk-sum"
                type="button"
                onClick={() => onToggle(block.id)}
                title={isOpen ? 'Collapse' : 'Expand'}
              >
                {summarize(block)}
              </button>

              <span className="toggle-ico">{isOpen ? '▾' : '▸'}</span>

              {!disabled && (
                <button
                  className="blk-x"
                  type="button"
                  title="Remove block"
                  onClick={() => {
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
          <span className="hint" style={{ margin: 0 }}>
            New blocks are added at the end. Use ⌃ ⌄ to reorder.
          </span>
        </div>
      )}
    </>
  )
}
