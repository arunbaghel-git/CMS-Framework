'use client'

import { useState } from 'react'

import { PriceHeader } from './Pricing.jsx'

/**
 * Sidebar ka enquiry form — reference ka `.wdg--book` (`itinerary-v3.html`).
 *
 * Q-2 ka aakhri hissa. D-67 me is section ka **button** ban gaya tha aur uska target ek
 * field tha ("jis din form bane, sirf ek value bharni hai"); wo din 1 Sep hai.
 *
 * ## Dhaancha design ka, khaane admin se
 *
 * Reference me saat field hardcoded hain (Name · Travel date · Guests · Hotel category ·
 * Mobile · Email · Special request). Yahan wo **admin se** aate hain — `Enquiries ▸ Enquiry
 * Forms` me client jo tick karta hai wahi chhapta hai. Widget ka poora khol wahi rehta hai:
 * upar neela price header, neeche `.fld` fields, aur ek poori chaudai ka narangi button.
 *
 * Yahi Q-9 wali soch hai — **dhaancha static, maal admin se** — aur wahi jo `PRICE_NOTE` aur
 * section headings pe lagi thi.
 *
 * ## Client component kyun
 *
 * Form bharna aur uska jawab dikhana browser me hi hota hai. Ye **poora** client component
 * hai (server action nahi) kyunki submit seedha API pe jaata hai, `apps/web` ke through
 * nahi — wahi raasta jo baaki public data ka hai.
 */

/** `View itinerary →` wala hi teer. */
const Arrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/**
 * Ek field → uska input.
 *
 * `hidden` yahan **aata hi nahi** — wo neeche alag se bharta hai (`sourcePage`). Use yahan
 * render karne ka matlab hota ek dikhne wala khaali khaana.
 */
function Field({ field, value, onChange, packages }) {
  const id = `enq-${field.key}`

  /**
   * `source: 'packages'` — vikalp publish packages se, admin ke likhe hue nahi.
   *
   * List na mile to field **render hi nahi hoti**: ek khaali dropdown adhoora control
   * dikhana hai (D-30, wahi tark jo khaali URL wale button pe hai).
   */
  const options = field.source === 'packages' ? packages : (field.options ?? [])

  if (field.type === 'select' && options.length === 0) return null

  const common = {
    id,
    required: field.required,
    value: value ?? '',
    onChange: (e) => onChange(e.target.value),
  }

  if (field.type === 'checkbox') {
    return (
      <label className="fld fld--check" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          required={field.required}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    )
  }

  return (
    <div className="fld">
      <label htmlFor={id}>{field.label}</label>

      {field.type === 'textarea' && <textarea {...common} rows={3} />}

      {field.type === 'select' && (
        <select {...common}>
          <option value="">Choose…</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {!['textarea', 'select'].includes(field.type) && (
        <input
          {...common}
          type={
            { email: 'email', phone: 'tel', number: 'number', date: 'date' }[field.type] ?? 'text'
          }
          /** Browser ka autofill — sabse bada single UX faayda, aur muft hai. */
          autoComplete={
            { email: 'email', phone: 'tel', text: field.key === 'fullName' ? 'name' : 'off' }[
              field.type
            ] ?? 'off'
          }
        />
      )}
    </div>
  )
}

export default function EnquiryForm({ form, packages = [], sourcePath }) {
  const [values, setValues] = useState({})
  const [hp, setHp] = useState('')
  const [state, setState] = useState({ sending: false, done: false, error: null })

  if (!form) return null

  /** `hidden` fields form pe nahi dikhte — unhe browser bharta hai. */
  const visible = (form.fields ?? []).filter((field) => field.type !== 'hidden')

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }))

  async function submit(e) {
    e.preventDefault()
    setState({ sending: true, done: false, error: null })

    try {
      const res = await fetch('/api/public/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        /**
         * ⚠️ `credentials` jaan-boojh kar **nahi** hai.
         *
         * Cookie bhejne ka matlab hota ki logged-in admin ke browser se CSRF cookie bhi
         * jaati, aur API tab `X-CSRF-Token` maangti — jo is public form ke paas hai hi nahi.
         * Wo bug sirf **admin ke apne browser** me dikhta: visitor ke liye form chalta rehta
         * aur client ko lagta ki sab theek hai.
         */
        body: JSON.stringify({
          formId: form.id,
          /** `sourcePage` yahan judta hai — design me wo "captured automatically" hai. */
          values: { ...values, sourcePage: sourcePath },
          hp,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message ?? 'Something went wrong. Please try again.')
      }

      if (form.afterSubmit?.mode === 'redirect' && form.afterSubmit.value) {
        window.location.assign(form.afterSubmit.value)
        return
      }

      setState({ sending: false, done: true, error: null })
    } catch (err) {
      setState({ sending: false, done: false, error: err.message })
    }
  }

  return (
    <div className="wdg wdg--book" id="enquiry">
      {/* Neela price header — wahi daam jo hero me hai, chuni hui category ke saath badalta hai */}
      <PriceHeader />

      <div className="bkg__b">
        {state.done ? (
          <p className="bkg__done">
            {form.afterSubmit?.value || 'Thank you — we will get back to you shortly.'}
          </p>
        ) : (
          <form onSubmit={submit}>
            {visible.map((field) => (
              <Field
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(value) => set(field.key, value)}
                packages={packages}
              />
            ))}

            {/*
             * Honeypot — asli user ise dekh hi nahi sakta, bot bhar deta hai. Bhara hua aaye
             * to API 200 lautati hai aur kuch store nahi karti.
             *
             * `aria-hidden` + `tabIndex={-1}` isliye ki screen reader aur keyboard dono ise
             * chhod dein — warna ye asli users ke liye ek anjaan khaana ban jaata.
             */}
            <div className="hp" aria-hidden="true">
              <label htmlFor="enq-website">Website</label>
              <input
                id="enq-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
              />
            </div>

            {state.error && (
              <p className="bkg__err" role="alert">
                {state.error}
              </p>
            )}

            <button className="btn btn--accent" type="submit" disabled={state.sending}>
              {state.sending ? 'Sending…' : 'Get this itinerary'}
              {!state.sending && <Arrow />}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
