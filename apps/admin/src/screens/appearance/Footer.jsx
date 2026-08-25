import { useEffect, useState } from 'react'
import {
  FOOTER_COLUMN_TYPES,
  FOOTER_COLUMN_WIDTHS,
  ICONS,
  ICON_LABELS,
  MAX_FOOTER_COLUMNS,
  MAX_FOOTER_TEXT_BLOCKS,
  updateSettingsSchema,
} from '@cms/shared'

import MediaDrop from '../../components/admin/MediaDrop.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import AppearanceTabs from './AppearanceTabs.jsx'
import { useListDrag } from './drag-list.js'
import './Appearance.css'

/**
 * Appearance → Footer — **D-44**.
 *
 * Pehle ye screen sirf ek pointer thi ("columns Menus screen se assign karo") + social
 * links + copyright. Ab footer ka poora structure yahin hai:
 *
 *   Footer Logo      alag logo — khaali chhoda to header wala chalta hai
 *   Footer Columns   kitne (0–4), aur har column me kya — menu, text, ya dono
 *   Copyright        `{year}` ke saath
 *
 * **Social links yahan se hat gaye.** Wo `settings.social` me hain aur Settings ▸ General
 * pe already edit hote the — do jagah ek hi field rakhne ka matlab hota ki client kabhi
 * na kabhi ek jagah badle aur doosri jagah purana dekh kar confuse ho. Footer unhe render
 * karta hai, bas.
 *
 * **"Number of columns" ki apni koi state nahi hai** — wo `footerColumns` array ko
 * grow/shrink karta hai. Ek alag count field rakhne ka nateeja D-43 §1 me dikh chuka hai
 * (`mega.columnCount` × `mega.columns[]`), jahan dono ko validation se barabar rakhna
 * padta hai.
 *
 * Screen Appearance ke neeche hai par likhti `settings` document me hai — UI ki jagah aur
 * storage ki jagah alag hone me koi dikkat nahi, aur isse naya collection ya nayi
 * permission nahi banani padti.
 */

/** Value hi contract hai, ye sirf UI ka naam hai (R11/R17). */
const TYPE_LABELS = { menu: 'Menu only', text: 'Text only', both: 'Text + Menu' }

/**
 * "2 columns" label se hataya gaya: reference me wide column normal se **1.5x** chauda
 * hai, 2x nahi (`grid-template-columns: 1.5fr 1fr 1fr 1fr`). Label me ginti likhne se wo
 * theme ke ek number se bandh jaata — aur theme badalte hi label jhooth bolne lagta.
 */
const WIDTH_LABELS = { normal: 'Normal', wide: 'Wide' }

const newId = () => crypto.randomUUID()

/**
 * Naya khaali column.
 *
 * `type: 'menu'` default isliye hai ki footer ka sabse aam column ek link list hi hai —
 * aur wahi purane (D-43 wale) footer ka behaviour bhi tha.
 */
const blankColumn = () => ({
  id: newId(),
  heading: '',
  type: 'menu',
  width: 'normal',
  menuId: null,
  textBlocks: [],
})

const blankTextBlock = () => ({ id: newId(), icon: 'none', label: '', text: '' })

/**
 * Chune hue menu me kitne item aise hain jo footer me **poore nahi dikhenge**.
 *
 * Footer ka column ek **flat list** hai — theme sirf top-level `items[]` render karti
 * hai. Dropdown/mega ke sub-items hover pe khulte hain, aur footer me hover jaisi koi
 * cheez hai hi nahi.
 *
 * Ye ginti isliye dikhayi jaati hai ki wo galti **chup-chaap** hoti hai: admin ek mega
 * menu chunta hai, Save theek se ho jaata hai, aur site pe uske aadhe links kahin nahi
 * hote — bina kisi error ke. Khaali cheez khaali dikhni chahiye, tooti hui nahi (D-30).
 */
const nestedItemCount = (menu) =>
  (menu?.items ?? []).filter((item) => item.menuType && item.menuType !== 'link').length

/** Array ke andar ek index badalna — mutate kiye bina. */
const replaceAt = (list, index, value) => list.map((item, i) => (i === index ? value : item))

const moveItem = (list, from, to) => {
  if (to < 0 || to >= list.length || from === to) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * Ek text block ki row — icon + label + multi-line text.
 *
 * Teenon hisse optional hain: icon `none` aur label khaali chhod do to ye ek plain
 * paragraph hai. Reference ka footer isi shape ka hai (📞 CUSTOMER SUPPORT / number).
 */
function TextBlockRow({ block, disabled, handle, row, onChange, onRemove }) {
  return (
    <div className="ftr-block" {...row}>
      <div className="ftr-block-head">
        {disabled ? <span className="grip">⠿</span> : <span className="grip" {...handle} />}

        <select
          className="sel ftr-block-icon"
          value={block.icon}
          disabled={disabled}
          aria-label="Icon"
          onChange={(e) => onChange({ ...block, icon: e.target.value })}
        >
          {ICONS.map((name) => (
            <option key={name} value={name}>
              {ICON_LABELS[name] ?? name}
            </option>
          ))}
        </select>

        <input
          className="inp"
          value={block.label}
          placeholder="Label — optional, e.g. CUSTOMER SUPPORT"
          disabled={disabled}
          aria-label="Label"
          onChange={(e) => onChange({ ...block, label: e.target.value })}
        />

        {!disabled && (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={onRemove}
            aria-label="Remove text block"
          >
            ✕
          </button>
        )}
      </div>

      <textarea
        className="inp ftr-block-text"
        value={block.text}
        placeholder="Text — line breaks are kept"
        disabled={disabled}
        aria-label="Text"
        onChange={(e) => onChange({ ...block, text: e.target.value })}
      />
    </div>
  )
}

/** Ek column ka card — heading, kya dikhe, width, text blocks aur menu. */
function ColumnCard({ column, index, menus, disabled, handle, row, onChange, onRemove }) {
  const [open, setOpen] = useState(true)

  const showsText = column.type === 'text' || column.type === 'both'
  const showsMenu = column.type === 'menu' || column.type === 'both'

  const nested = nestedItemCount(menus.find((m) => m.id === column.menuId))

  const blocks = column.textBlocks ?? []
  const blockDrag = useListDrag(
    (from, to) => onChange({ ...column, textBlocks: moveItem(blocks, from, to) }),
    !disabled,
  )

  return (
    <div className={`day${open ? '' : ' closed'}`} {...row}>
      <div className="day-head" onClick={() => setOpen((v) => !v)}>
        {disabled ? <span className="grip">⠿</span> : <span className="grip" {...handle} />}
        <span className="dt">{column.heading || `Column ${index + 1}`}</span>
        <span className="muted">{TYPE_LABELS[column.type]}</span>
        {!disabled && (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            aria-label="Remove column"
          >
            Remove
          </button>
        )}
        <span className="toggle-ico">{open ? '▾' : '▸'}</span>
      </div>

      <div className="day-body">
        <div className="row3">
          <div className="field">
            <label>Heading</label>
            <input
              className="inp"
              value={column.heading}
              placeholder="Explore"
              disabled={disabled}
              onChange={(e) => onChange({ ...column, heading: e.target.value })}
            />
          </div>

          <div className="field">
            <label>Shows</label>
            <select
              className="sel"
              value={column.type}
              disabled={disabled}
              onChange={(e) => onChange({ ...column, type: e.target.value })}
            >
              {FOOTER_COLUMN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Width</label>
            <select
              className="sel"
              value={column.width}
              disabled={disabled}
              onChange={(e) => onChange({ ...column, width: e.target.value })}
            >
              {FOOTER_COLUMN_WIDTHS.map((width) => (
                <option key={width} value={width}>
                  {WIDTH_LABELS[width]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showsText && (
          <div className="field">
            <label>Text blocks</label>

            {blocks.length === 0 && <p className="hint">No text yet. Add a block below.</p>}

            {blocks.map((block, i) => (
              <TextBlockRow
                key={block.id}
                block={block}
                disabled={disabled}
                handle={blockDrag.handleProps(i)}
                row={blockDrag.rowProps(i)}
                onChange={(next) => onChange({ ...column, textBlocks: replaceAt(blocks, i, next) })}
                onRemove={() =>
                  onChange({ ...column, textBlocks: blocks.filter((_, j) => j !== i) })
                }
              />
            ))}

            {!disabled && (
              <button
                type="button"
                className="btn btn-sm"
                disabled={blocks.length >= MAX_FOOTER_TEXT_BLOCKS}
                onClick={() => onChange({ ...column, textBlocks: [...blocks, blankTextBlock()] })}
              >
                + Add block
              </button>
            )}
          </div>
        )}

        {showsMenu && (
          <div className="field">
            <label>Menu</label>
            <select
              className="sel"
              value={column.menuId ?? ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...column, menuId: e.target.value || null })}
            >
              <option value="">Not assigned</option>
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="hint">
              Menus are created under Appearance → Menus. The heading above is separate from the
              menu name. Footer columns show a flat list, so set every item in that menu to{' '}
              <strong>Simple link</strong> — dropdown and mega items only open on hover, which a
              footer has no room for.
            </p>

            {nested > 0 && (
              <p className="hint ftr-warn">
                {nested === 1 ? '1 item in this menu is' : `${nested} items in this menu are`} a
                dropdown or mega menu. Their sub-items will not appear in the footer — only the
                top-level link will.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Footer() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [settings, setSettings] = useState(null)
  const [menus, setMenus] = useState([])
  const [footerLogo, setFooterLogo] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    Promise.all([api.get('/settings'), api.get('/menus')])
      .then(async ([settingsRes, menusRes]) => {
        const next = settingsRes.data.data.settings
        setSettings(next)
        setMenus(menusRes.data.data.menus ?? [])

        if (next.footerLogoMediaId) {
          try {
            const media = await api.get(`/media/${next.footerLogoMediaId}`)
            setFooterLogo(media.data.data.media)
          } catch {
            /**
             * Media na mile to screen phir bhi khulni chahiye — wo ek recoverable state
             * hai (media delete ho gayi, ya id purani hai), error nahi.
             *
             * **Id bhi saaf hoti hai, sirf preview nahi.** Ye zaroori hai: server D-42 §1
             * pe save ke waqt `footerLogoMediaId` ko validate karta hai, to id bachi
             * rehne par har Save **400** deta — aur client uske paas se nikal bhi nahi
             * sakta, kyunki Remove button tabhi dikhta hai jab preview mila ho. Yaani
             * poori screen lock ho jaati, footer ka ek bhi field badle bina.
             *
             * ⚠️ Settings ▸ General ke Logo/Favicon me abhi bhi wahi shape hai. Wahan ye
             * aaj **pahunch me nahi** hai kyunki Media ka delete bana hi nahi (Phase 2) —
             * par delete aate hi wahan bhi yahi karna hoga.
             */
            setSettings((s) => ({ ...s, footerLogoMediaId: null }))
            setFooterLogo(null)
          }
        }
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const columns = settings?.footerColumns ?? []

  const setColumns = (next) => setSettings((s) => ({ ...s, footerColumns: next }))

  const columnDrag = useListDrag((from, to) => setColumns(moveItem(columns, from, to)), canEdit)

  /**
   * "Number of columns" — array ko grow/shrink karta hai.
   *
   * **Ghatate waqt aakhir se katta hai**, aur wo jaan-boojh kar hai: 4 se 3 karne pe
   * client ko lagta hai "aakhri wala gaya". Beech se hatane ka koi bhi rule surprise
   * hota. Ghatane pe data wapas nahi aata — isliye neeche hint me wo saaf likha hai.
   */
  function setColumnCount(count) {
    if (count > columns.length) {
      setColumns([...columns, ...Array.from({ length: count - columns.length }, blankColumn)])
    } else {
      setColumns(columns.slice(0, count))
    }
  }

  async function uploadFooterLogo(file) {
    if (!file) return

    setError(null)
    setNotice(null)
    setUploading(true)

    const body = new FormData()
    body.append('file', file)

    try {
      const res = await api.post('/media', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const uploaded = res.data.data.media
      setSettings((s) => ({ ...s, footerLogoMediaId: uploaded.id }))
      setFooterLogo(uploaded)
      setNotice('Footer logo uploaded. Save changes to apply it.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  function clearFooterLogo() {
    setSettings((s) => ({ ...s, footerLogoMediaId: null }))
    setFooterLogo(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    // Sirf is screen ke fields — poora settings object wapas bhejne se doosri screen
    // ka koi parallel change chup-chaap overwrite ho sakta hai.
    const payload = {
      footerColumns: settings.footerColumns ?? [],
      footerLogoMediaId: settings.footerLogoMediaId ?? null,
      footerCopyright: settings.footerCopyright ?? '',
      footerNote: settings.footerNote ?? '',
      footerDisclaimer: settings.footerDisclaimer ?? '',
    }

    // Wahi schema jo server use karta hai (R8) — error yahan dikhta hai, round-trip se pehle
    const parsed = updateSettingsSchema.safeParse(payload)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const at = issue.path.filter((p) => typeof p === 'number').map((n) => n + 1)
      setError(at.length ? `Column ${at[0]}: ${issue.message}` : issue.message)
      return
    }

    setSaving(true)

    try {
      const res = await api.patch('/settings', parsed.data)
      setSettings(res.data.data.settings)
      setNotice('Footer settings saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>
  if (!settings) return <div className="notice err">{error}</div>

  return (
    <>
      <div className="page-head">
        <h1>Appearance</h1>
      </div>
      <AppearanceTabs />

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice ok">
          <span>{notice}</span>
        </div>
      )}
      {!canEdit && (
        <div className="notice warn">
          <span>You can view these settings but not change them.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={!canEdit}>
          <div className="panel">
            <div className="panel-head">
              <h2>Footer Logo</h2>
            </div>
            <div className="panel-body">
              <div className="row2">
                <MediaDrop
                  label="Footer logo"
                  hint="Click to upload"
                  media={footerLogo}
                  uploading={uploading}
                  onUpload={uploadFooterLogo}
                  onClear={clearFooterLogo}
                />
                <p className="hint">
                  Shown in the footer, which has a dark background, and in the mobile menu, which
                  does not — so pick a logo that reads on both. Leave it empty to use the main logo
                  from Settings → General.
                </p>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Footer Columns</h2>
            </div>
            <div className="panel-body">
              <div className="field ftr-count">
                <label htmlFor="ftr-count">Number of columns</label>
                <select
                  id="ftr-count"
                  className="sel"
                  value={columns.length}
                  disabled={!canEdit}
                  onChange={(e) => setColumnCount(Number(e.target.value))}
                >
                  {Array.from({ length: MAX_FOOTER_COLUMNS + 1 }, (_, n) => (
                    <option key={n} value={n}>
                      {n === 0 ? 'No columns' : n}
                    </option>
                  ))}
                </select>
                <p className="hint">
                  Reducing this removes the last columns and their content. Drag a column by its
                  handle to reorder.
                </p>
              </div>

              {columns.map((column, i) => (
                <ColumnCard
                  key={column.id}
                  column={column}
                  index={i}
                  menus={menus}
                  disabled={!canEdit}
                  handle={columnDrag.handleProps(i)}
                  row={columnDrag.rowProps(i)}
                  onChange={(next) => setColumns(replaceAt(columns, i, next))}
                  onRemove={() => setColumns(columns.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Bottom Bar</h2>
            </div>
            <div className="panel-body">
              <div className="field">
                <label htmlFor="footer-copyright">Copyright text</label>
                <input
                  id="footer-copyright"
                  className="inp"
                  value={settings.footerCopyright ?? ''}
                  placeholder="© {year} Your Company. All rights reserved."
                  disabled={!canEdit}
                  onChange={(e) => setSettings((s) => ({ ...s, footerCopyright: e.target.value }))}
                />
                <p className="hint">
                  Use {'{year}'} for the current year so this line never goes out of date. Social
                  links shown next to it are set in Settings → General.
                </p>
              </div>

              <div className="field">
                <label htmlFor="footer-note">Note</label>
                <textarea
                  id="footer-note"
                  className="inp ftr-note"
                  value={settings.footerNote ?? ''}
                  placeholder="Registrations, memberships or accreditations."
                  disabled={!canEdit}
                  onChange={(e) => setSettings((s) => ({ ...s, footerNote: e.target.value }))}
                />
                <p className="hint">Shown in the middle of the bottom bar.</p>
              </div>

              <div className="field">
                <label htmlFor="footer-disclaimer">Disclaimer</label>
                <textarea
                  id="footer-disclaimer"
                  className="inp ftr-note"
                  value={settings.footerDisclaimer ?? ''}
                  placeholder="Small print shown below the bottom bar."
                  disabled={!canEdit}
                  onChange={(e) => setSettings((s) => ({ ...s, footerDisclaimer: e.target.value }))}
                />
                <p className="hint">
                  Full width, below everything else, in smaller and lighter text.
                </p>
              </div>
            </div>

            {canEdit && (
              <div className="panel-foot">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </fieldset>
      </form>
    </>
  )
}
