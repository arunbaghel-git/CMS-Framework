import { HOTEL_CATEGORIES, HOTEL_CATEGORY_LABEL } from '@cms/shared'

/**
 * Pricing — `admin-design.html` ke "Pricing & Departures" panel se, spec 007 §4.
 *
 * Design se **chaar farq**, chaaron client ke faisle se (R15):
 *
 * - **Occupancy Slabs** aur **Fixed Departures** ki poori tables hata di gayin (spec §4).
 * - **Price From aur Strike-through har category ke apne hain**, poore package ka ek nahi.
 *   Design me wo upar wali row me the; ab har category ki apni row hai.
 * - **Currency panel me hai hi nahi** (27 Aug) — wo `settings.currency` se aati hai.
 * - **`Price Basis · GST % · Advance to Book %` wali row hat gayi** (27 Aug, D-57). Page pe
 *   `per person on twin sharing…` wali line theme me **static** hai (`PRICE_NOTE`,
 *   `apps/web/components/package/Pricing.jsx`) — wo har package pe, har category pe bilkul
 *   wahi rehti hai, isliye uske liye admin me koi field nahi hai (Q-9).
 *
 * ## Chaaron rows hamesha dikhti hain
 *
 * Koi "＋ Add category" nahi hai (client, 27 Aug). Categories **fix chaar** hain (§1.3), to
 * unhe ek-ek karke jodna ek bane-banaye sach ko dobara bharwana tha.
 *
 * **Khaali daam ka matlab hai "ye category is package pe milti hi nahi"** — wo category
 * public page ke catbar aur hotels tabs dono me aati hi nahi. Isiliye koi alag toggle nahi
 * hai: wo ek hi baat do jagah likhna hota, aur dono ke alag hone pe bina daam ka card dikh
 * jaata.
 */

/** `''` → `null`. Khaali chhodna hi "ye category nahi milti" kehne ka tareeka hai. */
const toPrice = (value) => (value === '' ? null : Number(value))

export default function PricingPanel({ pricing, onChange, disabled }) {
  const rows = pricing?.categoryPricing ?? []

  const rowFor = (category) => rows.find((r) => r.category === category)

  /**
   * Row **tab banti hai jab kuch bhara jaata hai** — chaar khaali rows save karne ka koi
   * matlab nahi, aur wo har package ke document me bekaar ka maal chhod jaatin.
   */
  function setRow(category, patch) {
    const current = rowFor(category)

    const next = current
      ? rows.map((r) => (r.category === category ? { ...r, ...patch } : r))
      : [...rows, { category, priceFrom: null, strikePrice: null, ...patch }]

    onChange({ ...(pricing ?? {}), categoryPricing: next })
  }

  return (
    <div className="panel-body">
      <table className="list price-table">
        <thead>
          <tr>
            <th>Hotel Category</th>
            <th>Price From</th>
            <th>Strike-through Price</th>
          </tr>
        </thead>
        <tbody>
          {HOTEL_CATEGORIES.map((category) => {
            const row = rowFor(category)

            return (
              <tr key={category}>
                <td>
                  <b>{HOTEL_CATEGORY_LABEL[category]}</b>
                </td>
                <td>
                  <input
                    className="inp"
                    type="number"
                    min="0"
                    value={row?.priceFrom ?? ''}
                    disabled={disabled}
                    onChange={(e) => setRow(category, { priceFrom: toPrice(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    className="inp"
                    type="number"
                    min="0"
                    value={row?.strikePrice ?? ''}
                    disabled={disabled}
                    onChange={(e) => setRow(category, { strikePrice: toPrice(e.target.value) })}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="hint">
        Leave a category&rsquo;s price empty if this package doesn&rsquo;t offer it — it won&rsquo;t
        appear on the site.
      </p>
    </div>
  )
}
