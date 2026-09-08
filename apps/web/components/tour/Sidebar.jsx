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

export default function Sidebar({ widgets = [], settings, sourcePath }) {
  /**
   * Khaali sidebar ka matlab hai ki `<aside>` render hi na ho — warna grid me ek khaali column
   * bacha rehta aur content bina wajah tang dikhta (D-30).
   */
  if (!widgets.length) return null

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
