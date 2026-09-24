import { Fragment } from 'react'

import Icon from '../Icon.jsx'
import Img from '../Img.jsx'
import CtaSection from '../package/CtaSection.jsx'
import { EnquiryDockProvider } from '../package/EnquiryDock.jsx'
import MobileBar from '../package/MobileBar.jsx'
import Blocks, { BlocksScope } from './Blocks.jsx'
import HeroButtons from './HeroButtons.jsx'
import Sidebar from './Sidebar.jsx'
import StatRail from './StatRail.jsx'
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
 * ⚠️ **`tourPage` aur `blogPage` yahi component use karte hain — `page` 14 Sep se NAHI** (D-95).
 * Page ka apna reference hai (`page-template-text.html`) aur apna component (`page/TextPage.jsx`):
 * uska content article jaisa hai, TOC hai, h1 Title hai, aur hero button page ka apna. Yahan
 * `type === 'page'` ki shartein bhar dena wahi bikhraav hota jise D-09 ne mana kiya tha.
 */

export default function TourPage({ entry, settings }) {
  const { fields = {}, banner, breadcrumbs = [], sidebar, sidebarWidgets = [] } = entry

  /**
   * Sidebar tabhi hai jab page ne use maanga ho **aur** usme kuch ho.
   *
   * ⚠️ Dono shart chahiye: `sidebar: 'right'` ho par sidebar khaali/deleted ho to grid me ek
   * khaali column bacha rehta aur content bina wajah tang dikhta.
   */
  const hasSidebar = sidebar !== 'none' && sidebarWidgets.length > 0

  /**
   * Hero ke button aur trust badges **sirf Tour page pe** (client, 10 Sep).
   *
   * ⚠️ `page` pe bhi nahi — wo bhi `Tour settings` ki cheezein hain, aur ek About Us page pe
   * _"Get my itinerary & price"_ ka koi matlab nahi banta.
   */
  const isTour = entry.type === 'tourPage'

  return (
    /**
     * ⚠️ Provider yahan bhi hai — `EnquiryForm` `useEnquiryDock()` padhta hai. Wo bina provider
     * ke `null` deta hai (throw nahi), par mobile pe sheet kholne ka koi raasta na hona aur
     * provider ka na hona do alag baatein hain. Yahan wo hai, aur `variant="cta"` uska vyavhaar
     * khud band rakhta hai.
     */
    <EnquiryDockProvider>
      <TourSchema entry={entry} settings={settings} />

      {/*
       * ⚠️ **`<main className="tour">` 9 Sep me juda, aur uske bina do cheezein toot rahi thin —
       * dono ki jad ek hi thi: page ka background.**
       *
       * Reference ka `body` tinted hai (`--bg: #f4f7fa`), hamara **safed** (`--surface`).
       * Package page ye tint `.pkg` se leta hai; tour page ke paas aisa koi wrapper tha hi nahi.
       * Nateeja:
       *
       * 1. `.vrail` ke aas-paas ki patti safed dikhti thi, design me wo tinted hai
       * 2. **FAQ ke neeche "bekaar jagah" lagti thi** — wo jagah bekaar thi hi nahi, wo CTA ka
       *    safed band tha. `.pkg__cta` ka background `--surface` (safed) hai, aur body bhi safed
       *    thi, to band **dikhta hi nahi tha** — sirf khaali jagah dikhti thi
       *
       * Isliye ilaaj `padding` kam karna nahi tha (wo design se milta hai), tint dena tha.
       *
       * `<main>` isliye bhi ki ye page pe tha hi nahi — package page pe `.pkg` `<main>` hai.
       * `MobileBar` iske **bahar** rehta hai: wo content nahi, viewport se chipki patti hai.
       */}
      <main className="tour">
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
                {/* Reference ka bhara hua star (`.vhero__eye svg`) — home ka hero bhi yahi hai. */}
                <Icon name="star" size={12} filled />
                {fields.eyebrow}
              </span>
            )}

            {/*
             * ⚠️ **`fields.heading` pehle, `title` fallback** — client, 9 Sep.
             *
             * `title` ab slug, breadcrumb, admin ki list, SEO aur schema ke liye hai; page pe
             * dikhne wala h1 apna alag field hai, taaki usme styling ho sake (design me
             * `₹11,499 pp` neela hai). Poora tark `schemas/page.js` ke `pageHeadingSchema` pe.
             *
             * Fallback **theme me** hai, payload me nahi: `title` waise bhi payload me hai, aur
             * dono jagah wahi text bhejne ka matlab hota ki ek din wo alag ho jaayein.
             */}
            {fields.heading ? (
              <h1 dangerouslySetInnerHTML={{ __html: fields.heading }} />
            ) : (
              <h1>{entry.title}</h1>
            )}

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
            {/*
             * ⚠️ **Hero ke button aur trust badges sirf `tourPage` pe — client, 10 Sep:**
             * _"hero me ye buttons kyu add kiye hai aur badges."_
             *
             * Dono `Settings ▸ Tour settings` ki cheezein hain (D-87 ke faisle #10/#11) aur wo
             * naam ittefaq nahi hai: _"Get my itinerary & price"_ ek **package** bechne wala
             * button hai, aur badges bhi package/tour ke bharose wali line hain.
             * `blog-v1.html` ke hero me dono hain hi nahi.
             *
             * ⚠️ **Type se gate kiya gaya hai, aur wo yahan sahi hai** — `byline` pe bhi 8 Sep
             * ko yahi hua tha. Ye **content** ka faisla hai ("is page pe ye cheez hai ya nahi"),
             * dhaanche ka nahi; dhaanche wala sawaal `LEADS` map se hal hota hai.
             *
             * ⚠️ Ek doosra on/off `Tour settings` me **nahi** banaya — client ne kabhi maanga
             * nahi, aur ek hi cheez ke do control wahi shakl bante jo D-86 me pakdi gayi thi.
             */}
            {isTour && <HeroButtons button={settings?.heroButton} whatsapp={settings?.whatsapp} />}

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
            {isTour && settings?.trustBadges?.length > 0 && (
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
        <StatRail stats={fields.statRail} />

        <section className="sec sec--blue">
          {/*
           * ⚠️ **Provider `.pgl` ke bahar hai, aur wo zaroori hai** — usme main column ka filter
           * bar (`PostList`) **aur** sidebar ka `Topics` dono aate hain. Sirf `.pgl__main` ko
           * lapetne ka matlab hota ki sidebar wale rows ko wo state milti hi nahi, aur client ek
           * taraf `Ferries` chun kar doosri taraf `All` chamakta dekhta.
           *
           * Kaunse page pe wo banega ye `BlocksScope` khud tay karta hai.
           */}
          <BlocksScope blocks={entry.blocks ?? []}>
            <div className="wrap">
              {/*
               * **Lead pass — jo hissa columns ke upar, poori chaudai pe jaata hai** (spec 008,
               * client 10 Sep: _"Start here ka section upar hai, ye side me kyu aa raha hai"_).
               *
               * ⚠️ **Yahan koi block ka naam likha hua nahi hai, aur wo jaan-boojh kar hai.**
               * Kaunsa block apna kya hissa upar bhejta hai wo `Blocks.jsx` ke `LEADS` map me hai.
               * `type === 'postList'` yahan likhne ka matlab hota page ka dhaancha block ke naam se
               * baandh dena — wahi hardcoding jise D-09 ne mana kiya tha.
               *
               * Jis page ke kisi block ka lead nahi hota (aaj har tour page), wahan ye kuch render
               * hi nahi karta — ek khaali div bhi nahi.
               */}
              <Blocks blocks={entry.blocks ?? []} slot="lead" />

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
                className={`pgl pgl--tour${!hasSidebar ? ' pgl--solo' : sidebar === 'left' ? ' pgl--sideleft' : ''}`}
              >
                <div className="pgl__main">
                  <Blocks blocks={entry.blocks ?? []} />
                </div>

                {hasSidebar && (
                  <Sidebar widgets={sidebarWidgets} settings={settings} sourcePath={entry.path} />
                )}
              </div>
            </div>
          </BlocksScope>
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
      </main>

      {/*
       * Mobile ki neeche wali patti — `tour-v3.html:2038` me wo maujood hai (Call · WhatsApp ·
       * Get free quote), bilkul `itinerary-v3.html` jaisi.
       *
       * ⚠️ **Maine 8 Sep ko likha tha ki "tour page pe koi `.mobar` hai hi nahi" — wo galat
       * tha.** Reference dekhe bina maan liya gaya tha, aur usi bharose sidebar ke mobile ka
       * poora niyam likh diya gaya. Ye us din ki teesri aisi galti hai (byline aur pklist ka
       * `.blk` bhi wahi thin).
       *
       * `hasForm` sidebar me enquiry form widget hone pe hi `true` hai — us bar ka button wahi
       * sheet kholta hai. Form na ho to bar sirf Call/WhatsApp dikhati hai, aur teenon na hon
       * to `MobileBar` khud `null` lauta deta hai (D-30).
       */}
      <MobileBar
        settings={settings}
        hasForm={sidebarWidgets.some((w) => w.type === 'enquiryForm')}
      />
    </EnquiryDockProvider>
  )
}
