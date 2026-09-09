/**
 * `4.9 average from 412 trips` — rating ki jodi (client, 1 Sep).
 *
 * ⚠️ **Ye component ab do jagah chalta hai** (9 Sep):
 *
 * | Kahan | Kis cheez ki rating |
 * | --- | --- |
 * | `Packages ▸ Section Headings ▸ Traveller reviews` | **site ki** — `packageDefaults.rating` |
 * | `Package edit ▸ Rating` panel | **us package ki** — `fields.rating` (D-87 §3) |
 *
 * Dobara nahi likha gaya, aur isiliye yahan koi hint nahi bachi: ek hi hint dono jagah sach
 * nahi ho sakti. Jo kehna hai wo bulane wali screen kehti hai.
 *
 * Pehli jagah pe `BookingPanel` jaisa hi baithta hai: section ka baaki content usi tab me,
 * jahan client use dhoondhega.
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
          <div className="hint">Out of 5 — e.g. 4.9.</div>
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
           * ⚠️ Label me **"trips" hai, "reviews" nahi** — design dono shabd alag matlab me use
           * karta hai, aur client ka number trips ka hai. Pehle iske neeche ek hint bhi thi jo
           * yahi samjhaati thi; wo 9 Sep ko hat gayi (panel ab do jagah hai, aur ek hint dono
           * jagah sach nahi thi). Ab ye farak **label** akela rakhta hai — use badalne se pehle
           * ye padh lena.
           */}
        </div>
      </div>
    </div>
  )
}
