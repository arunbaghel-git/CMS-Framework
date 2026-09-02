'use client'

import { HOTEL_CATEGORY_LABEL, formatPrice } from '@cms/shared'
import { useState } from 'react'

import { PriceHeader, useCategory } from './Pricing.jsx'

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
function Field({ field, value, onChange, packages, categories }) {
  const id = `enq-${field.key}`

  /**
   * Dropdown ke vikalp teen jagah se aa sakte hain — admin, packages, ya pricing.
   *
   * `categories` ki value **category ki key** hoti hai (`standard`), aur uska label daam ke
   * saath (`Standard — ₹24,999`) — reference ka `.js-cat-sel` bilkul yahi hai.
   *
   * Kahin se bhi list na mile to field **render hi nahi hoti**: ek khaali dropdown adhoora
   * control dikhana hai (D-30, wahi tark jo khaali URL wale button pe hai). Ye `categories`
   * pe sach me hota hai — jis package pe daam bhare hi nahi, wahan wo dropdown khaali hai.
   */
  const options =
    field.source === 'packages'
      ? packages.map((name) => ({ value: name, label: name }))
      : field.source === 'categories'
        ? categories
        : (field.options ?? []).map((option) => ({ value: option, label: option }))

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

  /* Half-width ka layout `.bkg__two` karta hai, field khud nahi — yahan koi extra class nahi. */
  return (
    <div className="fld">
      <label htmlFor={id}>{field.label}</label>

      {field.type === 'textarea' && (
        <textarea {...common} rows={3} placeholder={field.placeholder || undefined} />
      )}

      {field.type === 'select' && (
        <select {...common}>
          <option value="">Choose…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
          placeholder={field.placeholder || undefined}
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

/**
 * Fields → rows. Do **lagataar** `half` ek row me, baaki akele.
 *
 * Reference me `Travel date` aur `Guests` ek `.bkg__two` me hain. Admin ko "row" jaisi koi
 * cheez banane ka raasta dene ki jagah, do lagataar `half` apne aap jud jaate hain — ek
 * checkbox se wo kaam ho jaata hai jiske liye warna ek poora grouping UI banana padta.
 *
 * Akela `half` (ya list ka aakhri) apni row me rehta hai aur poori chaudai le leta hai. Wo
 * bura nahi dikhta, aur uske liye alag niyam likhna is chhoti si cheez ko bada bana deta.
 */
function toRows(fields) {
  const rows = []

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const next = fields[i + 1]

    if (field.width === 'half' && next?.width === 'half') {
      rows.push([field, next])
      i++
      continue
    }

    rows.push([field])
  }

  return rows
}

export default function EnquiryForm({ form, packages = [], sourcePath }) {
  const [values, setValues] = useState({})
  const [hp, setHp] = useState('')
  const [state, setState] = useState({ sending: false, done: false, error: null })

  /**
   * Category ka state **form ke bahar** rehta hai — wo poore page ka hai (`CategoryProvider`).
   *
   * Isiliye "Hotel category" wala dropdown apni value `values` me nahi rakhta: agar rakhta,
   * to upar ke catbar se category badalne pe form purani dikhata rehta. Ek hi source hone se
   * dono hamesha ek jaisi dikhti hain — reference me bhi wahi hota hai.
   */
  const { rows: categoryRows, category, setCategory, currency } = useCategory()

  if (!form) return null

  /** `hidden` fields form pe nahi dikhte — unhe browser bharta hai. */
  const visible = (form.fields ?? []).filter((field) => field.type !== 'hidden')

  /** `Standard — ₹24,999` — reference ka `.js-cat-sel`. Value category ki key hai. */
  const categoryOptions = categoryRows.map((row) => ({
    value: row.category,
    label: `${HOTEL_CATEGORY_LABEL[row.category] ?? row.category} — ${formatPrice(row.priceFrom, currency)}`,
  }))

  /** Jin fields ki value page ke category state se aati hai, `values` se nahi. */
  const isCategoryField = (field) => field.source === 'categories'

  /**
   * `hidden` fields jo browser bharta hai — abhi sirf ek, `sourcePage`.
   *
   * ⚠️ Ye **form ke fields se** banta hai, hamesha nahi. Pehle `sourcePage` har submit ke
   * saath chala jaata tha, chahe form me wo field ho ya na ho — aur jis form se client ne use
   * hata diya, wahan API sahi hi kehti thi: **"This form has no field called sourcePage"**
   * (client, 2 Sep). Poora form us ek anjaan key pe ruk jaata tha.
   *
   * Server ka wo check theek hai aur rehna chahiye (R9) — galti bhejne wale ki thi.
   */
  const autoValues = Object.fromEntries(
    (form.fields ?? [])
      .filter((field) => field.type === 'hidden' && field.key === 'sourcePage')
      .map((field) => [field.key, sourcePath]),
  )

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }))

  async function submit(e) {
    e.preventDefault()
    setState({ sending: true, done: false, error: null })

    try {
      const res = await fetch('/api/public/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        /**
         * `omit` — is request ke saath **koi cookie nahi** jaani chahiye.
         *
         * ⚠️ Pehle yahan kuch likha hi nahi tha, is galat samajh ke saath ki "kuch na likhne
         * se cookie nahi jaayegi". `fetch` ka default `same-origin` hai, **`omit` nahi** —
         * aur ye call same-origin hi hai (`/api/*` Next se API pe rewrite hoti hai, D-12).
         *
         * Nateeja: logged-in admin ke browser se CSRF cookie chali jaati thi, API
         * `X-CSRF-Token` maangti thi, aur form **"CSRF token did not match"** de kar ruk
         * jaata tha (client, 2 Sep). Enquiry DB tak pahunchti hi nahi thi.
         *
         * ⚠️ Cookie port se bandhi nahi hoti — `localhost:5173` (admin) ki cookie
         * `localhost:3000` (site) pe bhi jaati hai. Isiliye ye sirf admin ke browser me
         * dikhta tha, aur asli visitor ke liye form chalta rehta — wahi failure jo test se
         * bhi nahi pakdi ja sakti thi.
         */
        credentials: 'omit',
        body: JSON.stringify({
          formId: form.id,
          values: {
            ...values,
            /**
             * Category ka jawab yahan judta hai, `values` se nahi — uska state page ka hai.
             * Bina iske chuni hui category enquiry me pahunchti hi nahi, aur wahi wo ek cheez
             * hai jispe poora quote tika hota hai.
             */
            ...Object.fromEntries(
              visible.filter(isCategoryField).map((field) => [field.key, category]),
            ),
            /** `sourcePage` — design me wo "captured automatically" hai. Ho to hi jaata hai. */
            ...autoValues,
          },
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
        {/*
         * ⚠️ Submit hone par **form gayab nahi hota** — sirf button ka text badalta hai
         * (client, 2 Sep). Pehle poora form ek line ke message se badal jaata tha, aur wo do
         * tarah se bura tha: user ka bhara hua sab kuch aankhon ke saamne se ud jaata tha
         * (kya bheja, ye dobara dekhne ka koi raasta nahi), aur sidebar achanak sikud kar
         * poora page hila deta tha.
         *
         * Reference bhi yahi karta hai — uska `onsubmit` sirf itna hai:
         * `this.querySelector('.js-go').textContent = 'Sent ✓ We will call you shortly'`.
         */}
        <form onSubmit={submit}>
          {toRows(visible).map((row) => {
            const fields = row.map((field) => (
              <Field
                key={field.key}
                field={field}
                value={isCategoryField(field) ? category : values[field.key]}
                onChange={(value) =>
                  isCategoryField(field) ? setCategory(value) : set(field.key, value)
                }
                packages={packages}
                categories={categoryOptions}
              />
            ))

            /* Ek akela field seedha, do wale `.bkg__two` ke andar — reference ka grid. */
            return row.length === 2 ? (
              <div className="bkg__two" key={row[0].key}>
                {fields}
              </div>
            ) : (
              fields
            )
          })}

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

          {/*
           * Teen haalat, ek hi button:
           *
           * | Haalat | Text | Kyun |
           * | --- | --- | --- |
           * | saada | `Get this itinerary →` | teer sirf yahin — wo "aage badho" kehta hai |
           * | bhej raha | `Sending…` | teer hata, warna wo abhi bhi click karne ko kehta lagta |
           * | ho gaya | admin ka thank-you, **jaisa ka waisa** | `disabled`, taaki dobara na jaaye |
           *
           * ⚠️ Admin ke likhe text ke aage-peeche theme **kuch nahi jodta** (client, 2 Sep).
           * Pehle yahan ek `✓` laga diya gaya tha; wo chhoti si cheez thi par ghalat lakeer
           * pe thi — jo box client ko "Thank-you message" kehke diya gaya hai, usme jo likha
           * hai wahi chhapna chahiye, na uska kaata hua roop na uska sajaya hua.
           *
           * Fallback tabhi chalta hai jab wo box **khaali** ho, aur uska text reference ka
           * apna hai (`Sent ✓ We will call you shortly`) — us haalat me kuch to kehna hi
           * padta hai, warna button pe sirf khaali jagah bachti.
           *
           * `btn--sent` sirf ek kaam karta hai — text ko **wrap hone deta hai**. `.btn` pe
           * `white-space: nowrap` hai (label ek shabd ka hota hai), par thank-you ek poora
           * vaakya hai aur wo widget se bahar nikal jaata.
           */}
          <button
            className={`btn btn--accent${state.done ? ' btn--sent' : ''}`}
            type="submit"
            disabled={state.sending || state.done}
          >
            {state.done ? (
              (form.afterSubmit?.value ?? '').trim() || 'Sent ✓ We will call you shortly'
            ) : state.sending ? (
              'Sending…'
            ) : (
              <>
                Get this itinerary
                <Arrow />
              </>
            )}
          </button>

          {/*
           * Button ke neeche ki chhoti line — reference ka `<small>`.
           *
           * Ye thank-you message se alag hai: wo submit ke **baad** aata hai, ye **pehle** —
           * jab user abhi soch raha hai ki bharun ya na bharun.
           */}
          {form.footnote && <small>{form.footnote}</small>}
        </form>
      </div>
    </div>
  )
}
