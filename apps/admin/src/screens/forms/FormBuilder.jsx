import {
  DEFAULT_FORM_FIELDS,
  FORM_FIELD_TYPE_LABEL,
  FORM_PLACEMENTS,
  FORM_PLACEMENT_LABEL,
  emptyForm,
} from '@cms/shared'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Panel from '../../components/admin/Panel.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { confirmRemove } from '../../lib/confirm.js'
import { useForm } from './useForms.js'
import './Forms.css'

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

/** Builder ke dropdown me `hidden` nahi hai — wo field client haath se nahi jodta. */
const ADDABLE_TYPES = ['text', 'email', 'phone', 'number', 'date', 'select', 'checkbox', 'textarea']

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

  const canWrite = can(id ? 'form.update' : 'form.create')
  const readOnly = !canWrite

  useEffect(() => {
    if (id) {
      if (loaded) setForm(loaded)
      return
    }

    /** Naya form design ke das default fields ke saath khulta hai — wahi shape jo API deti hai. */
    setForm(emptyForm())
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
          type: newField.type,
          show: true,
          required: false,
          options: [],
          placeholder: '',
          width: 'full',
          optionalTag: false,
        },
      ],
    })
    setNewField({ label: '', type: 'text' })
  }

  /**
   * Jo built-in field **is form me hain hi nahi**.
   *
   * Do tarah se aisa hota hai, aur dono asli hain:
   *
   * 1. Client ne use **Remove** kar diya tha aur ab wapas chahiye
   * 2. Wo field is form ke **banne ke baad** code me juda — `Hotel category` ke saath theek
   *    yahi hua (1 Sep). Purane form apne aap naye default nahi utha lete, aur wo sahi bhi
   *    hai: kisi ke bane hue form me chup-chaap ek naya khaana ghusa dena uska form badalna
   *    hai, uski marzi ke bina
   *
   * ⚠️ Pehle iska koi raasta hi nahi tha — client ko wo field **dikhta hi nahi** tha, aur
   * "kya wo hai aur maine chhupa rakha hai, ya hai hi nahi" ka jawab kahin se nahi milta tha
   * (client, 1 Sep). Ab wo yahin neeche list me dikhte hain.
   */
  const missing = DEFAULT_FORM_FIELDS.filter(
    (candidate) => !form.fields.some((field) => field.key === candidate.key),
  )

  /** Built-in field wapas — apne asli default ke saath, chhupa hua nahi. */
  function restoreField(candidate) {
    setError(null)
    set({
      fields: [
        ...form.fields,
        {
          options: [],
          placeholder: '',
          width: 'full',
          optionalTag: false,
          ...candidate,
          /**
           * `show: true` — client ne ise khud jodne ke liye click kiya hai. Uska apna default
           * (`Hotel category` pe `false`) naye form ke liye hai, is click ke liye nahi.
           */
          show: true,
        },
      ],
    })
  }

  function removeField(index) {
    const field = form.fields[index]
    if (!confirmRemove(field.label)) return

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
      afterSubmit: form.afterSubmit,
      footnote: form.footnote,
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

      <p className="subtitle">
        Name it, tick the fields you want, say where it goes. Submissions are stored against this
        form.
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
               * ⚠️ Ye hint zaroori hai, sajawat nahi. Box ka naam padh kar client ye maanega
               * ki mail jaane lagi — aur mail abhi jaati hi nahi (SMTP Phase 0 se blocked
               * hai). Us bharose pe wo asli enquiries miss kar dega. Pata abhi bhi bhar kar
               * rakhna theek hai: jis din SMTP aayegi, dobara nahi poochhna padega.
               */}
              <div className="hint">
                Comma-separate the addresses for more than one. <b>Email is not being sent yet</b> —
                mail delivery is still being set up. Every enquiry is stored against this form in
                the meantime.
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
            <table className="list field-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th style={{ width: 80 }}>Show</th>
                  <th style={{ width: 90 }}>Required</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {form.fields.map((field, index) => (
                  <tr key={field.key}>
                    <td>
                      <input
                        className="inp"
                        value={field.label}
                        onChange={(e) => setField(index, { label: e.target.value })}
                        disabled={readOnly}
                        aria-label={`${field.label} label`}
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
                          aria-label={`${field.label} placeholder`}
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

                        {/*
                         * `required` ka ulta **nahi** hai — reference me Travel date aur Guests
                         * bhi optional hain par unpe tag nahi. Ye dikhne ka faisla hai, niyam ka
                         * nahi, isliye apna checkbox.
                         */}
                        {!field.required && (
                          <label className="inline-lbl">
                            <input
                              type="checkbox"
                              checked={Boolean(field.optionalTag)}
                              onChange={(e) => setField(index, { optionalTag: e.target.checked })}
                              disabled={readOnly}
                            />{' '}
                            Say &ldquo;optional&rdquo;
                          </label>
                        )}
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
                            aria-label={`${field.label} options`}
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
                        aria-label={`Show ${field.label}`}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) => setField(index, { required: e.target.checked })}
                        disabled={readOnly}
                        aria-label={`${field.label} required`}
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
                    {ADDABLE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {FORM_FIELD_TYPE_LABEL[type]}
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

            {canWrite && missing.length > 0 && (
              <div className="panel-foot missing-fields">
                <span className="muted">Built-in fields not in this form</span>
                <div className="addrow">
                  {missing.map((candidate) => (
                    <button
                      key={candidate.key}
                      type="button"
                      className="btn btn-sm"
                      onClick={() => restoreField(candidate)}
                    >
                      ＋ {candidate.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
