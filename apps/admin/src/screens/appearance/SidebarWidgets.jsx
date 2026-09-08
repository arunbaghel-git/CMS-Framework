import { ICONS, ICON_LABELS, SIDEBAR_WIDGET_LABEL, SIDEBAR_WIDGET_TYPES } from '@cms/shared'

import { useListDrag } from '../../lib/drag-list.js'
import HtmlEditor from '../packages/HtmlEditor.jsx'
/**
 * ⚠️ CSS **wahi file** hai jo blocks ki hai — copy nahi ki gayi.
 *
 * `.blk`, `.blk-head`, `.blk-chip`, `.blk-sum`, `.blk-x`, `.blk-add` — sab wahin se. Do copies
 * ka nateeja is repo me pehle ho chuka hai (D-65/D-51/D-58), aur CSS pe wo aur bura hota: dono
 * dikhne me ek jaise shuru hote hain aur dheere-dheere alag ho jaate hain.
 */
import '../pages/PageBlocks.css'

/**
 * Sidebar ke widgets ka editor — D-88.
 *
 * ⚠️ **Ye `PageBlocks.jsx` ka hi saancha hai, aur wo jaan-boojh kar hai.** Client ek hi admin
 * me do jagah widget/block ki list drag karta hai; unka dikhna aur chalna alag hona hi confusion
 * hai. 8 Sep ka sabak seedha isi pe lagta hai: _jab ek pattern isi repo me pehle se chal raha
 * ho, "baad me lagayenge" likhna ek chup ka udhaar hai._
 *
 * Isliye yahan bhi wahi teen cheezein hain: poora head toggle (`role="button"`, Enter/Space),
 * grip se drag (`useListDrag`, jo keyboard bhi deta hai), aur band hone pe ek line ka summary.
 */

/** Har widget ka apna rang — `.blk--*` wali hi jodi. */
const WIDGET_CLASS = {
  enquiryForm: 'list',
  talkToPlanner: 'cards',
  html: 'text',
}

/** `id` client pe banti hai — server bhi bhar deta hai, par reorder ke liye abhi chahiye. */
const newId = () =>
  `wdg-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

/** Naye widget ka khaali shape. Props server pe `.parse()` se bharenge, yahan sirf shuruaat. */
function emptyWidget(type) {
  const props = {
    enquiryForm: { heading: '', description: '', formId: '' },
    talkToPlanner: { heading: '' },
    html: { icon: 'none', heading: '', html: '' },
  }[type]

  return { id: newId(), type, props: props ?? {} }
}

/**
 * Band widget pe bhi ek line dikhe — warna list sirf rangeen chip ki qatar ban jaati hai aur
 * client ko har widget khol kar dekhna padta hai ki usme kya hai.
 */
function summarize(widget, forms) {
  const p = widget.props ?? {}

  switch (widget.type) {
    case 'enquiryForm': {
      if (!p.formId) return 'No form chosen'
      const form = forms.find((f) => f.id === p.formId)

      /**
       * ⚠️ Form list me na mile to id **nahi** dikhayi jaati — client ke liye wo bemaani hai.
       * Aisa tab hota hai jab form delete ho gaya ho ya draft ho; dono soorat me page pe ye
       * widget render hi nahi hota (D-30), aur client ko wahi baat dikhni chahiye.
       */
      return form ? form.name : 'Form not available'
    }
    case 'talkToPlanner':
      return p.heading || 'Talk to a planner'
    case 'html': {
      const text = String(p.html ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      return p.heading || (text ? text.slice(0, 70) + (text.length > 70 ? '…' : '') : 'Empty')
    }
    default:
      return widget.type
  }
}

/* ── ek-ek widget ka editor ────────────────────────────────────────────────── */

/**
 * Enquiry form — `forms` collection me se ek.
 *
 * ⚠️ **Sirf `active` form chunne laayak hain.** Draft form public payload me jaata hi nahi
 * (`getPublicFormById()` use `null` karta hai), to use yahan chunne dena ek jhootha control
 * hota: client chunta, save hota, aur page pe kuch na aata.
 */
function EnquiryFormWidget({ props, onChange, disabled, forms, loading }) {
  return (
    <>
      {/* Reference ke `.wdg--cta` ka `<h3>` + `<p>` — D-88 §10, wahi jodi jo blocks pe hai (§9). */}
      <div className="field" style={{ maxWidth: 360 }}>
        <label>Heading</label>
        <input
          className="inp"
          value={props.heading ?? ''}
          onChange={(e) => onChange({ ...props, heading: e.target.value })}
          placeholder="Not sure which package?"
          disabled={disabled}
        />
      </div>

      <div className="field">
        <label>Description</label>
        <HtmlEditor
          value={props.description ?? ''}
          onChange={(description) => onChange({ ...props, description })}
          disabled={disabled}
          height={120}
        />
        <div className="hint">Leave it empty and the line does not appear on the page.</div>
      </div>

      <div className="field" style={{ maxWidth: 360 }}>
        <label>Form</label>
        <select
          className="sel"
          value={props.formId ?? ''}
          onChange={(e) => onChange({ ...props, formId: e.target.value })}
          disabled={disabled || loading}
        >
          <option value="">{loading ? 'Loading…' : '— choose a form —'}</option>
          {forms.map((form) => (
            <option key={form.id} value={form.id}>
              {form.name}
            </option>
          ))}
        </select>

        {!loading && forms.length === 0 && (
          <div className="hint">
            No active forms yet. Create one under <b>Enquiry Forms</b>, then set it to Active.
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Talk to a planner — **sirf heading**.
 *
 * ⚠️ Contact ke koi field yahan nahi hain, aur wo faisla hai: phone aur WhatsApp `Settings` se
 * aate hain, email chuna hua form ke `emailTo` se. 2 Sep ko `settings.contactEmail` isi liye
 * palta gaya tha — ek hi pata do jagah rakhne ka matlab hota ki ek din wo alag ho jaate.
 */
function TalkToPlannerWidget({ props, onChange, disabled }) {
  return (
    <>
      <div className="field" style={{ maxWidth: 360 }}>
        <label>Heading</label>
        <input
          className="inp"
          value={props.heading ?? ''}
          onChange={(e) => onChange({ ...props, heading: e.target.value })}
          placeholder="Talk to a planner"
          disabled={disabled}
        />
      </div>

      <div className="hint">
        Phone and WhatsApp come from <b>Settings</b>. The email address comes from the enquiry form
        in this sidebar. If none of them are set, this widget is not shown.
      </div>
    </>
  )
}

/** Custom HTML — text, ya koi bhi list (client ne `Packages by duration` ka naam liya). */
function HtmlWidget({ props, onChange, disabled }) {
  return (
    <>
      {/*
       * Icon + Heading ek hi row me — client, 8 Sep: _"Edit Sidebar me hi ek icon field dal do
       * Heading ke saath me."_
       *
       * ⚠️ List wahi shared `ICONS` hai jo header buttons aur footer text blocks use karte hain.
       * Nayi list banane ka nateeja `constants/icons.js` ke sar pe likha hai.
       */}
      <div className="row2">
        <div className="field">
          <label>Icon</label>
          <select
            className="sel"
            value={props.icon ?? 'none'}
            onChange={(e) => onChange({ ...props, icon: e.target.value })}
            disabled={disabled}
          >
            {ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {ICON_LABELS[icon] ?? icon}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Heading</label>
          <input
            className="inp"
            value={props.heading ?? ''}
            onChange={(e) => onChange({ ...props, heading: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <HtmlEditor
        value={props.html ?? ''}
        onChange={(html) => onChange({ ...props, html })}
        disabled={disabled}
        height={240}
      />
    </>
  )
}

const EDITORS = {
  enquiryForm: EnquiryFormWidget,
  talkToPlanner: TalkToPlannerWidget,
  html: HtmlWidget,
}

/* ── list ──────────────────────────────────────────────────────────────────── */

export default function SidebarWidgets({
  widgets,
  onChange,
  disabled,
  open,
  onToggle,
  forms = [],
  formsLoading,
}) {
  const patch = (i, nextProps) =>
    onChange(widgets.map((w, idx) => (idx === i ? { ...w, props: nextProps } : w)))

  const move = (from, to) => {
    if (to < 0 || to >= widgets.length) return

    const next = [...widgets]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    onChange(next)
  }

  const { handleProps, rowProps } = useListDrag(move, !disabled)

  return (
    <>
      {widgets.map((widget, i) => {
        const Editor = EDITORS[widget.type]
        const isOpen = open.includes(widget.id)

        return (
          <div
            className={`blk blk--${WIDGET_CLASS[widget.type] ?? 'text'}`}
            key={widget.id ?? i}
            {...rowProps(i)}
          >
            {/*
             * Poora head toggle hai, sirf ▾ ka akshar nahi — aur grip aur ✕ apna click rok lete
             * hain. Bina us rok ke har drag ya remove ke baad panel khul/band ho jaata, aur wo
             * bilkul galti jaisa lagta (8 Sep, client ne blocks pe yahi pakda tha).
             */}
            <div
              className="blk-head"
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => onToggle(widget.id)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                onToggle(widget.id)
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

              <span className="blk-chip">{SIDEBAR_WIDGET_LABEL[widget.type] ?? widget.type}</span>
              <span className="blk-sum">{summarize(widget, forms)}</span>
              <span className="toggle-ico">{isOpen ? '▾' : '▸'}</span>

              {!disabled && (
                <button
                  className="blk-x"
                  type="button"
                  title="Remove widget"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!window.confirm('Remove this widget? Its content goes with it.')) return
                    onChange(widgets.filter((_, idx) => idx !== i))
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
                    props={widget.props ?? {}}
                    onChange={(next) => patch(i, next)}
                    disabled={disabled}
                    forms={forms}
                    loading={formsLoading}
                  />
                ) : (
                  /*
                   * Anjaan type — purana data, ya koi type jo hata diya gaya. Uske props chhoot
                   * jaate hain (server pe bhi), isliye yahan bhi use chhedna galat hoga.
                   */
                  <div className="hint">
                    There is no editor for this widget (<code>{widget.type}</code>) yet. Its content
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
              const widget = emptyWidget(e.target.value)
              onChange([...widgets, widget])
              onToggle(widget.id)
              e.target.value = ''
            }}
            aria-label="Add widget"
          >
            <option value="">＋ Add widget…</option>
            {SIDEBAR_WIDGET_TYPES.map((type) => (
              <option key={type} value={type}>
                {SIDEBAR_WIDGET_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
