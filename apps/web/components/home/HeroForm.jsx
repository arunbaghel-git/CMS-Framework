import Icon from '../Icon.jsx'
import Img from '../Img.jsx'
import EnquiryForm from '../package/EnquiryForm.jsx'

/**
 * `Hero with form` — `home-nav-v3.html` ka `3. HERO` (client, 15 Sep, D-96).
 *
 * ```
 * .hf-hero            background rang (admin) + image (desktop/mobile)
 *   .hf-hero__grid    do column; 1040px pe ek ke neeche ek
 *     .hf-hero__copy  h1 · description · chaar number
 *     .hf-card        form ka card — EnquiryForm variant="hero"
 * ```
 *
 * ## ⚠️ Class ke naam reference ke nahi hain
 *
 * Reference me `.hero`, `.quote`, `.fld`, `.b` hain. `.hero`/`.quote` naam hamari site pe kal kisi
 * aur cheez ke ho sakte hain, aur `.art`/`.faq`/`.sec` jaise naam **aaj hi** takraate hain (blog
 * ka article `.art` hai). Isliye har home section apne **block ke prefix** pe hai (`hf-` = hero
 * form) — ek class ka override bharosemand nahi hota (07 §9.1), aur section kal kisi aur page pe
 * bhi chal sake.
 *
 * ## Background ek CSS variable hai
 *
 * Rang `--hf-bg` me jaata hai, `background` me seedha nahi — kyunki reference ka parda (gradient)
 * bhi usi rang se banta hai (`color-mix`). Seedha likhne pe client ka chuna hua rang parde ke
 * neeche dab jaata aur hero hamesha gehra neela dikhta. Value Zod ke hex regex se guzri hai
 * (`sectionBackgroundSchema`), isliye inline style me CSS ghus nahi sakti.
 *
 * ## Form na ho to
 *
 * Form draft ho, delete ho gaya ho ya chuna hi na ho — `data.form` `null`, aur card **gayab**
 * (D-42 §2). Copy tab bhi poori chaudai nahi leti; grid ka doosra column khaali rehta hai taaki
 * form wapas aane pe layout na kude.
 */
export default function HeroForm({ props = {}, data = {} }) {
  const { background, eyebrow, title, description, stats = [] } = props
  const { ribbon, formHeading, formDescription } = props
  const { image, mobileImage, form } = data

  return (
    <section className="hf-hero" style={background ? { '--hf-bg': background } : undefined}>
      {image && (
        <div className="hf-hero__bg">
          {/* LCP image — home ka sabse bada dikhne wala hissa (D-85). `alt` khaali: sajawat hai. */}
          <Img image={image} mobile={mobileImage} alt="" sizes="100vw" priority />
        </div>
      )}

      <div className="wrap hf-hero__in">
        <div className="hf-hero__grid">
          <div className="hf-hero__copy">
            {/*
             * Title ke upar ki line (client, 16 Sep). Class **tour/blog wali** `.vhero__eye` hai —
             * client ne wahi look maanga, reference ke chip (`.hero__eyebrow`) ki jagah.
             */}
            {eyebrow ? (
              <span className="vhero__eye">
                <Icon name="star" size={12} filled />
                {eyebrow}
              </span>
            ) : null}

            {/* Admin ki inline HTML, write pe saaf (R20). Italic = accent rang. */}
            {title ? <h1 dangerouslySetInnerHTML={{ __html: title }} /> : null}
            {description ? (
              <div className="hf-hero__sub" dangerouslySetInnerHTML={{ __html: description }} />
            ) : null}

            {stats.length > 0 && (
              <div className="hf-hero__stats">
                {stats.map((stat, i) => (
                  <div className="hf-stat" key={stat.id ?? i}>
                    <b>{stat.value}</b>
                    {stat.label ? <span>{stat.label}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {form ? (
            <EnquiryForm
              form={form}
              sourcePath="/"
              variant="hero"
              ribbon={ribbon}
              heading={formHeading}
              description={formDescription}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
