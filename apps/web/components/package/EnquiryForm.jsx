'use client'

import { HOTEL_CATEGORY_LABEL, formatPrice } from '@cms/shared'
import { useEffect, useState } from 'react'

import { useEnquiryDock } from './EnquiryDock.jsx'
import { PriceHeader, useOptionalCategory } from './Pricing.jsx'

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

/** Thank-you kitni der button pe rahe — uske baad wo wapas `Get this itinerary` ban jaata hai. */
const RESET_AFTER = 6000

/**
 * Date wale khaane pe **kahin bhi** click karo, calendar khul jaaye (client, 2 Sep).
 *
 * Browser ka default sirf us chhote calendar icon pe khulta hai; baaki poora box click karne
 * pe kuch nahi hota, aur user ko lagta hai ki field kaam hi nahi kar raha.
 *
 * ⚠️ `try/catch` zaroori hai, ehtiyaat nahi: `showPicker()` **throw karta hai** jab wo kisi
 * asli click ke bina bulaya jaaye (browsers use user-gesture ke peeche rakhte hain), aur
 * purane browsers me wo hai hi nahi. Dono me se kisi bhi soorat me field waise ka waisa
 * chalta rehna chahiye — type kar ke bharna hamesha kaam karta hai.
 */
const openPicker = (event) => {
  try {
    event.currentTarget.showPicker?.()
  } catch {
    /* Browser ne mana kar diya — user haath se type kar sakta hai, ye rok nahi hai. */
  }
}

/** `View itinerary →` wala hi teer. */
const Arrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/** Home hero ke note ka taala — reference ka `.quote__note svg` (client: _"icon add kr dena"_). */
const Lock = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

/**
 * Ek field → uska input.
 *
 * ⚠️ `hidden` type ka field yahan bhi **render nahi hona chahiye** — wo ek dikhne wala khaali
 * khaana ban jaata. Naya form aisa field banata hi nahi (path ab payload ka apna khaana hai,
 * 2 Sep), par us badlaav se pehle bane form me wo abhi bhi ho sakta hai.
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
          /* Date/month pe poora box click karne laayak — dekho `openPicker`. */
          onClick={['date', 'month'].includes(field.type) ? openPicker : undefined}
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

/**
 * @param {'book'|'cta'} [variant]
 *   `book` — package page ka sidebar widget: neela price header, aur mobile pe sheet ban jaata hai
 *   `cta`  — tour page ka `.wdg--cta` (reference `tour-v3.html:1890`): heading + line + form,
 *            **koi price header nahi** (wahan koi ek package hai hi nahi)
 *   `hero` — home ka `.quote` card (`home-nav-v3.html`, D-96): hari patti (`ribbon`) + heading +
 *            line + form. **Sheet nahi banta** — client: mobile pe form text ke neeche seedha
 *            dikhe, reference jaisa. Isliye `.wdg` class bhi nahi (uske mobile rules sheet banate)
 *
 * @param {string} [ribbon] sirf `hero` — card ke upar ki hari patti, khaali pe nahi banti
 *
 * ⚠️ Do alag form component **nahi** banaye gaye, aur wo soch kar hai: submit, validation,
 * honeypot, thank-you aur reset — sab ek hi jagah rehna chahiye. Do copies ka nateeja is repo me
 * pehle ho chuka hai, aur wo hamesha chup hota hai (ek taraf fix lagta hai, doosri pichhad jaati).
 */
export default function EnquiryForm({
  form,
  packages = [],
  sourcePath,
  variant = 'book',
  heading = '',
  description = '',
  ribbon = '',
}) {
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
  /**
   * ⚠️ **`useOptionalCategory()` — `useCategory()` nahi** (Slice D).
   *
   * Package page pe provider hamesha hota hai. Tour page pe hota hi nahi: wahan koi ek package
   * nahi hai, to na pricing hai na category. Wahi form `variant="cta"` pe chalta hai (reference
   * ka `.wdg--cta`), jisme price header aur "Hotel category" dropdown dono hote hi nahi.
   *
   * `setCategory` ka `noop` fallback zaroori hai: `isCategoryField` wala field us haalat me
   * chhapta hi nahi, par uske bina ek galti se bacha hua field poore form ko phaad deta.
   */
  const categoryCtx = useOptionalCategory()
  const categoryRows = categoryCtx?.rows ?? []
  const category = categoryCtx?.category
  const setCategory = categoryCtx?.setCategory ?? (() => {})
  const currency = categoryCtx?.currency ?? 'INR'

  /**
   * Mobile pe ye widget ek **sheet** ban jaata hai, aur use neeche wali `.mobar` kholti hai.
   *
   * ⚠️ Form phir bhi **ek hi baar** render hota hai — wo sidebar me hi rehta hai, bas CSS use
   * fixed sheet bana deti hai. Popup ke liye ek doosra form banane ka matlab hota do alag
   * state: user desktop pe kuch bharta, screen chhoti karta, aur bhara hua gayab.
   */
  const isHero = variant === 'hero'

  /**
   * ⚠️ Hero pe dock **kabhi nahi** — koi provider upar lag bhi jaaye to bhi. Home ka form popup
   * nahi hai (client, 15 Sep), aur `is-open` wala scrim bina close button ke page ko dhak deta.
   */
  const pageDock = useEnquiryDock()
  const dock = isHero ? null : pageDock

  /**
   * ⚠️ **`variant` ab sirf DIKHNE ka farak hai — dock dono pe chalta hai** (9 Sep me badla).
   *
   * Pehle yahan likha tha ki `cta` pe dock ka poora vyavhaar band hai, kyunki _"tour page pe
   * `.mobar` hai hi nahi, to sheet kholne ka koi raasta bhi nahi"_. **Wo andaza galat tha:**
   * `tour-v3.html:2038` me `.mobar` maujood hai (Call · WhatsApp · Get free quote), bilkul
   * `itinerary-v3.html` jaisi. Maine reference dekhe bina maan liya tha.
   *
   * Ab dono variant ek hi tarah khulte hain — scrim, `is-open`, close button. Farak sirf itna:
   * `book` pe upar neela price header hota hai, `cta` pe uski jagah heading + line.
   */
  const isCta = variant === 'cta'

  /**
   * Thank-you dikhane ke baad button apne aap wapas apni asli haalat me (client, 2 Sep).
   *
   * Fields to submit pe hi khaali ho jaate hain, par button "ho gaya" pe atka rehta tha —
   * yaani ek aur enquiry bhejne ke liye **page refresh** karna padta tha.
   *
   * `RESET_AFTER` itna hai ki thank-you padha ja sake, aur itna kam ki agla user intezaar na
   * kare. Turant reset karne ka matlab hota ki jawab dikhta hi nahi — bhejne wale ko pata hi
   * na chalta ki gaya ya nahi.
   *
   * ⚠️ Is beech button **disabled** rehta hai, aur wo jaan-boojh kar hai: dobara click ka
   * sabse aam kaaran yahi hota hai ki user ko lagta hai pehli baar gaya hi nahi.
   */
  useEffect(() => {
    if (!state.done) return

    const timer = setTimeout(() => {
      setState({ sending: false, done: false, error: null })
    }, RESET_AFTER)

    /** Sheet band ho jaaye ya page badle to timer ke saath jaana chahiye. */
    return () => clearTimeout(timer)
  }, [state.done])

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
          /**
           * Enquiry kis page se aayi — **payload ka apna khaana**, form ka field nahi.
           *
           * ⚠️ Pehle ye `values.sourcePage` me jaata tha, yaani ek `hidden` field pe tika hua
           * tha. Client ne wo field apne form se hata di aur har enquiry pe path khaali aane
           * laga (2 Sep). "Ye kis page se aayi" client ki setting nahi hai — wo submission ka
           * apna sach hai, aur ab wo hamesha jaata hai.
           */
          sourcePath,
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

      /**
       * Bhare hue khaane wapas khaali (client, 2 Sep).
       *
       * Enquiry ja chuki hai; unhe bhara hua chhodne ka matlab hai user ko ye lagna ki
       * shayad wo gayi hi nahi — ya wo dobara Send dabane ki koshish kare.
       *
       * ⚠️ Category **reset nahi hoti**, jaan-boojh kar. Uska state form ka hai hi nahi —
       * wo poore page ka hai (`CategoryProvider`), aur usi se upar ka daam aur catbar chalte
       * hain. Use saaf karne ka matlab hota ki enquiry bhejte hi page ka daam badal jaaye.
       */
      setValues({})
      setHp('')
      setState({ sending: false, done: true, error: null })
    } catch (err) {
      setState({ sending: false, done: false, error: err.message })
    }
  }

  return (
    <>
      {/*
       * Sheet ke peeche ka parda — sirf mobile pe, aur sirf jab wo khuli ho. Iske bina
       * peeche ka page padha jaata rehta hai aur sheet sheet nahi lagti.
       *
       * Ispe click karne se sheet band — wahi vyavhaar jo Lightbox ke backdrop ka hai.
       */}
      {dock?.open && <div className="mosheet-scrim" onClick={dock.close} aria-hidden="true" />}

      <div
        className={
          isHero
            ? 'hf-card'
            : `wdg ${isCta ? 'wdg--cta' : 'wdg--book'}${dock?.open ? ' is-open' : ''}`
        }
        id="enquiry"
      >
        {/* Hari patti — admin ka field (client, 15 Sep). Khaali pe patti hi nahi (D-30). */}
        {isHero && ribbon ? <span className="hf-card__ribbon">{ribbon}</span> : null}

        {/*
         * `.wdg--cta` ka heading aur uske neeche ki line — dono admin se aati hain (D-88 §10).
         * Theme me likhne ka matlab hota Q-9 wala hi kaanta dobara.
         */}
        {isHero && (heading || description) ? (
          <div className="hf-card__head">
            {heading ? <h3>{heading}</h3> : null}
            {description ? <div dangerouslySetInnerHTML={{ __html: description }} /> : null}
          </div>
        ) : null}
        {isCta && heading ? <h3>{heading}</h3> : null}
        {isCta && description ? <div dangerouslySetInnerHTML={{ __html: description }} /> : null}

        {/*
         * Close sirf sheet wali haalat me — sidebar me widget band karne jaisi koi cheez hai
         * hi nahi, wo wahan hamesha khula rehta hai.
         */}
        {dock?.open && (
          <button
            className="wdg__x"
            type="button"
            onClick={dock.close}
            aria-label="Close enquiry form"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        {/*
         * Neela price header — wahi daam jo hero me hai, chuni hui category ke saath badalta hai.
         *
         * ⚠️ `cta` pe ye hai hi nahi: tour page pe koi ek package nahi hota, to dikhane ko koi
         * daam bhi nahi. Reference ka `.wdg--cta` bhi bina header ke hai.
         */}
        {variant === 'book' && <PriceHeader />}

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
                  {/* Form ki setting (D-96) — khaali pe purana text, taaki chalte form na badlein. */}
                  {form.submitLabel?.trim() || 'Get this itinerary'}
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
            {form.footnote &&
              (isHero ? (
                <small className="hf-card__note">
                  <Lock />
                  {form.footnote}
                </small>
              ) : (
                <small>{form.footnote}</small>
              ))}
          </form>
        </div>
      </div>
    </>
  )
}
