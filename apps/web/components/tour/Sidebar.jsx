import Icon from '../Icon.jsx'
import EnquiryForm from '../package/EnquiryForm.jsx'
import Planner from '../package/Planner.jsx'
import StickySide from '../package/StickySide.jsx'

/**
 * Page ki sidebar — `Appearance ▸ Sidebar` se (D-88).
 *
 * Widgets **resolve ho kar** aate hain (`entry.sidebarWidgets`): form poora payload me hota hai,
 * planner ka email usi sidebar ke form se, aur HTML write pe saaf ho chuki hoti hai. Theme ko
 * yahan koi hisaab nahi karna — `sidebarId` use milta hi nahi.
 *
 * ⚠️ **Kram client ka hai.** Reference me wo `Packages by duration → Talk to a planner → Enquiry
 * form` hai, par wo bhi bas ek chunav hai — array ka kram hi page ka kram hai.
 */

/** `.pop` ki doosri line — reference: `5 Aug 2026 · 7 min read`. */
const popMeta = (post) =>
  [
    post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null,
    post.readMinutes ? `${post.readMinutes} min read` : null,
  ]
    .filter(Boolean)
    .join(' · ')

/**
 * Custom HTML widget — `html` ka `.wdg`.
 *
 * ⚠️ `dangerouslySetInnerHTML` yahan theek hai: safai **write pe** ho chuki hai
 * (`sanitizeSidebarWidgets()`, R20). Render pe dobara saaf karna do jagah ek hi tark rakhna
 * hota, aur wo dheere-dheere alag ho jaata.
 */
function HtmlWidget({ props }) {
  return (
    <div className="wdg">
      {props.heading ? (
        <div className="wdg__h">
          {/*
           * Icon widget ke apne props se (D-88 §10, client) — shared `ICONS` me se. `none` ya
           * koi anjaan value pe `Icon` khud `null` lauta deta hai, to yahan koi check nahi.
           */}
          <Icon name={props.icon} size={14} strokeWidth={2.4} />
          {props.heading}
        </div>
      ) : null}
      <div className="wdg__b" dangerouslySetInnerHTML={{ __html: props.html }} />
    </div>
  )
}

/**
 * @param {object} props
 * @param {import('react').ReactNode} [props.before]
 *   Widgets se **pehle** aane wala hissa — blog post ka `On this post` (spec 008).
 *
 *   ⚠️ TOC ek widget **nahi** hai: wo `blogSettings.showToc` ke ek checkbox pe hai (client,
 *   9 Sep) aur post ke apne heading se banti hai, sidebar ke chunav se nahi. Use widget banane
 *   ka matlab hota do control — checkbox **aur** list me hona — aur do me se ek hi yaad rehta.
 *
 *   Isliye wo yahan se **andar** aati hai, taaki usi sticky column me rahe. Bahar rakhne ka
 *   matlab hota ki wo `.pgl__side` ke bahar ek teesra column ban jaaye.
 */
export default function Sidebar({ widgets = [], settings, sourcePath, before = null }) {
  /**
   * Khaali sidebar ka matlab hai ki `<aside>` render hi na ho — warna grid me ek khaali column
   * bacha rehta aur content bina wajah tang dikhta (D-30).
   *
   * ⚠️ `before` bhi ginti me aata hai: TOC on ho par named sidebar khaali/na chuni ho, tab bhi
   * column banna chahiye — warna client ka on kiya hua TOC chup-chaap gayab ho jaata.
   */
  if (!widgets.length && !before) return null

  return (
    /*
     * ⚠️ **`StickySide`, saada `<aside>` nahi** — client, 8 Sep: sidebar content ke saath scroll
     * ho aur end pe ruk jaaye, jaise itinerary page pe hota hai.
     *
     * Saada `position: sticky` yahan kaam nahi karta: column screen se lambi ho jaati hai (form
     * ke saath ho hi jaati hai) aur uska neeche wala hissa kabhi dikhta hi nahi — user upar hi
     * atka rehta hai. `StickySide` scroll ki disha ke saath `top` khiskata hai, isliye poori
     * column pahunch me aa jaati hai. Reference me iske liye ek script hai; ye wahi kaam hai.
     *
     * Wo khud `<aside className="pgl__side">` deta hai, isliye yahan apna wrapper nahi hai.
     * 1024px se neeche wo `top` ko haath bhi nahi lagata (wahan CSS use `static` kar deti hai).
     */
    <StickySide>
      {before}
      {widgets.map((widget) => {
        switch (widget.type) {
          case 'html':
            return <HtmlWidget key={widget.id} props={widget.props} />

          /**
           * Poora content derive hota hai — phone/whatsapp `settings` se, email chune hue form
           * se. Ek bhi contact na ho to `Planner` khud `null` lauta deta hai (D-30), aur wo rok
           * wahin rehni chahiye — ek hi niyam do jagah nahi.
           */
          case 'talkToPlanner':
            return (
              <Planner
                key={widget.id}
                settings={settings}
                email={widget.props.email}
                heading={widget.props.heading}
              />
            )

          /**
           * ⚠️ `.wdg--cta` ka wrapper `EnquiryForm` **khud** banata hai, yahan nahi — warna do
           * `.wdg` ek doosre ke andar aa jaate. Wahi form package page pe `variant="book"` pe
           * chalta hai (neela price header + mobile sheet); tour page pe wo dono hote hi nahi.
           */
          case 'enquiryForm':
            return (
              <EnquiryForm
                key={widget.id}
                form={widget.props.form}
                heading={widget.props.heading}
                description={widget.props.description}
                sourcePath={sourcePath}
                variant="cta"
              />
            )

          /**
           * `Topics` — categories aur unki ginti (spec 008).
           *
           * ⚠️ **Ginti poore blog ki hai, us page ke cards ki nahi** — aur wo galti nahi hai.
           * Reference me sidebar `9 · 6 · 11 · 8 · 5 · 4` (43) dikhata hai jabki grid pe
           * `9 articles` likha hai. Dono ko ek number pe zabardasti laana design ko todta.
           *
           */
          case 'topics':
            return (
              <div className="wdg" key={widget.id}>
                {widget.props.heading ? (
                  <div className="wdg__h">
                    <Icon name={widget.props.icon} size={14} strokeWidth={2.4} />
                    {widget.props.heading}
                  </div>
                ) : null}
                <div className="wdg__b">
                  {/*
                   * ⚠️ **Rows `<span>` hain, `<a>` nahi — aur wo jaan-boojh kar hai.**
                   *
                   * Category ka koi apna URL hai hi nahi: topic-wise page ek aur `blogPage`
                   * entry se banta hai, kisi magic route se nahi (spec 008). To is page pe
                   * un links ke paas jaane ki jagah hi nahi — `href="#"` ek aisa link hota
                   * jo click pe kuch na kare, aur wo us cheez se bura hai jo link lagti hi
                   * nahi (D-30, aur wahi rok jo adhoore button pe hai).
                   *
                   * ⚠️ Slice D2 me listing page pe yahi list `.bfilter` ki pills ke saath ek hi
                   * state padhegi — tab ye **filter ke control** ban jaayengi, tab bhi link
                   * nahi (client-side filter, koi navigation nahi).
                   */}
                  <ul className="cats">
                    {widget.props.topics.map((topic) => (
                      <li key={topic.id}>
                        <span>
                          {topic.name}
                          <span>{topic.count}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )

          /**
           * `Post picks` — reference ka `Most read` (`.pop`).
           *
           * ⚠️ **Ginti se kuch nahi banta** — is CMS me view counting hai hi nahi (spec 008).
           * Client khud chunta hai; heading bhi uski likhi hui hai. Trash me gaye ya unpublish
           * ho chuke post server pe hi gir chuke hote hain, isliye yahan koi check nahi.
           */
          case 'postPicks':
            return (
              <div className="wdg" key={widget.id}>
                {widget.props.heading ? (
                  <div className="wdg__h">
                    <Icon name={widget.props.icon} size={14} strokeWidth={2.4} />
                    {widget.props.heading}
                  </div>
                ) : null}
                <div className="wdg__b" style={{ paddingTop: 2 }}>
                  <div className="pop">
                    {widget.props.posts.map((post) => (
                      <a href={post.path} key={post.id}>
                        {/*
                         * ⚠️ `Img` **nahi** — `.pop img` ki nap fix hai (64×48) aur wo CSS se
                         * aati hai. `Img` `sizes`/`srcset` ke saath aata hai, jo 64px ke
                         * thumbnail pe fizool hai. Banner na ho to `<img>` banta hi nahi
                         * (D-42 §2 ka wahi invariant).
                         */}
                        {post.banner && (
                          <img src={post.banner.url} alt="" loading="lazy" width="64" height="48" />
                        )}
                        <span>
                          <b>{post.title}</b>
                          {/*
                           * ⚠️ Reference me yahan **date aur read time dono** hain —
                           * `5 Aug 2026 · 7 min read`. Pehle sirf read time tha.
                           *
                           * Jo tukda na ho wo apne separator ke saath gir jaata hai, taaki
                           * kabhi akela `·` na bache (D-30).
                           */}
                          <span>{popMeta(post)}</span>
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )

          /**
           * ⚠️ Anjaan type chup-chaap gir jaata hai — 500 nahi, khaali dabba nahi. Payload pe
           * bhi yahi niyam hai (`resolveSidebarWidgets`).
           */
          default:
            return null
        }
      })}
    </StickySide>
  )
}
