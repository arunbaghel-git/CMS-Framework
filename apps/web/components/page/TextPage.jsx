import { Fragment } from 'react'

import Img from '../Img.jsx'
import Toc from '../blog/Toc.jsx'
import CtaSection from '../package/CtaSection.jsx'
import { EnquiryDockProvider } from '../package/EnquiryDock.jsx'
import MobileBar from '../package/MobileBar.jsx'
import Blocks from '../tour/Blocks.jsx'
import HeroButtons from '../tour/HeroButtons.jsx'
import Sidebar from '../tour/Sidebar.jsx'
import StatRail from '../tour/StatRail.jsx'
import TourSchema from '../tour/TourSchema.jsx'

/**
 * Saade page ka template — `page-template-text.html` (client, 14 Sep, D-95).
 *
 * ```
 * .vhero      banner + breadcrumb + h1 (Title) + sub heading + Updated · min read + buttons
 * .vrail      chaar stat cards
 * .pgl        main + sidebar  (sidebar LEFT/RIGHT/none — page ka apna faisla)
 *   .art      content — Text + FAQs blocks, article jaisa, par bina lead ke
 *   .pgl__side  On this page + widgets (Appearance ▸ Sidebar se)
 * .offer      CTA — settings se, static
 * .mobar      mobile ki patti; form popup usi se khulta hai
 * ```
 *
 * ## Reference se jo client ne hataya (14 Sep)
 *
 * | Reference me | Yahan |
 * | --- | --- |
 * | `Andaman beaches · updated for 2026` (eyebrow) | nahi |
 * | `Andaman Tourism team` / `Written in Port Blair` | nahi — byline me sirf `Updated Aug 2026 · 6 min read` |
 * | `<h1>` me `<em>` ka rang | nahi — h1 saada **Title** hai |
 * | `Quick facts` widget | nahi |
 * | `Get a free itinerary` ki `.ctastrip` | nahi |
 * | Pehla paragraph bada (`.lead`) | nahi — _"body font only no lead font"_ |
 *
 * ## ⚠️ `TourPage` kyun nahi
 *
 * 14 Sep tak `page` `TourPage` se hi render hota tha. Par is page ke paas paanch cheezein alag
 * hain — content article jaisa (callout/caption), TOC, h1 Title, apna hero button, aur byline hero
 * me. `TourPage` me paanch `type === 'page'` ki shartein wahi bikhraav hota jise D-09 ne mana
 * kiya tha — `PostPage` bhi isi wajah se alag hai.
 *
 * ## ⚠️ Naya kya **nahi** bana
 *
 * | Cheez | Kahan se |
 * | --- | --- |
 * | Blocks + callout/caption/table | `tour/Blocks.jsx` (`article`, `lead={false}`) |
 * | Sidebar + mobile popup + Planner ka chhupna | `tour/Sidebar.jsx` · `EnquiryDockProvider` · `MobileBar` · CSS |
 * | TOC | `blog/Toc.jsx` |
 * | Hero buttons · Stat rail | `tour/HeroButtons.jsx` · `tour/StatRail.jsx` |
 * | Schema | `tour/TourSchema.jsx` — Breadcrumb + FAQPage (client: _"abhi jaisa hai thik hai"_) |
 * | CTA | `package/CtaSection.jsx`, `settings.ctaSection` se |
 */

/**
 * `Updated Aug 2026` — **sirf mahina aur saal** (client, 14 Sep: _"20 aug ye nahi"_).
 *
 * Date **last edit** ki hai (`updatedAt`), publish ki nahi — reference ka shabd hi "Updated" hai.
 */
const monthYear = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''

/**
 * ⚠️ **Do template, ek component** (D-96 §31) — `fields.template`:
 *
 * | | `default` | `sections` |
 * | --- | --- | --- |
 * | Content | poora ek safed card me (`.art--page`) | har block apna card (`.secpg` sirf gap deta hai) |
 * | FAQs | saada h2/h3 (D-95) | **accordion** |
 * | Hero | Stat rail + Hero button + WhatsApp | teenon nahi |
 *
 * Client ne saaf kaha tha ki **purana page template chhedna nahi hai** — isliye `default` bilkul waisa hai
 * jaisa 14 Sep ko tha, aur naya bartaav is ek value pe khada hai. Alag component banane ka matlab hota
 * hero, breadcrumb, sidebar aur byline ka doosra copy, aur wahi galti is repo me kai baar mahengi padi hai.
 *
 * ⚠️ `On this page` aur hero button **payload me hi** gir jaate hain (`toPublicPage()`), isliye yahan unki
 * shart dobara nahi likhi — ek hi niyam do jagah likhna wahi jaal hai jo D-95 me pakda gaya tha.
 */
export default function TextPage({ entry, settings }) {
  const {
    fields = {},
    byline = {},
    banner,
    breadcrumbs = [],
    sidebar,
    sidebarWidgets = [],
    toc = [],
  } = entry

  /**
   * ⚠️ **TOC bhi column banane ki wajah hai** — `PostPage` wala hi niyam. Sidebar chuni ho par
   * usme widget na hon aur TOC on ho, tab bhi column chahiye, warna on kiya hua TOC chup-chaap
   * gayab ho jaata.
   */
  const hasSidebar = sidebar !== 'none' && (sidebarWidgets.length > 0 || toc.length > 0)

  /** Page ka frame — khaali ya anjaan value `default` hi maani jaati hai (server bhi wahi bhejta hai). */
  const sections = fields.template === 'sections'

  /**
   * `Updated Aug 2026 · 6 min read` — jo tukda na ho wo apne `·` ke saath gir jaata hai (D-30).
   *
   * ⚠️ **Author yahan nahi aata**, payload me hone ke bawajood — client ne `Andaman Tourism team`
   * hataya. `byline.author` Tour ke purane tests aur payload ka hissa hai; page use padhta nahi.
   */
  const bylineParts = [
    byline.updatedAt ? `Updated ${monthYear(byline.updatedAt)}` : null,
    byline.readMinutes > 0 ? `${byline.readMinutes} min read` : null,
  ].filter(Boolean)

  return (
    <EnquiryDockProvider>
      <TourSchema entry={entry} settings={settings} />

      {/* `.tour` — page ka tinted shell (poora tark `PostPage.jsx` me). */}
      <main className="tour">
        <section className="vhero">
          {/* Featured image, warna Pages ▸ Pages settings ki image — server tay karta hai (D-95 §12). */}
          {banner && (
            <div className="vhero__bg">
              <Img image={banner} alt="" sizes="100vw" priority />
            </div>
          )}

          <div className="wrap vhero__in">
            {/* `Home` static root; baaki parent chain se (D-87 #12) */}
            <nav className="vcrumb" aria-label="Breadcrumb">
              <a href="/">Home</a>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path ?? i}>
                  <i>›</i>
                  <a href={crumb.path}>{crumb.name}</a>
                </span>
              ))}
              <i>›</i>
              <b>{entry.title}</b>
            </nav>

            {/*
             * `<h1>` = **Title**, saada text (client, 14 Sep: _"heading design will be normal no
             * color change"_). Post jaisa hi (D-93) — koi `fields.heading`, koi `<em>` nahi.
             */}
            <h1>{entry.title}</h1>

            {fields.subheading && (
              <div className="vhero__sub" dangerouslySetInnerHTML={{ __html: fields.subheading }} />
            )}

            {/*
             * Sub heading ke **neeche** — reference ki jagah (client, 14 Sep).
             *
             * ⚠️ `.ahead__m`/`.ahead__x` — post ki hero byline ki hi class, jab author na ho. Wahi
             * safed rang, wahi naap; nayi class ka matlab hota ek hi line ke do naam.
             */}
            {/*
             * ⚠️ **Har hissa apna `<span>`, beech me `.ahead__dot`** — reference ki `.pbyline` jaisa
             * (client, 14 Sep). Pehle `' · '` se jodi hui ek hi line thi, to dot ke dono taraf sirf ek
             * space aata tha; ab `.ahead__m` ka flex `gap` barabar jagah deta hai.
             */}
            {/*
             * ⚠️ **Section layout pe byline nahi** (client, 16 Sep: _"contact page pe Updated · min read
             * nahi chahiye, wo pages ke liye hai"_). Bilkul theek — `contact-us.html` ke hero me wo hai hi
             * nahi; wo `page-template-text.html` (article jaisa page) ki cheez hai.
             */}
            {!sections && bylineParts.length > 0 && (
              <div className="ahead__m">
                {bylineParts.map((part, i) => (
                  <Fragment key={part}>
                    {i > 0 && <i className="ahead__dot" />}
                    <span className="ahead__x">{part}</span>
                  </Fragment>
                ))}
              </div>
            )}

            {/*
             * Button **page ka apna** (client: _"pages par specific rahega inside edit page"_).
             * WhatsApp **hamesha** (client, 14 Sep shaam) — number Settings ▸ General se; number na
             * ho to button nahi.
             */}
            {/*
             * ⚠️ Section Layout pe hero ke buttons **bilkul nahi** — na page ka apna, na WhatsApp wala
             * (client, 16 Sep). Uske field set me `heroButton` hai hi nahi, aur WhatsApp yahan apne aap
             * uthta tha (D-95 §12) — wahi cheez client ne mana ki.
             */}
            {sections ? null : (
              <HeroButtons button={fields.heroButton} whatsapp={settings?.whatsapp} />
            )}
          </div>
        </section>

        {sections ? null : <StatRail stats={fields.statRail} />}

        <section className="sec sec--blue">
          <div className="wrap">
            <div
              className={`pgl pgl--tour${sidebar === 'left' && hasSidebar ? ' pgl--sideleft' : ''}`}
            >
              <div className="pgl__main">
                {/* 1024px tak TOC yahan band patti me (client, 23 Sep) — sidebar wali tab chhupti hai. */}
                {hasSidebar && toc.length > 0 && (
                  <Toc items={toc} label="On this page" variant="bar" />
                )}

                {/*
                 * ⚠️ `art--page` — `.art` ka safed card aur article typography, par **bina hover
                 * ke** aur `<h2>` ke upar reference wali line ke saath (`.rte h2`). Blog ka `.art`
                 * hover client ne blog ke liye maanga tha (9 Sep); reference page ke `.blk` pe koi
                 * hover nahi hai.
                 */}
                <article className={sections ? 'secpg' : 'art art--page'}>
                  {/* `plainFaqs` — FAQ reference jaisa saada h2/h3/paragraph, accordion nahi (client, 14 Sep) */}
                  <Blocks
                    blocks={entry.blocks ?? []}
                    article={!sections}
                    lead={false}
                    plainFaqs={!sections}
                    path={entry.path}
                  />
                </article>
              </div>

              {hasSidebar && (
                <Sidebar
                  widgets={sidebarWidgets}
                  settings={settings}
                  sourcePath={entry.path}
                  before={toc.length ? <Toc items={toc} label="On this page" /> : null}
                  pinBefore={toc.length > 0}
                />
              )}
            </div>
          </div>
        </section>

        {/* Static — `Settings ▸ CTA Section` se, baaki pages jaisa (client, 14 Sep). */}
        <CtaSection cta={settings?.ctaSection} />
      </main>

      {/*
       * Mobile — form popup ban jaata hai aur `Talk to a planner` chhup jaata hai (client, 14 Sep).
       * Dono pehle se bane hain: `MobileBar` ka button sheet kholta hai, aur
       * `.pgl__side .wdg--planner` ka CSS rule Planner chhupata hai.
       */}
      <MobileBar
        settings={settings}
        hasForm={sidebarWidgets.some((w) => w.type === 'enquiryForm')}
      />
    </EnquiryDockProvider>
  )
}
