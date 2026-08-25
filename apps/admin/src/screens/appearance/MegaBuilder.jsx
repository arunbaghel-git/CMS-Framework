import { useState } from 'react'
import { BUTTON_VARIANTS, MEGA_COLUMN_COUNTS, MEGA_LAYOUTS, allowedColumnCounts } from '@cms/shared'

import { useListDrag } from './drag-list.js'
import {
  blankChild,
  blankCta,
  blankGroup,
  moveItem,
  removeAt,
  replaceAt,
  withColumnCount,
  withLayout,
} from './menu-tree.js'

/**
 * Mega menu ka builder — spec 006 §6.4.
 *
 * **Inline hai, modal nahi.** Frozen design me koi modal/drawer primitive hai hi nahi
 * (poori `admin-design.html` me `.modal`/`.drawer`/`.sheet` teenon absent) — modal banana
 * R15 todna hota. Isliye ye mega item ke apne `.day-body` ke andar, nested `.day`
 * accordions se bana hai — wahi primitive jise design khud "menu items" ke liye likhta hai.
 *
 * **Reorder har level pe drag-drop se hai** — columns, groups aur links teenon. Pehle
 * yahan ↑↓ buttons the (spec 006 Q-C); client ne 24 Aug ko drag maanga. Data me kuch nahi
 * badla, kyunki order array ki position hai (D-43).
 */

const LAYOUT_LABELS = { sm: 'Small', md: 'Medium', wide: 'Wide', full: 'Full width' }

/** Wahi labels jo Header Buttons pe hain — do jagah do naam client ko confuse karte. */
const VARIANT_LABELS = { outline: 'Outline', primary: 'Primary', accent: 'Accent' }

/** Har row pe wahi handle — `.day-head` ke `.grip` se dikhne me ek jaisa. */
function Grip({ handle }) {
  return (
    <span className="grip" {...handle}>
      ⠿
    </span>
  )
}

/** `.day-head` ka click accordion toggle karta hai — delete usme nahi girna chahiye. */
function RemoveButton({ onClick, label }) {
  return (
    <button
      type="button"
      className="btn btn-sm btn-danger"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={`Remove ${label}`}
    >
      ×
    </button>
  )
}

/**
 * Accordion ka caret — top-level items jaisa hi.
 *
 * Columns aur groups **default band** hain: 6 columns × 3 groups × 8 links wala mega khula
 * rakhne pe page itna lamba ho jaata hai ki neeche ka CTA section dhoondhna padta hai.
 * Band rehne se ek nazar me poora shape dikh jaata hai — kis column me kitne groups.
 */
function Caret({ open }) {
  return <span className="toggle-ico">{open ? '▾' : '▸'}</span>
}

function LinkRow({ link, onChange, onRemove, disabled, handle, row }) {
  return (
    <div className="mega-link" {...row}>
      {!disabled && <Grip handle={handle} />}
      <input
        className="inp"
        value={link.label}
        placeholder="Link text"
        disabled={disabled}
        onChange={(e) => onChange({ ...link, label: e.target.value })}
      />
      <input
        className="inp"
        value={link.link.url}
        placeholder="/page or https://"
        disabled={disabled}
        onChange={(e) => onChange({ ...link, link: { ...link.link, url: e.target.value } })}
      />
      <input
        className="inp"
        value={link.className}
        placeholder="CSS class"
        disabled={disabled}
        onChange={(e) => onChange({ ...link, className: e.target.value })}
      />
      {!disabled && <RemoveButton onClick={onRemove} label="link" />}
    </div>
  )
}

function GroupEditor({ group, onChange, onRemove, disabled, handle, row, defaultOpen }) {
  /**
   * `useState` sirf mount pe padhta hai — aur wahi chahiye. Naya group naya `id` leke aata
   * hai, yaani nayi `key`, yaani naya mount — to wo apne aap khula milta hai. Purane groups
   * ka state dobara render pe nahi chhedta.
   */
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const setLinks = (links) => onChange({ ...group, links })
  const linkDrag = useListDrag((from, to) => setLinks(moveItem(group.links, from, to)), !disabled)

  return (
    <div className={`day${open ? '' : ' closed'}`} {...row}>
      <div className="day-head" onClick={() => setOpen((v) => !v)}>
        {!disabled && <Grip handle={handle} />}
        <span className="dt">{group.heading || 'Untitled group'}</span>
        <span className="muted">
          {group.links.length} {group.links.length === 1 ? 'link' : 'links'}
        </span>
        {!disabled && <RemoveButton onClick={onRemove} label="group" />}
        <Caret open={open} />
      </div>

      <div className="day-body">
        <div className="row2">
          <div className="field">
            <label>Heading</label>
            <input
              className="inp"
              value={group.heading}
              placeholder="Optional"
              disabled={disabled}
              onChange={(e) => onChange({ ...group, heading: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Heading link</label>
            <input
              className="inp"
              value={group.link?.url ?? ''}
              placeholder="Optional — makes the heading clickable"
              disabled={disabled || !group.heading}
              onChange={(e) =>
                onChange({
                  ...group,
                  link: e.target.value
                    ? { type: 'url', url: e.target.value, target: '_self', className: '' }
                    : null,
                })
              }
            />
            {/* Server bhi yahi rok lagata hai — bina label ke link render hi nahi ho sakta */}
            {!group.heading && <p className="hint">Add a heading before making it clickable.</p>}
          </div>
        </div>

        <div className="field">
          <label>CSS class</label>
          <input
            className="inp"
            value={group.className}
            placeholder="e.g. featured-group"
            disabled={disabled}
            onChange={(e) => onChange({ ...group, className: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Links</label>
          {group.links.map((link, i) => (
            <LinkRow
              key={link.id ?? i}
              link={link}
              disabled={disabled}
              handle={linkDrag.handleProps(i)}
              row={linkDrag.rowProps(i)}
              onChange={(next) => setLinks(replaceAt(group.links, i, next))}
              onRemove={() => setLinks(removeAt(group.links, i))}
            />
          ))}
          {!disabled && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setLinks([...group.links, blankChild()])}
            >
              + Add link
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ColumnEditor({ column, index, onChange, disabled, handle, row, defaultOpen }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  /** Abhi-abhi jo group juda hai — wahi khula khulta hai, baaki band rehte hain. */
  const [addedGroupId, setAddedGroupId] = useState(null)

  const setGroups = (groups) => onChange({ ...column, groups })
  const groupDrag = useListDrag(
    (from, to) => setGroups(moveItem(column.groups, from, to)),
    !disabled,
  )

  function addGroup() {
    const group = blankGroup()
    setAddedGroupId(group.id)
    setGroups([...column.groups, group])
  }

  return (
    <div className={`day${open ? '' : ' closed'}`} {...row}>
      <div className="day-head" onClick={() => setOpen((v) => !v)}>
        {!disabled && <Grip handle={handle} />}
        <span className="dt">Column {index + 1}</span>
        <span className="muted">
          {column.groups.length} {column.groups.length === 1 ? 'group' : 'groups'}
        </span>
        <Caret open={open} />
      </div>

      <div className="day-body">
        <div className="field">
          <label>CSS class</label>
          <input
            className="inp"
            value={column.className}
            placeholder="e.g. wide-column"
            disabled={disabled}
            onChange={(e) => onChange({ ...column, className: e.target.value })}
          />
        </div>

        {column.groups.map((group, i) => (
          <GroupEditor
            key={group.id ?? i}
            group={group}
            disabled={disabled}
            defaultOpen={group.id === addedGroupId}
            handle={groupDrag.handleProps(i)}
            row={groupDrag.rowProps(i)}
            onChange={(next) => setGroups(replaceAt(column.groups, i, next))}
            onRemove={() => setGroups(removeAt(column.groups, i))}
          />
        ))}

        {!disabled && (
          <button type="button" className="btn btn-sm" onClick={addGroup}>
            + Add group
          </button>
        )}
      </div>
    </div>
  )
}

export default function MegaBuilder({ mega, onChange, disabled }) {
  const allowed = allowedColumnCounts(mega.layout)
  /** Column count badhane pe jo naye columns bane — wahi khule milte hain. */
  const [addedColumnIds, setAddedColumnIds] = useState([])

  const columnDrag = useListDrag(
    (from, to) => onChange({ ...mega, columns: moveItem(mega.columns, from, to) }),
    !disabled,
  )

  /**
   * Column count ghatane pe user ko pehle bataya jaata hai.
   *
   * Bina confirm ke ye ek chup-chaap data loss hai — 6 se 4 karte hi do column ka poora
   * content chala jaata, aur undo ka koi raasta nahi hai.
   */
  function handleColumnCount(next) {
    const removed = mega.columns.length - next
    const lost = mega.columns.slice(next).some((c) => (c.groups?.length ?? 0) > 0)

    if (removed > 0 && lost) {
      const ok = window.confirm(
        `This removes ${removed} ${removed === 1 ? 'column' : 'columns'} and the links inside.`,
      )
      if (!ok) return
    }

    const before = new Set(mega.columns.map((c) => c.id))
    const updated = withColumnCount(mega, next)

    setAddedColumnIds(updated.columns.filter((c) => !before.has(c.id)).map((c) => c.id))
    onChange(updated)
  }

  return (
    <div className="mega-builder">
      <div className="row3">
        <div className="field">
          <label>Mega layout</label>
          <select
            className="sel"
            value={mega.layout}
            disabled={disabled}
            onChange={(e) => onChange(withLayout(mega, e.target.value))}
          >
            {MEGA_LAYOUTS.map((l) => (
              <option key={l} value={l}>
                {LAYOUT_LABELS[l]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Columns</label>
          <select
            className="sel"
            value={mega.columnCount}
            disabled={disabled}
            onChange={(e) => handleColumnCount(Number(e.target.value))}
          >
            {/*
              Jo counts is layout pe fit nahi hote wo **disabled** hain, chhupe nahi —
              user ko dikhna chahiye ki option maujood hai par is width pe nahi chalta.
              Wahi rule server pe bhi hai (spec 006 §2.2), ek hi function se.
            */}
            {MEGA_COLUMN_COUNTS.map((n) => (
              <option key={n} value={n} disabled={!allowed.includes(n)}>
                {n}
              </option>
            ))}
          </select>
          <p className="hint">
            A {LAYOUT_LABELS[mega.layout].toLowerCase()} mega menu supports {allowed.join(', ')}{' '}
            columns.
          </p>
        </div>

        <div className="field">
          <label>Mega CSS class</label>
          <input
            className="inp"
            value={mega.className}
            placeholder="e.g. mega-packages"
            disabled={disabled}
            onChange={(e) => onChange({ ...mega, className: e.target.value })}
          />
        </div>
      </div>

      {mega.columns.map((column, i) => (
        <ColumnEditor
          key={column.id ?? i}
          column={column}
          index={i}
          disabled={disabled}
          defaultOpen={addedColumnIds.includes(column.id)}
          handle={columnDrag.handleProps(i)}
          row={columnDrag.rowProps(i)}
          onChange={(next) => onChange({ ...mega, columns: replaceAt(mega.columns, i, next) })}
        />
      ))}

      <div className="field">
        <label className="inline-lbl">
          <input
            type="checkbox"
            checked={Boolean(mega.cta)}
            disabled={disabled}
            onChange={(e) => onChange({ ...mega, cta: e.target.checked ? blankCta() : null })}
          />{' '}
          Show a call to action below the columns
        </label>
      </div>

      {mega.cta && (
        <div className="row3">
          <div className="field">
            <label>CTA text</label>
            <input
              className="inp"
              value={mega.cta.text}
              disabled={disabled}
              onChange={(e) => onChange({ ...mega, cta: { ...mega.cta, text: e.target.value } })}
            />
          </div>
          <div className="field">
            <label>Button label</label>
            <input
              className="inp"
              value={mega.cta.buttonLabel}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...mega, cta: { ...mega.cta, buttonLabel: e.target.value } })
              }
            />
          </div>
          <div className="field">
            <label>Button URL</label>
            <input
              className="inp"
              value={mega.cta.buttonUrl}
              placeholder="/contact"
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...mega, cta: { ...mega.cta, buttonUrl: e.target.value } })
              }
            />
          </div>
          <div className="field">
            {/*
              Wahi `variant` jo header ke buttons pe hai — do alag mechanism rakhne se
              client ko do jagah do tarah se seekhna padta.
            */}
            <label>Button style</label>
            <select
              className="sel"
              value={mega.cta.variant ?? 'accent'}
              disabled={disabled}
              onChange={(e) => onChange({ ...mega, cta: { ...mega.cta, variant: e.target.value } })}
            >
              {BUTTON_VARIANTS.map((v) => (
                <option key={v} value={v}>
                  {VARIANT_LABELS[v] ?? v}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
