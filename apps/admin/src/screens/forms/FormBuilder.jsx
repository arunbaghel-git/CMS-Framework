import {
  DEFAULT_ENQUIRY_MAIL_BODY,
  DEFAULT_ENQUIRY_MAIL_SUBJECT,
  FORM_FIELD_TYPE_LABEL,
  FORM_PLACEMENTS,
  FORM_PLACEMENT_LABEL,
  emptyForm,
  enquiryMailVariables,
  isEmptyHtml,
} from '@cms/shared'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import Panel from '../../components/admin/Panel.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { confirmRemove } from '../../lib/confirm.js'
import { useListDrag } from '../../lib/drag-list.js'
import HtmlEditor from '../packages/HtmlEditor.jsx'
import { useForm } from './useForms.js'
import './Forms.css'

/**
 * Mail ka template — **bhara hua** khulta hai, placeholder se nahi (D-65 ka sabak).
 *
 * 23 Sep se pehle ke forms me `notifyEmail` hai hi nahi (model ka default `''`), aur server pe khaali
 * ka matlab waise bhi default template hai (`renderEnquiryMail()`). Yahan wahi default **dikhaya**
 * jaata hai taaki client dekh sake ki mail me asal me kya jaayega — khaali box ye nahi batata.
 */
function withMailDefaults(form) {
  const mail = form.notifyEmail ?? {}

  return {
    ...form,
    notifyEmail: {
      subject: mail.subject?.trim() ? mail.subject : DEFAULT_ENQUIRY_MAIL_SUBJECT,
      body: isEmptyHtml(mail.body) ? DEFAULT_ENQUIRY_MAIL_BODY : mail.body,
    },
  }
}

/**
 * Add New / Edit Form — `admin-design-v2.html` ke `#s-form-builder` se (client, 1 Sep).
 *
 * Design ka layout jaisa ka waisa: baayein **Basics** + **Fields** ki table, daayein
 * **Save** aur **Where it appears**.
 *
 * ## Design se teen farq, teenon ki wajah code me hi hai
 *
 * 1. **Placement ke paanch vikalp ki jagah do.** Design me `Contact page`, `Popup` aur
 *    `Sticky mobile bar` bhi hain — teenon ke liye page builder chahiye (Phase 5). Unhe
 *    dropdown me daal dena ek **jhootha control** hota: client chunta, Save dabata, aur
 *    kuch hota hi nahi.
 * 2. **Shortcode ka box hai par wo abhi sirf id dikhata hai.** Shortcode ko kisi page me
 *    paste karne ke liye page builder chahiye. Box isliye rakha hai ki form ki id ek asli
 *    cheez hai aur aage kaam aayegi; uske neeche wahi likha hai jo aaj sach hai.
 * 3. **`Preview` button nahi hai** — preview ka matlab hai form ko kisi asli page pe
 *    dikhana, aur wo tab hi ho sakta hai jab wo lag chuka ho.
 *
 * ⚠️ **Field ki `key` badalne ka koi raasta nahi hai.** Wo stored data hai — purani
 * enquiries ke `values` usi naam se baithe hain (R4 wali baat). Label badalta hai, key
 * nahi. Isiliye naye field ki key label se **ek baar** banti hai aur uske baad jam jaati hai.
 */

/**
 * "Add a field" ke dropdown ke vikalp.
 *
 * Pehle aath saade types the (`hidden` yahan jaan-boojh kar nahi — wo field client haath se
 * nahi jodta). Ab ek aur hai — **Package** — aur wo type nahi, ek **taiyaar field** hai:
 * dropdown jiske vikalp apne aap packages se aate hain.
 *
 * Client ne yahi maanga (1 Sep): _"just add package in dropdown with text email wale me, aur
 * default me `Dropdown · auto-filled from Packages` utha lega"_. Wajah seedhi hai — wo
 * dropdown admin ke likhe vikalp se ban hi nahi sakta, to use "Dropdown chuno, phir source
 * set karo" wale do kadam me todna bemaani hai. Ek chunav, poora field.
 *
 * `patch` wahi hai jo naye field pe lag jaata hai.
 */
const ADDABLE = [
  { value: 'text', patch: { type: 'text' } },
  { value: 'email', patch: { type: 'email' } },
  { value: 'phone', patch: { type: 'phone' } },
  { value: 'number', patch: { type: 'number' } },
  { value: 'date', patch: { type: 'date' } },
  { value: 'select', patch: { type: 'select' } },
  { value: 'checkbox', patch: { type: 'checkbox' } },
  { value: 'textarea', patch: { type: 'textarea' } },
  { value: 'package', label: 'Package', patch: { type: 'select', source: 'packages' } },
  {
    /**
     * ⚠️ Ye 2 Sep ko juda, aur uski wajah likhne laayak hai.
     *
     * `hotelCategory` naye form ke defaults me hai, par **purane form usme nahi uthate** — aur
     * client ka form us din bana tha jab wo field tha hi nahi. Unke paas use jodne ka koi
     * raasta nahi bacha tha, to unhone `Package` chun kar ek field bana li aur uske dropdown
     * me packages aane lage (screenshot, 2 Sep).
     *
     * Maine 1 Sep ko poochha tha ki ise bhi dropdown me daalun ya nahi — jawab nahi aaya, aur
     * maine chhod diya. Sabak: **jab do cheezein ek jaisi hon aur ek ka raasta ban raha ho, to
     * doosri ka na banana apne aap me ek faisla hai** — aur wo faisla client ko phansa deta hai.
     */
    value: 'hotelCategory',
    label: 'Hotel category',
    patch: { type: 'select', source: 'categories' },
  },
]

/**
 * `Travel Date` → `travelDate`.
 *
 * Ye **ek baar** chalti hai, field banate waqt. Label baad me badle to key wahi rehti hai —
 * warna purani enquiries ka wo khaana anaath ho jaata.
 */
function toKey(label) {
  const words = String(label)
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) return ''

  return (
    words
      .map((word, i) =>
        i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join('')
      /** Key ka pehla akshar letter hona chahiye (schema ka regex) — `2adults` chalega nahi. */
      .replace(/^[^a-zA-Z]+/, '')
  )
}

export default function FormBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()

  const { form: loaded, loading, error: loadError } = useForm(id)

  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [newField, setNewField] = useState({ label: '', type: 'text' })
  /** Kaunsa variable abhi copy hua — chip pe ek pal "Copied" dikhane ke liye. */
  const [copied, setCopied] = useState(null)

  const canWrite = can(id ? 'form.update' : 'form.create')
  const readOnly = !canWrite

  /**
   * Fields ka kram — **drag se, grip pe** (client, 15 Sep: _"delete then create karna padta hai"_).
   *
   * Kram form pe fields ka hi kram hai (`toRows()` usi se do `half` jodta hai), aur wo sirf array ki
   * position hai — koi migration nahi, purani enquiries ke `values` key se baithe hain, kram se nahi.
   * Wahi `useListDrag` jo blocks, itinerary aur menus pe hai (keyboard ↑/↓ bhi).
   *
   * ⚠️ Hook yahan, neeche wale `if (loading) return` se **pehle** — conditional hook React ka rule
   * todta. Isliye `setForm` ka functional roop: is waqt `form` abhi `null` ho sakta hai.
   */
  const moveField = (from, to) =>
    setForm((f) => {
      if (!f || to < 0 || to >= f.fields.length) return f
      const fields = [...f.fields]
      const [row] = fields.splice(from, 1)
      fields.splice(to, 0, row)
      return { ...f, fields }
    })

  const { handleProps, rowProps } = useListDrag(moveField, !readOnly)

  useEffect(() => {
    if (id) {
      if (loaded) setForm(withMailDefaults(loaded))
      return
    }

    /** Naya form design ke das default fields ke saath khulta hai — wahi shape jo API deti hai. */
    setForm(withMailDefaults(emptyForm()))
  }, [id, loaded])

  if (loading) return <p className="muted">Loading…</p>
  if (loadError) {
    return (
      <div className="notice err" role="alert">
        <span>{loadError}</span>
      </div>
    )
  }
  if (!form) return null

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const setField = (index, patch) =>
    setForm((f) => ({
      ...f,
      fields: f.fields.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    }))

  function addField() {
    const label = newField.label.trim()
    if (!label) return

    const key = toKey(label)
    if (!key) {
      setError('Give the field a name that starts with a letter.')
      return
    }

    /**
     * Duplicate key yahin rok di jaati hai, Save pe nahi.
     *
     * Schema bhi rokta hai (`formSchema` ka `.refine`), par wo 400 form bharne ke **baad**
     * deta hai — aur tab tak client ne poori field bana li hoti hai.
     */
    if (form.fields.some((field) => field.key === key)) {
      setError(`There is already a field called “${label}”.`)
      return
    }

    setError(null)
    set({
      fields: [
        ...form.fields,
        {
          key,
          label,
          show: true,
          required: false,
          options: [],
          placeholder: '',
          width: 'full',
          /** Type — aur `Package` jaise vikalp pe uske saath `source` bhi. */
          ...(ADDABLE.find((option) => option.value === newField.type)?.patch ?? {
            type: newField.type,
          }),
        },
      ],
    })
    setNewField({ label: '', type: 'text' })
  }

  const setMail = (patch) => setForm((f) => ({ ...f, notifyEmail: { ...f.notifyEmail, ...patch } }))

  /**
   * Variable ka chip dabao → `{{fullName}}` clipboard pe, phir editor me paste.
   *
   * ⚠️ Seedha editor me daalne ka raasta nahi hai — `HtmlEditor` bahar se cursor pe kuch daalne ka
   * API deta hi nahi, aur wo client ke hand-edit wala component hai (unused `label` wali lint bhi
   * wahin hai). Copy ek kadam zyada hai, par ek shared component me naya API jodne se sasta aur
   * subject/message dono pe ek jaisa chalta hai.
   */
  async function copyToken(token) {
    const text = `{{${token}}}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(token)
      setTimeout(() => setCopied((current) => (current === token ? null : current)), 1500)
    } catch {
      /** Clipboard band ho (http pe LAN IP) to kam se kam likha hua dikhe — haath se likh lein. */
      window.prompt('Copy this and paste it into the subject or message:', text)
    }
  }

  function removeField(index) {
    const field = form.fields[index]
    if (!confirmRemove(field.label || field.key)) return

    set({ fields: form.fields.filter((_, i) => i !== index) })
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    const payload = {
      name: form.name,
      emailTo: form.emailTo,
      notifyEmail: form.notifyEmail,
      afterSubmit: form.afterSubmit,
      footnote: form.footnote,
      submitLabel: form.submitLabel ?? '',
      placement: form.placement,
      status: form.status,
      fields: form.fields,
    }

    try {
      if (id) {
        await api.patch(`/forms/${id}`, payload)
        setNotice('Saved.')
      } else {
        const res = await api.post('/forms', payload)
        /** Naya form bante hi uske apne URL pe — warna dobara Save ek aur form bana deta. */
        navigate(`/enquiries/forms/${res.data.data.form.id}`, { replace: true })
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save}>
      <div className="page-head">
        <h1>{id ? 'Enquiry Form' : 'Add New Form'}</h1>
      </div>

      {/* Design ki apni line — 23 Sep se sach hai (D-109), isliye wapas reference ke shabd. */}
      <p className="subtitle">
        Name it, tick the fields you want, say where it goes. Submissions land in{' '}
        <Link to="/enquiries">Enquiries</Link> and are emailed to your team.
      </p>

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
        </div>
      )}

      <div className="edit-grid">
        <div>
          <Panel title="Basics">
            <div className="panel-body">
              <div className="row2">
                <div className="field">
                  <label>Form name</label>
                  <input
                    className="inp"
                    value={form.name}
                    onChange={(e) => set({ name: e.target.value })}
                    disabled={readOnly}
                    required
                  />
                </div>
                <div className="field">
                  <label>Email enquiries to</label>
                  <input
                    className="inp"
                    value={form.emailTo}
                    onChange={(e) => set({ emailTo: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
              </div>

              {/*
               * 22 Sep tak yahan "Email is not being sent yet" likha tha — mail sach me nahi jaati
               * thi (A-43). 23 Sep se jaati hai (D-109), to hint ab ye batati hai ki **khaali = mail
               * nahi**, aur ki mail ke liye SMTP chahiye. Doosri baat zaroori hai: bina SMTP ke
               * enquiry pe "not sent" dikhta hai aur client ko wajah yahin milni chahiye.
               */}
              <div className="hint">
                Comma-separate the addresses for more than one. Every new enquiry is emailed here —
                leave it empty to send no email. Needs{' '}
                <Link to="/settings/email">Settings ▸ Email / SMTP</Link>.
              </div>

              <div className="field">
                <label>After submit</label>
                <select
                  className="sel"
                  value={form.afterSubmit?.mode ?? 'message'}
                  onChange={(e) =>
                    set({ afterSubmit: { ...form.afterSubmit, mode: e.target.value } })
                  }
                  disabled={readOnly}
                >
                  <option value="message">Show a thank-you message</option>
                  <option value="redirect">Redirect to a page</option>
                </select>
              </div>

              <div className="field">
                <label>
                  {form.afterSubmit?.mode === 'redirect' ? 'Redirect to' : 'Thank-you message'}
                </label>
                <input
                  className="inp"
                  value={form.afterSubmit?.value ?? ''}
                  onChange={(e) =>
                    set({ afterSubmit: { ...form.afterSubmit, value: e.target.value } })
                  }
                  placeholder={form.afterSubmit?.mode === 'redirect' ? '/thank-you' : ''}
                  disabled={readOnly}
                />
              </div>

              {/* Button ka text — form ki setting, jahan bhi form lage wahi (client, 15 Sep, D-96). */}
              <div className="field">
                <label>Button label</label>
                <input
                  className="inp"
                  value={form.submitLabel ?? ''}
                  onChange={(e) => set({ submitLabel: e.target.value })}
                  placeholder="Get this itinerary"
                  disabled={readOnly}
                />
                <div className="hint">
                  The text on the submit button, wherever this form appears. Leave it empty and it
                  reads &ldquo;Get this itinerary&rdquo;.
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label>Note under the button</label>
                <input
                  className="inp"
                  value={form.footnote ?? ''}
                  onChange={(e) => set({ footnote: e.target.value })}
                  disabled={readOnly}
                />
                {/*
                 * ⚠️ Ye thank-you message se **alag** hai, aur ye farq zaroori hai — dono box
                 * paas-paas hain aur ek dusre jaise dikhte hain. Thank-you submit ke **baad**
                 * aata hai; ye **pehle**, jab user abhi soch raha hai ki bharun ya na bharun.
                 */}
                <div className="hint">
                  Shown <b>before</b> they submit, right under the button — the thank-you message
                  above is shown after. Good place for what removes hesitation: &ldquo;No advance to
                  see the plan. Answered by a planner, usually within 4 working hours.&rdquo;
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Fields">
            {/*
              ⚠️ Ye hint 22 Sep ko juda (client ne label optional karwaya). Iske bina khaali label
              ek **galti** jaisa lagta — client ko pata hi nahi chalta ki wo ek chunav hai. Wahi
              soch jo `quoteUrl` aur `floatingContactSide` ki hints pe hai (D-30 / D-102).
            */}
            <div className="hint" style={{ marginBottom: 10 }}>
              Clear a field&rsquo;s name to hide it on the site — the box still works, and the
              placeholder tells people what to type. Handy where space is tight, like the popup.
            </div>

            <table className="list field-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }} aria-label="Reorder" />
                  <th>Field</th>
                  <th style={{ width: 80 }}>Show</th>
                  <th style={{ width: 90 }}>Required</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {form.fields.map((field, index) => (
                  <tr key={field.key} {...rowProps(index)}>
                    <td className="field-grip">
                      {!readOnly && (
                        <span className="grip" {...handleProps(index)}>
                          ⠿
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        className="inp"
                        value={field.label}
                        onChange={(e) => setField(index, { label: e.target.value })}
                        disabled={readOnly}
                        aria-label={`${field.label || field.key} label`}
                      />
                      <div className="ftype">
                        {FORM_FIELD_TYPE_LABEL[field.type] ?? field.type}
                        {/* Design: `Dropdown · auto-filled from Packages` */}
                        {field.source === 'packages' && ' · auto-filled from Packages'}
                        {field.source === 'categories' &&
                          ' · auto-filled from this package’s prices'}
                        {field.type === 'hidden' && ' · captured automatically'}
                      </div>

                      {/*
                       * Dropdown ke vikalp — ek line me ek. `source` wale field pe ye box
                       * nahi aata: unke vikalp packages ki list se aate hain, likhe nahi
                       * jaate. Do raaste ek saath dene se ye pata hi nahi chalta ki page pe
                       * kaunse chhap rahe hain.
                       */}
                      {/*
                       * Placeholder sirf un fields pe jinme sach me type hota hai. Dropdown,
                       * checkbox aur hidden pe uska koi roop hi nahi banta — box dikhana wahan
                       * ek aisa control dena hota jo kuch karta hi nahi (D-30 ka ulta).
                       */}
                      {['text', 'email', 'phone', 'number', 'textarea'].includes(field.type) && (
                        <input
                          className="inp field-sub"
                          value={field.placeholder ?? ''}
                          onChange={(e) => setField(index, { placeholder: e.target.value })}
                          placeholder="Placeholder — e.g. +91 98765 43210"
                          disabled={readOnly}
                          aria-label={`${field.label || field.key} placeholder`}
                        />
                      )}

                      <div className="field-flags">
                        {/*
                         * Do lagataar `half` apne aap ek row ban jaate hain (reference ka
                         * `.bkg__two`). Admin ko "row" jaisi koi cheez banane ki zaroorat nahi.
                         */}
                        <label className="inline-lbl">
                          <input
                            type="checkbox"
                            checked={field.width === 'half'}
                            onChange={(e) =>
                              setField(index, { width: e.target.checked ? 'half' : 'full' })
                            }
                            disabled={readOnly}
                          />{' '}
                          Half width
                        </label>
                      </div>

                      {field.type === 'select' && !field.source && (
                        <>
                          <textarea
                            className="ta options-box"
                            value={(field.options ?? []).join('\n')}
                            onChange={(e) =>
                              setField(index, {
                                options: e.target.value
                                  .split('\n')
                                  .map((line) => line.trim())
                                  .filter(Boolean),
                              })
                            }
                            disabled={readOnly}
                            aria-label={`${field.label || field.key} options`}
                          />
                          <div className="hint">One option per line.</div>
                        </>
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={field.show !== false}
                        onChange={(e) => setField(index, { show: e.target.checked })}
                        disabled={readOnly}
                        aria-label={`Show ${field.label || field.key}`}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) => setField(index, { required: e.target.checked })}
                        disabled={readOnly}
                        aria-label={`${field.label || field.key} required`}
                      />
                    </td>
                    <td>
                      {canWrite && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => removeField(index)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="panel-foot">
              {canWrite && (
                <div className="addrow">
                  <input
                    className="inp"
                    style={{ width: 180 }}
                    placeholder="Add a field — label"
                    value={newField.label}
                    onChange={(e) => setNewField((f) => ({ ...f, label: e.target.value }))}
                    /*
                     * Enter pe form Save **nahi** hona chahiye — is box me Enter ka matlab
                     * "ye field jodo" hai. Bina iske ek aadha bhara field Save kar deta.
                     */
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addField()
                      }
                    }}
                  />
                  <select
                    className="sel"
                    style={{ width: 'auto' }}
                    value={newField.type}
                    onChange={(e) => setNewField((f) => ({ ...f, type: e.target.value }))}
                  >
                    {ADDABLE.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label ?? FORM_FIELD_TYPE_LABEL[option.value]}
                      </option>
                    ))}
                  </select>
                  <button className="btn" type="button" onClick={addField}>
                    Add
                  </button>
                </div>
              )}
              <span className="muted">{form.fields.length} fields</span>
            </div>
          </Panel>

          {/*
           * Team wali mail ka template — D-109 (client, 23 Sep). Ye reference ka rad kiya hua
           * `Enquiry Notifications` panel **nahi** hai (D-108 §10): wahan ek global pata aur
           * auto-reply the; yahan har form ka apna pata (`Email enquiries to`) aur apna message.
           *
           * Fields ke **neeche** jaan-boojh kar — variables inhi fields se bante hain, aur field
           * jodte hi uska chip yahan aa jaata hai.
           */}
          <Panel title="Notification email">
            <div className="panel-body">
              {!form.emailTo?.trim() && (
                <div className="hint" style={{ marginBottom: 12 }}>
                  <b>No email is sent for this form</b> — add an address in &ldquo;Email enquiries
                  to&rdquo; above. You can still set the message up now.
                </div>
              )}

              <div className="field">
                <label>Subject</label>
                <input
                  className="inp"
                  value={form.notifyEmail.subject}
                  onChange={(e) => setMail({ subject: e.target.value })}
                  maxLength={200}
                  disabled={readOnly}
                />
              </div>

              {/* Label bahar `.field` me — `HtmlEditor` ka `label` prop render nahi hota (PopupSettings). */}
              <div className="field">
                <label>Message</label>
                <HtmlEditor
                  value={form.notifyEmail.body}
                  onChange={(v) => setMail({ body: v })}
                  disabled={readOnly}
                  height={240}
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label>Variables</label>
                <div className="chips var-chips">
                  {enquiryMailVariables(form).map(({ token, label }) => (
                    <button
                      key={token}
                      type="button"
                      className="chip var-chip"
                      title={label}
                      onClick={() => copyToken(token)}
                    >
                      {copied === token ? 'Copied' : `{{${token}}}`}
                    </button>
                  ))}
                </div>
                <div className="hint">
                  Click one to copy it, then paste it into the subject or message — it is replaced
                  with what the visitor filled in. <code>{'{{all_fields}}'}</code> puts everything
                  they entered in a table. Replying to the email goes straight to the visitor. Leave
                  the subject or message empty to use the default.
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <aside>
          <Panel title="Save">
            <div className="pub-row">
              <span className="k">● Status</span>
              <select
                className="sel"
                style={{ width: 'auto' }}
                value={form.status}
                onChange={(e) => set({ status: e.target.value })}
                disabled={readOnly}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            {canWrite && (
              <div className="pub-actions">
                <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Form'}
                </button>
              </div>
            )}
          </Panel>

          <Panel title="Where it appears">
            <div className="panel-body">
              <div className="field">
                <label>Placement</label>
                <select
                  className="sel"
                  value={form.placement}
                  onChange={(e) => set({ placement: e.target.value })}
                  disabled={readOnly}
                >
                  {FORM_PLACEMENTS.map((placement) => (
                    <option key={placement} value={placement}>
                      {FORM_PLACEMENT_LABEL[placement]}
                    </option>
                  ))}
                </select>
              </div>

              {/*
               * ⚠️ Ye do hint milkar ek hi baat kehte hain, aur wo baat zaroori hai: aaj sirf
               * package pages pe form lag sakta hai. Design me paanch jagah thi; baaki ke
               * liye page builder chahiye (Phase 5). Bina iske client ye maan lega ki uska
               * form contact page pe bhi hai.
               */}
              <div className="hint">
                Only package pages for now — other placements need the page builder. If two forms
                are set to package pages, the most recently saved one is used.
              </div>

              {id && (
                <>
                  <div className="sc-box">
                    <code>{`[form id="${id}"]`}</code>
                  </div>
                  <div className="hint">
                    This is the form&rsquo;s id. Pasting it into a page will work once the page
                    builder is built.
                  </div>
                </>
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </form>
  )
}
