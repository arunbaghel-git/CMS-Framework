import { useEffect, useState } from 'react'
import { BUTTON_VARIANTS, ICONS, ICON_LABELS, LINK_TARGETS, MENU_TYPES } from '@cms/shared'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import AppearanceTabs from './AppearanceTabs.jsx'
import MegaBuilder from './MegaBuilder.jsx'
import { useListDrag } from './drag-list.js'
import {
  blankChild,
  blankItem,
  itemTypeLabel,
  megaSummary,
  moveItem,
  removeAt,
  replaceAt,
  withMenuType,
} from './menu-tree.js'
import './Appearance.css'

/**
 * Appearance → Menus — `admin-design.html` ke `#s-appearance` se.
 *
 * Do column, design ke hi shape me:
 *   Left   "Add Menu Items"  +  "Theme Locations"  +  "Header Buttons"
 *   Right  "<menu> — structure"  — `.day` accordions, `.grip`, aur `panel-foot` me Save
 *
 * **Header ke buttons yahan hain, kisi alag "Header" tab me nahi.** Ye screen hi asal me
 * header ki screen hai — Header location isi ke left column se assign hoti hai.
 *
 * **Progressive hai** (spec 006 §6.3): Simple pe do field, Dropdown pe children ki list,
 * Mega pe poora builder. Non-technical client ko mega ki complexity **tabhi** dikhti hai
 * jab wo mega chune.
 *
 * ⚠️ **"Add Menu Items" ke Pages/Destinations checklists Slice 0 me khaali hain** —
 * `entries` module abhi hai hi nahi. Wo chhupaye nahi gaye: khaali cheez khaali dikhni
 * chahiye, tooti hui nahi (D-30). Phase 1 me wo apne aap bhar jaayenge.
 */

const MENU_TYPE_LABELS = { link: 'Simple link', dropdown: 'Dropdown', mega: 'Mega menu' }

const TARGET_LABELS = { _self: 'Same tab', _blank: 'New tab' }

/** Button ke look ke labels — value hi contract hai, ye sirf UI ka naam hai (R11/R17). */
const VARIANT_LABELS = { outline: 'Outline', primary: 'Primary', accent: 'Accent' }

/** Server bhi yahi cap lagata hai (`settingsSchema.headerButtons`) — do jagah ek hi number. */
const MAX_HEADER_BUTTONS = 4

/**
 * "Add menu items" ka ek collapsible source — WordPress ke isi panel jaisa.
 *
 * Ye wahi `.day` accordion hai jo menu items, columns aur groups use karte hain — koi naya
 * visual nahi. Yahan `.grip` nahi hai kyunki sources reorder nahi hote; sirf label aur caret.
 *
 * Phase 1 me jab `entries`/`taxonomies` aayenge to Posts, Categories aur Tags bas isi
 * component ki aur entries ban jaayenge.
 */
function SourcePanel({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))

  return (
    <div className={`day${open ? '' : ' closed'}`}>
      <div className="day-head" onClick={() => setOpen((v) => !v)}>
        <span className="dt">{title}</span>
        <span className="toggle-ico">{open ? '▾' : '▸'}</span>
      </div>
      <div className="day-body">{children}</div>
    </div>
  )
}

/** Har row pe wahi handle — `.day-head` ke `.grip` se dikhne me ek jaisa. */
function Grip({ handle }) {
  return (
    <span className="grip" {...handle}>
      ⠿
    </span>
  )
}

/** Dropdown ka ek child — aur uske andar grandchild (max depth 3, D-43). */
function ChildEditor({ child, depth, onChange, onRemove, disabled, handle, row }) {
  const setChildren = (children) => onChange({ ...child, children })
  const grandDrag = useListDrag(
    (from, to) => setChildren(moveItem(child.children ?? [], from, to)),
    !disabled,
  )

  return (
    <div className="menu-child" style={{ marginLeft: depth * 24 }} {...row}>
      <div className="mega-link">
        {!disabled && <Grip handle={handle} />}
        <input
          className="inp"
          value={child.label}
          placeholder="Link text"
          disabled={disabled}
          onChange={(e) => onChange({ ...child, label: e.target.value })}
        />
        <input
          className="inp"
          value={child.link.url}
          placeholder="/page or https://"
          disabled={disabled}
          onChange={(e) => onChange({ ...child, link: { ...child.link, url: e.target.value } })}
        />
        <input
          className="inp"
          value={child.className}
          placeholder="CSS class"
          disabled={disabled}
          onChange={(e) => onChange({ ...child, className: e.target.value })}
        />
        {!disabled && (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={onRemove}
            aria-label="Remove"
          >
            ×
          </button>
        )}
      </div>

      {/* Depth 3 pe rukta hai — usse aage server bhi reject karta hai (spec 006 §1.4) */}
      {depth === 1 &&
        (child.children ?? []).map((grand, i) => (
          <ChildEditor
            key={grand.id ?? i}
            child={grand}
            depth={2}
            disabled={disabled}
            handle={grandDrag.handleProps(i)}
            row={grandDrag.rowProps(i)}
            onChange={(next) => setChildren(replaceAt(child.children, i, next))}
            onRemove={() => setChildren(removeAt(child.children, i))}
          />
        ))}

      {depth === 1 && !disabled && (
        <button
          type="button"
          className="btn btn-sm menu-subadd"
          onClick={() => setChildren([...(child.children ?? []), blankChild()])}
        >
          + Add sub item
        </button>
      )}
    </div>
  )
}

function ItemEditor({ item, onChange, onRemove, disabled, handle, row }) {
  const [open, setOpen] = useState(false)
  const setChildren = (children) => onChange({ ...item, children })
  const childDrag = useListDrag(
    (from, to) => setChildren(moveItem(item.children ?? [], from, to)),
    !disabled,
  )

  return (
    <div className={`day${open ? '' : ' closed'}`} {...row}>
      <div className="day-head" onClick={() => setOpen((v) => !v)}>
        {disabled ? <span className="grip">⠿</span> : <Grip handle={handle} />}
        <span className="dt">{item.label || 'Untitled'}</span>
        <span className="muted">{itemTypeLabel(item)}</span>
        {!disabled && (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            aria-label="Remove item"
          >
            ×
          </button>
        )}
        <span className="toggle-ico">{open ? '▾' : '▸'}</span>
      </div>

      <div className="day-body">
        <div className="row2">
          <div className="field">
            <label>Navigation Label</label>
            <input
              className="inp"
              value={item.label}
              disabled={disabled}
              onChange={(e) => onChange({ ...item, label: e.target.value })}
            />
          </div>
          <div className="field">
            <label>URL</label>
            <input
              className="inp"
              value={item.link.url}
              placeholder="/about or https://"
              disabled={disabled}
              onChange={(e) => onChange({ ...item, link: { ...item.link, url: e.target.value } })}
            />
          </div>
        </div>

        {/*
          **"Link type" wala dropdown yahan se hata diya gaya (24 Aug).**

          Wo hamesha `disabled` tha, `value` hardcoded thi aur kisi state se bind nahi tha —
          `item.link.type` ko admin me kahin padha ya likha hi nahi jaata. Yaani wo ek
          dikhne-bhar ka control tha jise client click karta aur kuch na hota.

          Data ka field `link.type` **zinda hai** (`packages/shared` ka `menuLinkSchema`) —
          server abhi sirf `url` accept karta hai (`SUPPORTED_LINK_TYPES`) aur
          `resolveHref()` isi pe branch karta hai. Phase 1 me `entries` aane par yahan asli
          control banega, jo `item.link.type` se bind hoga.

          D-30 ("khaali cheez khaali dikhe, tooti hui nahi") ka kaam left panel ka
          "Pages appear here once content types are available" pehle se kar raha hai.
        */}
        <div className="row2">
          <div className="field">
            <label>Open in</label>
            <select
              className="sel"
              value={item.link.target}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...item, link: { ...item.link, target: e.target.value } })
              }
            >
              {LINK_TARGETS.map((t) => (
                <option key={t} value={t}>
                  {TARGET_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Menu type</label>
            <select
              className="sel"
              value={item.menuType}
              disabled={disabled}
              onChange={(e) => onChange(withMenuType(item, e.target.value))}
            >
              {MENU_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MENU_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row2">
          <div className="field">
            <label>CSS class</label>
            <input
              className="inp"
              value={item.className}
              placeholder="e.g. nav-cta"
              disabled={disabled}
              onChange={(e) => onChange({ ...item, className: e.target.value })}
            />
          </div>
        </div>

        {item.menuType === 'dropdown' && (
          <div className="field">
            <label>Sub items</label>
            {(item.children ?? []).map((child, i) => (
              <ChildEditor
                key={child.id ?? i}
                child={child}
                depth={1}
                disabled={disabled}
                handle={childDrag.handleProps(i)}
                row={childDrag.rowProps(i)}
                onChange={(next) => setChildren(replaceAt(item.children, i, next))}
                onRemove={() => setChildren(removeAt(item.children, i))}
              />
            ))}
            {!disabled && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setChildren([...(item.children ?? []), blankChild()])}
              >
                + Add sub item
              </button>
            )}
          </div>
        )}

        {item.menuType === 'mega' && (
          <>
            <p className="hint">{megaSummary(item.mega)}</p>
            <MegaBuilder
              mega={item.mega}
              disabled={disabled}
              onChange={(mega) => onChange({ ...item, mega })}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default function Menus() {
  const { can } = useAuth()
  const canEdit = can('menu.update')
  /** CTA `settings` document me hai — uski permission menu wali se alag hai (spec 001). */
  const canEditSettings = can('settings.update')

  const [menus, setMenus] = useState([])
  const [locations, setLocations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [newLink, setNewLink] = useState({ url: '', label: '' })

  /**
   * Header ke buttons — `settings` document me rehte hain, menu me nahi.
   *
   * `null` do baat keh sakta hai: abhi load nahi hua, ya is user ko `settings.read` hai hi
   * nahi. Dono me panel render nahi hota, aur dono theek hain. Khaali list (`[]`) alag
   * cheez hai — wo "load ho gaya, koi button nahi" hai.
   */
  const [buttons, setButtons] = useState(null)
  const [savingButtons, setSavingButtons] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/menus'), api.get('/menu-locations')])
      .then(([menuRes, locRes]) => {
        const list = menuRes.data.data.menus
        setMenus(list)
        setLocations(locRes.data.data.locations)
        if (list.length) {
          setSelectedId(list[0].id)
          setDraft(structuredClone(list[0]))
        }
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))

    /**
     * Settings **alag** call hai, `Promise.all` me nahi — aur uska fail hona chup-chaap
     * nigla jaata hai.
     *
     * Wajah: `menu.read` `author`/`contributor` ke paas bhi hai, par `settings.read` sirf
     * `admin`/`editor` ke paas (spec 001). Author ke liye ye call **403** dega. Agar wo
     * `Promise.all` me hota to poori screen error dikhati — jabki uska menu wala kaam
     * bilkul theek chal raha hota.
     */
    api
      .get('/settings')
      .then((res) => setButtons(res.data.data.settings.headerButtons ?? []))
      .catch(() => setButtons(null))
  }, [])

  const setButton = (i, patch) => setButtons((list) => replaceAt(list, i, { ...list[i], ...patch }))

  const addButton = () =>
    setButtons((list) => [
      ...list,
      {
        label: '',
        url: '',
        target: '_self',
        variant: 'outline',
        className: '',
        icon: 'none',
        enabled: true,
      },
    ])

  /** Buttons ka apna drag context — menu ki kisi list se ye mix nahi hoti. */
  const buttonDrag = useListDrag(
    (from, to) => setButtons((list) => moveItem(list, from, to)),
    canEditSettings && Array.isArray(buttons),
  )

  async function saveButtons(event) {
    event.preventDefault()
    setSavingButtons(true)
    setError(null)
    setNotice(null)

    try {
      // Sirf yahi field — poora settings object bhejne se doosri screen ka parallel
      // change chup-chaap overwrite ho sakta hai
      const res = await api.patch('/settings', { headerButtons: buttons })

      setButtons(res.data.data.settings.headerButtons ?? [])
      setNotice('Header buttons saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingButtons(false)
    }
  }

  function selectMenu(id) {
    const menu = menus.find((m) => m.id === id)
    setSelectedId(id)
    setDraft(menu ? structuredClone(menu) : null)
    setNotice(null)
    setError(null)
  }

  async function createMenu() {
    const name = window.prompt('Menu name')
    if (!name) return

    const key = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    try {
      const res = await api.post('/menus', { key, name, items: [] })
      const menu = res.data.data.menu
      setMenus((list) => [menu, ...list])
      setSelectedId(menu.id)
      setDraft(structuredClone(menu))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      /**
       * `version` wapas bhejna hi optimistic concurrency ka poora mechanism hai —
       * server compare karke `409` deta hai (spec 006 O-4).
       */
      const res = await api.patch(`/menus/${draft.id}`, {
        name: draft.name,
        items: draft.items,
        version: draft.version,
      })

      const menu = res.data.data.menu
      setMenus((list) => list.map((m) => (m.id === menu.id ? menu : m)))
      setDraft(structuredClone(menu))
      setNotice('Menu saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${draft.name}"? Any location using it becomes unassigned.`)) return

    try {
      await api.delete(`/menus/${draft.id}`)
      const rest = menus.filter((m) => m.id !== draft.id)
      setMenus(rest)
      setLocations((list) => list.map((l) => (l.menuId === draft.id ? { ...l, menuId: null } : l)))
      selectMenu(rest[0]?.id ?? null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function saveLocations(next) {
    setLocations(next)
    try {
      const res = await api.put('/menu-locations', {
        locations: next.map(({ location, menuId }) => ({ location, menuId })),
      })
      setLocations(res.data.data.locations)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function addCustomLink() {
    if (!newLink.url || !newLink.label) return

    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        { ...blankItem(), label: newLink.label, link: { ...blankItem().link, url: newLink.url } },
      ],
    }))
    setNewLink({ url: '', label: '' })
  }

  const setItems = (items) => setDraft((d) => ({ ...d, items }))

  /**
   * Top-level items ka reorder.
   *
   * Hook har list ka apna hota hai (children, columns, groups, links ka apna-apna) —
   * isse ek list ka drag doosri me gir nahi sakta.
   */
  const itemDrag = useListDrag(
    (from, to) => setItems(moveItem(draft?.items ?? [], from, to)),
    canEdit && Boolean(draft),
  )

  if (loading) return <p className="subtitle">Loading…</p>

  return (
    <>
      <div className="page-head">
        <h1>Appearance</h1>
      </div>
      <AppearanceTabs />

      {error && <div className="notice notice-error">{error}</div>}
      {notice && <div className="notice notice-success">{notice}</div>}

      <div className="edit-grid appearance-grid">
        <div>
          <div className="panel">
            <div className="panel-head">
              <h2>Add Menu Items</h2>
            </div>
            <div className="panel-body menu-sources">
              {/*
                Pages **band** milta hai aur khaali hai — D-30. Chhupa dena galat hota: tab
                ye ek missing feature lagta, aane wala feature nahi. Phase 1 me `entries`
                aate hi isme asli checklist bhar jaayegi.
              */}
              <SourcePanel title="Pages">
                <p className="hint">Pages appear here once content types are available.</p>
              </SourcePanel>

              {/* Ekmatra source jo aaj sach me kaam karta hai — isliye khula milta hai */}
              <SourcePanel title="Custom Links" defaultOpen>
                <div className="field">
                  <label htmlFor="src-url">URL</label>
                  <input
                    id="src-url"
                    className="inp"
                    placeholder="https://"
                    value={newLink.url}
                    disabled={!canEdit || !draft}
                    onChange={(e) => setNewLink((v) => ({ ...v, url: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="src-label">Link text</label>
                  <input
                    id="src-label"
                    className="inp"
                    placeholder="Link text"
                    value={newLink.label}
                    disabled={!canEdit || !draft}
                    onChange={(e) => setNewLink((v) => ({ ...v, label: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={!canEdit || !draft}
                  onClick={addCustomLink}
                >
                  Add to Menu
                </button>
                {!draft && <p className="hint">Create a menu first.</p>}
              </SourcePanel>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Theme Locations</h2>
            </div>
            <div className="panel-body">
              {/*
                List **theme se** aati hai, DB se nahi (D-17) — theme me nayi location
                jodne pe wo turant yahan dikhne lagti hai, bina kisi migration ke.
              */}
              {locations.map((loc, i) => (
                <div className="field" key={loc.location}>
                  <label>{loc.label}</label>
                  <select
                    className="sel"
                    value={loc.menuId ?? ''}
                    disabled={!canEdit}
                    onChange={(e) =>
                      saveLocations(
                        replaceAt(locations, i, { ...loc, menuId: e.target.value || null }),
                      )
                    }
                  >
                    <option value="">Not assigned</option>
                    {menus.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/*
            Header ka CTA button — D-27 ke Slice 0 scope me hai.

            Ye yahan hai, kisi alag "Header" tab me nahi: Menus screen hi asal me header ki
            screen hai (Header location isi panel ke upar assign hoti hai).

            **Ye ek menu item jaan-boojh kar NAHI hai.** Client ke reference me CTA
            `<nav>` ke bahar `.hdr__r` me baithta hai aur mobile pe **dikhta rehta hai**,
            jabki menu items drawer me chale jaate hain. Use `menuType` banane se wo drawer
            me chala jaata — ek conversion button ke liye ye ulta padta.

            Jise sach me nav ke ANDAR button chahiye, wo kisi bhi item pe
            `className: nav-cta` laga sakta hai — D-17 ka wahi raasta hai.
          */}
          {buttons && (
            <form className="panel" onSubmit={saveButtons}>
              <div className="panel-head">
                <h2>Header Buttons</h2>
              </div>
              <div className="panel-body">
                {buttons.length === 0 && (
                  <p className="hint">No buttons yet. The header shows only the logo and menu.</p>
                )}

                {buttons.map((button, i) => (
                  <div className="hdr-btn" key={i} {...buttonDrag.rowProps(i)}>
                    <div className="hdr-btn__row">
                      {canEditSettings && <Grip handle={buttonDrag.handleProps(i)} />}
                      <input
                        className="inp"
                        value={button.label}
                        placeholder="Button label"
                        disabled={!canEditSettings}
                        onChange={(e) => setButton(i, { label: e.target.value })}
                      />
                      {canEditSettings && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => setButtons(removeAt(buttons, i))}
                          aria-label="Remove button"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <input
                      className="inp"
                      value={button.url}
                      placeholder="/contact or tel:+91…"
                      disabled={!canEditSettings}
                      onChange={(e) => setButton(i, { url: e.target.value })}
                    />

                    <div className="hdr-btn__row">
                      {/*
                        Look ab **structured field** se aata hai, className se nahi (R18).
                        Pehle client ko `btn-primary` type karna padta tha — magic naam,
                        kahin likha hua nahi. Ab dropdown hai.
                      */}
                      <select
                        className="sel"
                        value={button.variant ?? 'outline'}
                        disabled={!canEditSettings}
                        onChange={(e) => setButton(i, { variant: e.target.value })}
                      >
                        {BUTTON_VARIANTS.map((v) => (
                          <option key={v} value={v}>
                            {VARIANT_LABELS[v] ?? v}
                          </option>
                        ))}
                      </select>
                      {/*
                        Icon ek **structured field** hai, className nahi (R18) — theme isi
                        value se SVG chunti hai. Naya icon jodna do line hai: shared ke
                        `ICONS` me ek value, aur theme me ek path.
                      */}
                      <select
                        className="sel"
                        value={button.icon ?? 'none'}
                        disabled={!canEditSettings}
                        onChange={(e) => setButton(i, { icon: e.target.value })}
                      >
                        {ICONS.map((name) => (
                          <option key={name} value={name}>
                            {ICON_LABELS[name] ?? name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="hdr-btn__row">
                      <select
                        className="sel"
                        value={button.target}
                        disabled={!canEditSettings}
                        onChange={(e) => setButton(i, { target: e.target.value })}
                      >
                        {LINK_TARGETS.map((t) => (
                          <option key={t} value={t}>
                            {TARGET_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      {/* Sirf extra styling — look upar wale Style dropdown se aata hai */}
                      <input
                        className="inp"
                        value={button.className}
                        placeholder="Extra CSS class"
                        disabled={!canEditSettings}
                        onChange={(e) => setButton(i, { className: e.target.value })}
                      />
                      {/* Band karne se config bacha rehta hai — fields khaali karne se nahi */}
                      <label className="inline-lbl" title="Show this button">
                        <input
                          type="checkbox"
                          checked={button.enabled}
                          disabled={!canEditSettings}
                          onChange={(e) => setButton(i, { enabled: e.target.checked })}
                        />{' '}
                        Show
                      </label>
                    </div>

                    <div className="hdr-btn__row">
                      {/*
                        Chhoti screen pe sirf icon — design me "Awards" yahi banta hai.
                        Pehle theme CSS tay karti thi ki kaunsa button mobile pe kaisa
                        dikhega (`nth-child(n+3)` chhupa do); wo faisla client ka hai.
                      */}
                      <label className="inline-lbl" title="Show only the icon on small screens">
                        <input
                          type="checkbox"
                          checked={Boolean(button.iconOnlyOnMobile)}
                          disabled={!canEditSettings}
                          onChange={(e) => setButton(i, { iconOnlyOnMobile: e.target.checked })}
                        />{' '}
                        Icon only on mobile
                      </label>
                    </div>
                  </div>
                ))}

                {canEditSettings && buttons.length < MAX_HEADER_BUTTONS && (
                  <button type="button" className="btn btn-sm" onClick={addButton}>
                    + Add button
                  </button>
                )}

                <p className="hint">
                  A button appears only when both the label and URL are filled in.
                </p>
              </div>

              {canEditSettings && (
                <div className="panel-foot">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={savingButtons}>
                    {savingButtons ? 'Saving…' : 'Save Buttons'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        <form className="panel" onSubmit={handleSave}>
          <div className="panel-head">
            <h2>{draft ? `${draft.name} — structure` : 'No menus yet'}</h2>
            <select
              className="sel"
              style={{ width: 'auto' }}
              value={selectedId ?? ''}
              onChange={(e) => selectMenu(e.target.value)}
            >
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {canEdit && (
              <button type="button" className="btn btn-sm" onClick={createMenu}>
                Create menu
              </button>
            )}
          </div>

          <div className="panel-body">
            {!draft && <p className="hint">Create a menu to get started.</p>}

            {draft?.items.length === 0 && (
              <p className="hint">This menu is empty. Add a custom link on the left.</p>
            )}

            {draft?.items.map((item, i) => (
              <ItemEditor
                key={item.id ?? i}
                item={item}
                disabled={!canEdit}
                handle={itemDrag.handleProps(i)}
                row={itemDrag.rowProps(i)}
                onChange={(next) => setItems(replaceAt(draft.items, i, next))}
                onRemove={() => setItems(removeAt(draft.items, i))}
              />
            ))}
          </div>

          {draft && canEdit && (
            <div className="panel-foot">
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                Delete Menu
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Menu'}
              </button>
            </div>
          )}
        </form>
      </div>
    </>
  )
}
