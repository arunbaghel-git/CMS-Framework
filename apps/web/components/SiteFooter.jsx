import { SOCIAL_KEYS } from '@cms/shared'

import { getSettings } from '../lib/cms.js'
import { linkifyParts } from '../lib/linkify.js'
import FooterColumn from './FooterColumn.jsx'
import Icon from './Icon.jsx'
import Img from './Img.jsx'
import SocialIcon from './SocialIcon.jsx'

/**
 * Public footer — D-27 (Slice 0), **D-44** ke naye structure pe.
 *
 * **Ek hi request se banta hai.** Pehle har footer column ek alag theme location tha aur
 * yahan 4 alag `getMenu()` calls hoti thin. Ab poora footer `/api/public/settings` ke
 * payload me aata hai (`footerColumns`) — text blocks aur menu items dono resolve ho kar.
 * Wajah D-44 me hai: ek column me text aur menu **dono** ho sakte hain, to unhe do
 * request me todne ka matlab hota theme me unhe wapas jodna.
 *
 * **Yahan koi filter nahi hai.** `type` (menu/text/both) ka faisla, adhoore blocks ki
 * chhantai aur khaali columns hatana — teenon API me ho chuke hote hain. Theme ko jo mila
 * hai wo render karna hai, ye tay nahi karna ki kya render hona chahiye tha.
 *
 * **Logo `footerLogo` se aata hai, `logo` se nahi.** Fallback bhi API me hai (D-44 §4):
 * footer ka apna logo na ho to wahan se header wala aa jaata hai. D-42 §2 waise ka waisa
 * hai — dono na hon to `null` aata hai aur yahan kuch render nahi hota.
 */

/**
 * Ye column mobile pe collapse hoga ya nahi.
 *
 * Shart **content se** nikalti hai, kisi `type` field se nahi — aur wo jaan-boojh kar
 * hai. Public payload me `type` jaata hi nahi (D-44): theme ko ye pata hona chahiye ki
 * uske paas **kya hai**, ye nahi ki admin ne dropdown me kya chuna tha. Nateeja waisa hi
 * hai — "Menu only" column me text blocks hote hi nahi — par ek adhoora "Text + Menu"
 * column (jisme abhi tak koi text block nahi bhara) bhi theek se handle ho jaata hai.
 *
 * Heading zaroori hai kyunki **heading hi toggle hai**. Bina heading ke koi aisi cheez
 * bachti hi nahi jispe tap kiya ja sake.
 */
const isCollapsible = (column) =>
  Boolean(column.heading) && column.textBlocks.length === 0 && column.menu?.items?.length > 0

/** Copyright me `{year}` theme replace karta hai — client ko har 1 January edit na karni pade. */
function withYear(text) {
  return (text ?? '').replaceAll('{year}', String(new Date().getFullYear()))
}

const SOCIAL_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X',
}

/**
 * Ek text block — icon + label + text.
 *
 * `text` me line breaks **stored data** hain (D-44), isliye `white-space: pre-line` se
 * preserve hote hain. `dangerouslySetInnerHTML` yahan bilkul nahi: ye field plain text
 * hai, aur usme HTML chalane ka matlab hota admin panel se stored XSS ka raasta khol
 * dena.
 *
 * **Phone aur email render ke waqt clickable ban jaate hain** (`linkifyParts`) — data me
 * kuch store nahi hota aur client ko koi naya field nahi bharna padta. Phone sirf tab
 * pakda jaata hai jab block ka icon `phone` ho; bina us shart ke pincode aur ghar ke
 * number `tel:` link ban jaate. Poora tark `lib/linkify.js` me hai.
 */
function TextBlock({ block }) {
  const parts = linkifyParts(block.text, { phone: block.icon === 'phone' })

  return (
    <div className="ft__sup">
      <Icon name={block.icon} size={15} strokeWidth={2} />
      <div>
        {block.label && <b>{block.label}</b>}

        {parts.length > 0 && (
          <span className="ft__sup-value">
            {parts.map((part, i) =>
              part.href ? (
                <a key={i} href={part.href}>
                  {part.text}
                </a>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Footer ka logo.
 *
 * `null` pe **kuch bhi render nahi hota** — D-42 §2 ka wahi invariant jo header pe hai.
 * Fallback (footer logo na ho to header wala) API me ho chuka hota hai (D-44 §4), isliye
 * yahan koi doosra choice nahi hai.
 */
function Brand({ logo, siteName }) {
  if (!logo) return null

  return (
    <a className="ft__brand" href="/" aria-label="Home">
      {/* Footer page ke bilkul neeche hai — yahan lazy hi sahi hai */}
      <Img image={logo} alt={siteName || ''} sizes="200px" />
    </a>
  )
}

export default async function SiteFooter() {
  const settings = await getSettings()

  const columns = settings?.footerColumns ?? []
  /**
   * Order **`SOCIAL_KEYS` se** aata hai, `Object.entries()` se nahi.
   *
   * `Object.entries` Mongo document ki key order pe chalta hai — yaani ek din koi
   * migration ya manual edit us order ko chup-chaap badal deta, aur footer ke icons
   * bina kisi code change ke reshuffle ho jaate.
   */
  const social = SOCIAL_KEYS.map((key) => [key, settings?.social?.[key]]).filter(([, url]) => url)
  const copyright = withYear(settings?.footerCopyright)
  const note = settings?.footerNote
  const disclaimer = settings?.footerDisclaimer
  const logo = settings?.footerLogo

  const hasBar = social.length > 0 || copyright || note

  if (columns.length === 0 && !hasBar && !disclaimer && !logo) return null

  return (
    <footer className="ft">
      <div className="wrap">
        {(columns.length > 0 || logo) && (
          <div className="ft__g">
            {/*
              Column ek bhi na ho par logo ho — tab logo akela ek column ki tarah baithta
              hai. Bina iske footer me logo gayab ho jaata sirf isliye ki columns 0 the.
            */}
            {columns.length === 0 && (
              <div className="ft__col">
                <Brand logo={logo} siteName={settings?.siteName} />
              </div>
            )}

            {columns.map((column, index) => (
              /*
                Column ki chaudai **structured field** se aati hai (`width`), kisi class ke
                naam se nahi (R18) — `FooterColumn` use `--span` me badalta hai.

                Heading bhi wahi component render karta hai, kyunki mobile pe heading hi
                accordion ka toggle hai.
              */
              <FooterColumn
                key={column.id}
                heading={column.heading}
                width={column.width}
                /*
                  Logo **pehle column ke andar, uske upar** — reference me wahi jagah hai.
                  Alag grid cell banane se wo ek poora column kha jaata aur client ke chune
                  hue column count se dikhne wali ginti alag ho jaati.

                  `children` me nahi, alag prop me: mobile pe column collapse hota hai aur
                  logo uske saath chhupna nahi chahiye.
                */
                brand={index === 0 ? <Brand logo={logo} siteName={settings?.siteName} /> : null}
                collapsible={isCollapsible(column)}
              >
                {column.textBlocks.map((block) => (
                  <TextBlock key={block.id} block={block} />
                ))}

                {column.menu?.items?.length > 0 && (
                  <ul>
                    {column.menu.items.map((item) => (
                      <li key={item.id}>
                        <a href={item.href ?? '#'} target={item.target} className={item.className}>
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </FooterColumn>
            ))}
          </div>
        )}

        {hasBar && (
          <div className="ft__bar">
            {/*
              Teen hisse: copyright baayen, note beech me, social daayen — `space-between`
              se. Khaali hisse render **nahi** hote: `space-between` bache hue hisson ko
              apne aap kinaron pe rakh deta hai, isliye placeholder ki zaroorat nahi.
            */}
            {copyright && <p className="ft__copy">{copyright}</p>}

            {note && <p className="ft__note">{note}</p>}

            {social.length > 0 && (
              <ul className="soc">
                {social.map(([key, url]) => (
                  <li key={key}>
                    <a
                      href={url}
                      rel="noopener noreferrer"
                      target="_blank"
                      aria-label={SOCIAL_LABELS[key] ?? key}
                    >
                      <SocialIcon name={key} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/*
          Fine print bar ke **neeche** hai, uske andar nahi — reference me wo poori
          chaudai leta hai aur uska rang bar se bhi halka hai. Bar ke andar daalne se wo
          social icons ke saath ek hi line me nichud jaata.
        */}
        {disclaimer && <p className="ft__fine">{disclaimer}</p>}
      </div>
    </footer>
  )
}
