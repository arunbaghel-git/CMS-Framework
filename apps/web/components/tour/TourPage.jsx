import { Fragment } from 'react'

import Icon from '../Icon.jsx'
import Img from '../Img.jsx'
import { waHref } from '../../lib/links.js'
import CtaSection from '../package/CtaSection.jsx'
import { EnquiryDockProvider } from '../package/EnquiryDock.jsx'
import Blocks from './Blocks.jsx'
import Sidebar from './Sidebar.jsx'
import TourSchema from './TourSchema.jsx'

/**
 * Tour Page ka template — `tour-v3.html` (D-87 Slice D).
 *
 * Dhaancha reference ka hai:
 *
 * ```
 * .vhero        banner + breadcrumb + eyebrow + h1 + sub heading
 * .vrail        chaar stat cards, hero pe chadhe hue
 * .pgl          main + sidebar  (sidebar LEFT ya RIGHT — page ka apna faisla)
 *   .pgl__main  blocks, kram me
 *   .pgl__side  widgets (Appearance ▸ Sidebar se)
 * ```
 *
 * ⚠️ **`page` aur `tourPage` dono yahi component use karte hain.** Unka field set ek hi constant
 * hai (D-87 §1) aur payload bhi ek hi (`toPublicPage()`). Alag type sirf isliye hai ki menu, list
 * aur URL teenon alag maange gaye the — render me unme koi farak nahi.
 *
 * ⚠️ **`page` ki screens abhi bani nahi hain** (A-9), yaani aaj practically sirf `tourPage` yahan
 * aata hai. Ye component phir bhi type se nahi bandha gaya — jis din Pages ka kaam aayega, yahan
 * kuch nahi badlega.
 */

/** Hero ka eyebrow star — reference ka `.vhero__eye` ka icon. */
const Star = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2 9.2 8.6 2 9.2l5.5 4.7L5.8 21 12 17.3 18.2 21l-1.7-7.1L22 9.2l-7.2-.6z" />
  </svg>
)

/**
 * Byline — `author · updated · read time`.
 *
 * **Teenon hisse derive hote hain, ek bhi field nahi** (client ka faisla #9). Isiliye yahan koi
 * fallback text nahi hai: jo tukda na aaye wo gayab ho jaata hai, uski jagah "Unknown" nahi
 * chhapta (D-30).
 */
function Byline({ byline }) {
  const parts = [
    byline?.author || null,
    byline?.updatedAt
      ? `Updated ${new Date(byline.updatedAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      : null,
    byline?.readMinutes ? `${byline.readMinutes} min read` : null,
  ].filter(Boolean)

  if (!parts.length) return null

  return <p className="vbyline">{parts.join(' · ')}</p>
}

export default function TourPage({ entry, settings }) {
  const { fields = {}, byline, banner, breadcrumbs = [], sidebar, sidebarWidgets = [] } = entry

  /**
   * Sidebar tabhi hai jab page ne use maanga ho **aur** usme kuch ho.
   *
   * ⚠️ Dono shart chahiye: `sidebar: 'right'` ho par sidebar khaali/deleted ho to grid me ek
   * khaali column bacha rehta aur content bina wajah tang dikhta.
   */
  const hasSidebar = sidebar !== 'none' && sidebarWidgets.length > 0

  return (
    /**
     * ⚠️ Provider yahan bhi hai — `EnquiryForm` `useEnquiryDock()` padhta hai. Wo bina provider
     * ke `null` deta hai (throw nahi), par mobile pe sheet kholne ka koi raasta na hona aur
     * provider ka na hona do alag baatein hain. Yahan wo hai, aur `variant="cta"` uska vyavhaar
     * khud band rakhta hai.
     */
    <EnquiryDockProvider>
      <TourSchema entry={entry} settings={settings} />

      <section className="vhero">
        {banner && (
          <div className="vhero__bg">
            {/*
             * Hero ki image LCP hai — `priority` uspe `fetchpriority="high"` lagata hai (D-84).
             * `sizes` `100vw` hai kyunki ye poori chaudai ka background hai.
             */}
            <Img image={banner} alt="" sizes="100vw" priority />
          </div>
        )}

        <div className="wrap vhero__in">
          {/*
           * ⚠️ **`Home` hamesha, aur wo `breadcrumbs` me se nahi aata.**
           *
           * `resolveBreadcrumbs()` sirf **parent chain** deta hai (D-87 faisla #12). Is page ka
           * koi parent nahi hai, to wo chain khaali hai — aur pehle main poori nav ko usi pe
           * gate kar raha tha, isliye breadcrumb **dikhta hi nahi tha**. Design me wahan
           * `Home › <page>` hai.
           *
           * `Home` ek static root hai, `/` pe — bilkul wahi jo `PackagePage.jsx:370` pe pehle se
           * hai. Use payload me bhejne ka koi matlab nahi: wo har site pe wahi hai.
           *
           * ⚠️ Aakhri kadam **poora title** hai. Design me wahan chhota text hai
           * (`Andaman Tour Packages`), par per-page breadcrumb label **client ne hataya tha**
           * (faisla #12) — wo parent se auto banta hai. Chhota label chahiye to wo ek naya field
           * hoga, aur wo faisla palatna padega.
           */}
          <nav className="vcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            {/* ⚠️ Server `{ name, path }` bhejta hai — `label` nahi (`resolveBreadcrumbs`) */}
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path ?? i}>
                <i>›</i>
                <a href={crumb.path}>{crumb.name}</a>
              </span>
            ))}
            <i>›</i>
            <b>{entry.title}</b>
          </nav>

          {fields.eyebrow && (
            <span className="vhero__eye">
              <Star />
              {fields.eyebrow}
            </span>
          )}

          <h1>{entry.title}</h1>

          {/* Sub heading ek asli editor hai (faisla #3), isliye HTML — safai write pe ho chuki */}
          {fields.subheading && (
            <div className="vhero__sub" dangerouslySetInnerHTML={{ __html: fields.subheading }} />
          )}

          {/*
           * Hero ke do button — `.vhero__cta` (client, 8 Sep).
           *
           * ⚠️ **Do alag source, aur wo client ka faisla hai:** _"only Get my itinerary & price
           * in tour settings, whatsapp to settings ke general se utha lega."_
           *
           * | Button | Kahan se |
           * | --- | --- |
           * | Pehla | `Tour ▸ Tour settings ▸ Hero button` (label + link) |
           * | WhatsApp | `Settings ▸ General` ka number — koi alag field nahi |
           *
           * Isiliye WhatsApp ka **label** yahan likha hai. Wo ek hi shabd hai, har site pe wahi,
           * aur uske liye ek field maangna client se wo cheez poochhna hota jo uski nahi hai —
           * wahi tark jo `Planner` ke "Chat with us" pe aur `bestFor` ke "Best for" pe hai.
           *
           * Dono me se koi bhi na ho to uska button render hi nahi hota (D-30); dono na hon to
           * poori patti gayab.
           */}
          {(settings?.heroButton || settings?.whatsapp) && (
            <div className="vhero__cta">
              {/*
               * ⚠️ **`.btn--accent`, reference ka `.b-o` nahi.** Hamare paas `.b`/`.b-o` hain hi
               * nahi (ye `09-OPEN-ITEMS` me Slice D ke maloom kaanton me likha tha), aur
               * `.btn--accent` **bilkul wahi** hai — wahi `--orange-500`, wahi `box-shadow`.
               * Nayi class banane ka matlab hota ek hi button ke do naam.
               */}
              {settings.heroButton && (
                <a className="btn btn--accent" href={settings.heroButton.url}>
                  {settings.heroButton.label}
                </a>
              )}

              {settings.whatsapp && (
                <a
                  className="btn btn--whatsapp"
                  href={waHref(settings.whatsapp)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon name="chat" size={17} />
                  WhatsApp us
                </a>
              )}
            </div>
          )}

          {/*
           * Trust badges — `Settings ▸ Tour settings` se (client ka faisla #11).
           *
           * ⚠️ **Ye 8 Sep tak kahin render hote hi nahi the.** Schema, admin screen aur public
           * payload teenon Slice C me ban gaye the, par theme me inhe padhne wala koi nahi tha —
           * yaani client jo bharta tha wo kabhi dikhta hi nahi. Client ne khud ye pakda.
           *
           * Wahi shakl jo D-82 me `seoSchema` pe thi (feature bana kar rakha gaya aur teen din
           * chala hi nahi) aur D-65 me `cancellationText` pe (payload me field chhoot gaya tha).
           *
           * ⚠️ **Page ke payload me ye nahi hain, `settings` me hain** — hero package page pe bhi
           * hai, aur dono jagah bhejne ka matlab hota ek hi cheez do jagah. Khaali text wale
           * badge server pe hi chhan chuke hote hain.
           *
           * `<b>` ek separator dot hai, text nahi — reference me bhi wahi hai, aur wo aakhri
           * badge ke baad nahi aata.
           */}
          {settings?.trustBadges?.length > 0 && (
            <div className="vhero__trust">
              {settings.trustBadges.map((badge, i) => (
                <Fragment key={badge.id ?? i}>
                  {i > 0 && <b />}
                  <span>
                    <Icon name={badge.icon} size={13} strokeWidth={2.6} />
                    {badge.text}
                  </span>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </section>

      {/*
       * Stat rail — hero pe chadhi hui. Khaali `value` wale cards server pe hi gir chuke hote
       * hain (D-30), isliye yahan sirf ginti dekhi jaati hai.
       */}
      {fields.statRail?.length > 0 && (
        <div className="wrap vrail">
          <div className="vrail__in">
            {fields.statRail.map((stat, i) => (
              <div className={`vrail__c${stat.highlight ? ' vrail__c--p' : ''}`} key={stat.id ?? i}>
                <b>
                  {stat.value}
                  {stat.suffix ? <i>{stat.suffix}</i> : null}
                </b>
                {stat.label ? <span>{stat.label}</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="sec sec--blue">
        <div className="wrap">
          {/*
           * ⚠️ **`.pgl--sideleft` ek modifier hai, `.pgl` badla nahi gaya.**
           *
           * `.pgl` package detail page pe bhi chalti hai aur wahan sidebar **right** hai. Uska
           * `grid-template-columns` seedha badalne ka matlab hota us page ka layout tod dena —
           * ye Slice D ka pehle se likha hua maloom kaanta tha.
           */}
          {/*
           * ⚠️ `pgl--tour` **hamesha** lagti hai, `pgl--sideleft` sirf left pe.
           *
           * Wo mobile ke ek rule ke liye chahiye: package page pe `.pgl__side` ke widgets
           * chhup jaate hain (unke contact `.mobar` me chale jaate hain), par tour page pe koi
           * `.mobar` hai hi nahi — wahan chhupane ka matlab hota poori sidebar gayab, form samet.
           */}
          <div
            className={`pgl pgl--tour${sidebar === 'left' && hasSidebar ? ' pgl--sideleft' : ''}`}
          >
            <div className="pgl__main">
              {/*
               * ⚠️ **Byline sirf `page` pe, `tourPage` pe nahi — client ne 8 Sep ko pakda.**
               *
               * Maine ise D-87 ke faisle #9 ("byline poori tarah automatic") ke bharose har page
               * pe laga diya tha. Par wo faisla ye batata hai ki byline ka **data kahan se aata
               * hai**, ye nahi ki wo **kis page pe dikhta hai**.
               *
               * Reference dekhne pe saaf hua: `tour-v3.html` me byline **hai hi nahi** (0
               * matches), aur `itinerary-v3.html` me bhi nahi. Wo sirf `page-template-text.html`
               * me hai — yaani wo ek **article** page ki cheez hai, listing page ki nahi.
               *
               * ⚠️ Payload me `byline` phir bhi jaata hai aur uske tests bhi hain — wo galat nahi
               * tha. Sirf uski jagah galat thi.
               */}
              {entry.type === 'page' && <Byline byline={byline} />}

              <Blocks blocks={entry.blocks ?? []} />
            </div>

            {hasSidebar && (
              <Sidebar widgets={sidebarWidgets} settings={settings} sourcePath={entry.path} />
            )}
          </div>
        </div>
      </section>

      {/*
       * Page ka aakhri CTA card — `settings.ctaSection` se (D-67), package page wala **wahi**
       * component.
       *
       * ⚠️ **Naya kuch nahi bana, aur wo ittefaq nahi hai — client ne ye case D-67 me hi soch
       * liya tha.** Design me is card ke box me daam aur category thi (`js-px`/`js-cat-name`);
       * client ne wo raasta band kiya kyunki _"ye card doosre pages pe bhi jaayega jahan koi
       * package hai hi nahi"_. Wo doosra page yahi hai. Isliye hamara component tour ke design
       * se **bilkul** milta hai — `tour-v3.html:1913` ke `.offer` me bhi daam nahi hai.
       *
       * ⚠️ **Yahan `hasCtaSection()` ka guard nahi hai, aur wo package page se farak hai.**
       * Wahan wo padding ke liye chahiye tha (`.pkg--cta`), kyunki CTA `.pkg` ke **andar**
       * baithti hai aur uski apni bottom padding neeche neela strip chhod deti thi. Yahan CTA
       * `.sec--blue` ke **bahar** ek alag band hai — do bands apni-apni padding rakhte hain,
       * theek jaise reference me `sec--blue` ke baad `sec--white` aata hai.
       *
       * Component khud khaali hone pe `null` lauta deta hai (client ne section off kiya ho, ya
       * usme kuch bhara hi na ho), isliye yahan koi shart likhne ki zaroorat nahi.
       *
       * ⚠️ Ye section **global** hai — `Settings ▸ CTA Section` badalne pe package page pe bhi
       * badlega. Client ka yahi faisla hai (_"dusre pages par bhi use hoga"_), aur isi liye
       * Tour settings me iska doosra on/off **jaan-boojh kar nahi** banaya: ek hi cheez ke do
       * control wahi shakl bante jo D-86 me pakdi gayi thi.
       */}
      <CtaSection cta={settings?.ctaSection} />
    </EnquiryDockProvider>
  )
}
