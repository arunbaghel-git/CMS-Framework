/**
 * `4.9 average from 412 trips` — site ki ek hi rating jodi (client, 1 Sep).
 *
 * `Packages ▸ Section Headings ▸ Traveller reviews` tab me baithta hai, `BookingPanel`
 * jaisa hi: section ka baaki content usi tab me, jahan client use dhoondhega.
 *
 * ## Ye Reviews screen pe kyun nahi hai
 *
 * Ye number **reviews se gini nahi jaati** (spec 007 §9 #8 ka jawab — client, 1 Sep:
 * haath se). Reviews screen pe rakhne ka matlab hota ki wo list ka saaransh lagta, jabki
 * wo ek alag baat keh raha hai: `412 trips` saalon ka aankda hai, aur likhi hui reviews
 * shayad chaalees bhi na hon. Ginne wala number dikhana wo jhooth hota jo sabse mehnga
 * padta hai — dikhne me sahi, aur jaanch ka koi raasta nahi.
 *
 * ## Khaali ka matlab
 *
 * `0` ka matlab hai **"rating dikhani hi nahi"** — page pe dono jagah se line gayab ho
 * jaati hai (hero ka `4.9 ★ 412 traveller reviews`, aur is section ka heading wala
 * `— 4.9 average from 412 trips`). Wahi model jo pricing pe hai: khaali daam = wo category
 * milti hi nahi (D-56). Ek alag "Show rating" toggle jaan-boojh kar nahi hai — wo ek hi
 * baat do jagah likhna hota, aur dono ke alag hone pe `0.0 ★` chhap jaata.
 */
export default function RatingPanel({ rating, onChange, disabled }) {
  const value = rating?.value ?? 0
  const count = rating?.count ?? 0

  const set = (patch) => onChange({ value, count, ...patch })

  /** `''` → `0`, yaani "dikhani hi nahi". Khaali box ko `NaN` banne dena bug hai. */
  const num = (raw) => (raw === '' ? 0 : Number(raw))

  return (
    <div className="rating-fields">
      <div className="row2">
        <div className="field">
          <label>Average rating</label>
          <input
            className="inp"
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={value || ''}
            onChange={(e) => set({ value: num(e.target.value) })}
            disabled={disabled}
          />
          <div className="hint">Out of 5 — e.g. 4.9. Leave it empty to hide the rating.</div>
        </div>

        <div className="field">
          <label>Number of trips</label>
          <input
            className="inp"
            type="number"
            min="0"
            step="1"
            value={count || ''}
            onChange={(e) => set({ count: num(e.target.value) })}
            disabled={disabled}
          />
          {/*
           * "trips", "reviews" nahi — design dono shabd alag matlab me use karta hai, aur
           * client ka number trips ka hai. Hint isliye zaroori hai: box ke paas baith kar
           * ye lagta hai ki neeche ki list ginni hai.
           */}
          <div className="hint">
            Trips travelled, not the number of reviews written below — the page prints it as
            &ldquo;412 trips&rdquo;.
          </div>
        </div>
      </div>

      <div className="hint">
        These two show in two places: above the package title, and next to this section&rsquo;s
        heading. The reviews themselves live in <b>Packages &rsaquo; Reviews</b>.
      </div>
    </div>
  )
}
