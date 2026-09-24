import { Fragment } from 'react'

import Img from '../Img.jsx'
import CtaSection from '../package/CtaSection.jsx'
import { EnquiryDockProvider } from '../package/EnquiryDock.jsx'
import MobileBar from '../package/MobileBar.jsx'
import Blocks from '../tour/Blocks.jsx'
import Sidebar from '../tour/Sidebar.jsx'
import BlogSchema from './BlogSchema.jsx'
import PostCard, { categoryStyle } from './PostCard.jsx'
import PostNav from './PostNav.jsx'
import Toc from './Toc.jsx'

/**
 * Blog post ka template — `blog-detail-v1.html` (spec 008, Slice D).
 *
 * ```
 * .vhero      banner + breadcrumb + .ahead__cat + h1 + author/date/read time
 * .pgl        main + sidebar   (sidebar Settings ▸ Blog settings se, per-post nahi)
 *   .art      article ka body — blocks
 *   .share    chaar share link
 *   .authorbox
 *   .pn       previous / next
 *   .bpg      Related reading
 * .offer      CTA — settings se, package/tour wala hi component
 * .mobar      mobile ki patti; form popup usi se khulta hai
 * ```
 *
 * ## ⚠️ Yahan naya kya **nahi** bana
 *
 * | Cheez | Kahan se |
 * | --- | --- |
 * | Content ke blocks | `tour/Blocks.jsx` — post ke blocks (`richText` + `faqs`) wahin bane hue hain, aur `wrapTables()` bhi wahin hai (D-90) |
 * | Sidebar | `tour/Sidebar.jsx` — wahi widgets, wahi `StickySide` |
 * | Mobile pe form ka popup | `EnquiryDockProvider` + `MobileBar` — bilkul wahi jo tour aur itinerary pe hai (client, 9 Sep) |
 * | Aakhri CTA | `package/CtaSection.jsx`, `settings.ctaSection` se — **static**, tour/itinerary jaisa hi (client, 9 Sep) |
 *
 * Doosra `Blocks` ya doosra `Sidebar` likhne ka matlab hota ki client ki table ek page pe wrap
 * ho aur doosre pe nahi — theek wahi jo D-65/D-51/D-58 pe teen baar bachaya gaya.
 */

/** `Andaman Tourism team` → `AT`. Avatar ke liye koi field nahi — naam se hi banta hai. */
const initials = (name) =>
  String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

const longDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''

/**
 * Share ke chaar link — Facebook · X · WhatsApp · copy.
 *
 * ⚠️ **Inka koi backend nahi hai aur na hoga** (spec 008 ke "scope me kya NAHI hai"). Ye saade
 * `href` hain; koi count, koi API. `copy` wala bhi ek link hai jo isi page pe le jaata hai —
 * uske liye JS lagana matlab is poore page ko client component banana, jo ek icon ke liye
 * bahut mehngi keemat hai.
 */
const SHARE = [
  {
    key: 'facebook',
    label: 'Share on Facebook',
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    path: 'M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5H16.7V4.6c-.3 0-1.3-.13-2.45-.13-2.42 0-4.08 1.48-4.08 4.2v2.34H7.45V14h2.72v8z',
  },
  {
    key: 'x',
    label: 'Share on X',
    href: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    path: 'M17.5 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L4.7 21H1.5l7.5-8.6L1.2 3h6.6l4.5 5.6zm-1.1 16.1h1.8L7.7 4.8H5.8z',
  },
  {
    key: 'whatsapp',
    label: 'Share on WhatsApp',
    href: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    path: 'M17.5 14.4c-.3-.2-1.7-.9-2-1s-.5-.1-.7.2-.7 1-.9 1.2-.4.2-.7 0a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.3 14.3 0 0 0 5.5 4.8c2.6 1 2.6.7 3.1.6a3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z',
  },
]

function Share({ url, title }) {
  /**
   * ⚠️ Site ka pata configured na ho to share links **render hi nahi hote**. Relative path se
   * bane link Facebook pe `undefined/blog/x` bhejte — ek toota hua button us button se bura hai
   * jo hai hi nahi (D-30).
   */
  if (!url) return null

  return (
    <div className="share">
      <b>Share</b>
      {SHARE.map((item) => (
        <a
          key={item.key}
          href={item.href(url, title)}
          aria-label={item.label}
          rel="noopener noreferrer"
          target="_blank"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d={item.path} />
          </svg>
        </a>
      ))}
    </div>
  )
}

export default function PostPage({ entry, settings }) {
  const {
    banner,
    breadcrumbs = [],
    categories = [],
    author = {},
    sidebar,
    sidebarWidgets = [],
    related = [],
  } = entry

  /**
   * ⚠️ **TOC bhi column banane ki wajah hai.** Client ne sidebar chuni ho par usme widget na
   * hon, aur TOC on ho — us haalat me bhi column chahiye, warna uska on kiya hua TOC
   * chup-chaap gayab ho jaata (D-30 ka ulta: yahan cheez **hai**, dikhti nahi).
   */
  const hasSidebar =
    sidebar !== 'none' && (sidebarWidgets.length > 0 || (entry.toc ?? []).length > 0)

  /** `Published 12 Aug 2026 · 9 min read` — jo tukda na ho wo apne `·` ke saath gir jaata hai (D-30). */
  const bylineParts = [
    entry.publishedAt ? `Published ${longDate(entry.publishedAt)}` : null,
    entry.readMinutes > 0 ? `${entry.readMinutes} min read` : null,
  ].filter(Boolean)

  /**
   * ⚠️ **Har hissa apna `<span>`, beech me `.ahead__dot`** — reference jaisa (client, 14 Sep). Pehle
   * `' · '` se jodi hui ek line thi aur dot ke dono taraf sirf ek space aata tha. Page (`TextPage`)
   * pe yahi usi din hua.
   */
  const bylineItems = bylineParts.map((part, i) => (
    <Fragment key={part}>
      {i > 0 && <i className="ahead__dot" />}
      <span className="ahead__x">{part}</span>
    </Fragment>
  ))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? settings?.siteUrl
  const shareUrl = siteUrl ? `${siteUrl.replace(/\/$/, '')}${entry.path}` : null

  return (
    /**
     * `EnquiryDockProvider` — mobile pe form ek sheet ki tarah khulta hai, `.mobar` ke
     * **Get free quote** se (client, 9 Sep: _"mobile par form popup ban jayega, tour/itinerary
     * me hai"_). Bilkul wahi jodi jo `TourPage` pe hai; naya kuch nahi.
     */
    <EnquiryDockProvider>
      <BlogSchema entry={entry} settings={settings} />

      {/*
       * ⚠️ `<main className="tour">` — wo class page ko **tinted background** deti hai
       * (`--bg: #f4f7fa`), jo reference me hai aur hamari body me nahi. Ye 9 Sep ka pakda hua
       * kaanta hai: uske bina CTA ka safed band body ki safedi me ghul jaata hai aur uski jagah
       * "bekaar khaali jagah" jaisi dikhti hai.
       *
       * Naam `tour` hai aur ye blog page hai — wo tang lagta hai, par ek nayi class banane ka
       * matlab hota do class jo bilkul ek jaisa karti hain (D-86). Wo class ab "page ka tinted
       * shell" hai, "tour ka" nahi.
       */}
      <main className="tour">
        <section className="vhero">
          {banner && (
            <div className="vhero__bg">
              {/* Hero ki image LCP hai — `priority` uspe `fetchpriority="high"` lagata hai (D-84). */}
              <Img image={banner} alt="" sizes="100vw" priority />
            </div>
          )}

          <div className="wrap vhero__in">
            {/* `Home` static root hai — `resolveBreadcrumbs()` sirf parent chain deta hai (D-87 #12). */}
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
             * **Saari** categories ke badge, har ek apne rang me (client, 11 Sep, D-93). Rang na
             * chuna ho to hero ka apna neela — reference ka `.ahead__cat`.
             */}
            {categories.length > 0 && (
              <div className="ahead__cats">
                {categories.map((category) => (
                  <span key={category.id} className="ahead__cat" style={categoryStyle(category)}>
                    {category.name}
                  </span>
                ))}
              </div>
            )}

            {/*
             * `<h1>` post ka **title** hai — client, 11 Sep (D-93): _"heading will be title now no
             * need extra same heading same title"_. 10–11 Sep ke beech yahan `fields.heading` tha
             * aur `title` fallback; wo field post se hat gaya.
             */}
            <h1 className="ahead__t">{entry.title}</h1>

            {/*
             * ⚠️ **Hero me excerpt NAHI aata — client, 10 Sep, aur reference bhi wahi kehta hai.**
             *
             * `blog-detail-v1.html` ke hero me sirf teen cheezein hain: category ka badge, `<h1>`,
             * aur byline. `.ahead__d` ki CSS us file me maujood hai par **markup me kahin use
             * nahi hoti** — maine use dekh kar apni taraf se excerpt wahan jod diya tha.
             *
             * Aur wo galat bhi tha: excerpt **listing card ki line** hai aur SEO description ka
             * fallback — dono jagah wo chhota parichay hai. Article kholne ke baad usi text ko
             * dobara dikhana lead paragraph se takraata hai, jo content me pehle se hai.
             */}

            {/*
             * Byline — author `blogSettings` se, date `publishAt` se, read time derived.
             *
             * ⚠️ **Author khaali ho to uska poora hissa gir jaata hai**, "Unknown" nahi chhapta —
             * aur admin ka naam yahan kabhi pahunchta hi nahi (wo payload me hai hi nahi, R10).
             */}
            {/*
             * ⚠️ **Hero me author ka role nahi, uski jagah date · read time** — client, 11 Sep
             * (D-93): _"Andaman Tourism team ke niche aayege Published 12 Aug 2026 · 9 min read"_.
             * Reference me role (`Planners in Port Blair`) naam ke neeche tha aur date/read time
             * usi line me aage. Role author box me rehta hai (neeche).
             *
             * Author na ho to date · read time akele, heading ke neeche.
             */}
            <div className="ahead__m">
              {author.name ? (
                <span className="ahead__au">
                  <span className="ahead__av">{initials(author.name)}</span>
                  <span>
                    <b>{author.name}</b>
                    {bylineParts.length > 0 ? (
                      <span className="ahead__sub">{bylineItems}</span>
                    ) : null}
                  </span>
                </span>
              ) : (
                bylineItems
              )}
            </div>
          </div>
        </section>

        <section className="sec sec--blue">
          <div className="wrap">
            {/*
             * ⚠️ `.pgl--sideleft` ek **modifier** hai — `.pgl` package page pe bhi chalti hai
             * aur wahan sidebar right hai. Use seedha badalna us page ka layout tod deta
             * (D-87 §11 ka maloom kaanta).
             */}
            <div
              className={`pgl pgl--tour${!hasSidebar ? ' pgl--solo' : sidebar === 'left' ? ' pgl--sideleft' : ''}`}
            >
              <div className="pgl__main">
                {/* 1024px tak TOC yahan band patti me (client, 23 Sep) — sidebar wali tab chhupti hai. */}
                {hasSidebar && <Toc items={entry.toc} variant="bar" />}

                <article className="art">
                  {/*
                   * ⚠️ **Blocks `tour/Blocks.jsx` se** — post ke dono block (`richText`, `faqs`)
                   * wahin bane hue hain, aur `wrapTables()` bhi wahin hai (D-90). Doosra renderer
                   * likhne ka matlab hota ki client ki table ek page pe wrap ho aur doosre pe
                   * nahi.
                   *
                   * ⚠️ Heading ke `id` server pe lag chuke hote hain (`withHeadingIds()`), aur
                   * TOC ke link unhi pe jaate hain — dono ek hi pass se aate hain.
                   */}
                  <Blocks blocks={entry.blocks ?? []} article />

                  <Share url={shareUrl} title={entry.title} />

                  {/*
                   * Author box — `blogSettings.author` se poora. `bio` na ho to box render hi
                   * nahi hota: naam aur role hero me pehle se hain, to bina bio ke ye box wahi
                   * baat dobara kehta (D-30).
                   */}
                  {author.name && author.bio && (
                    <div className="authorbox">
                      <span className="authorbox__av">{initials(author.name)}</span>
                      <div>
                        <b>{author.name}</b>
                        {author.role ? <span>{author.role}</span> : null}
                        <p>{author.bio}</p>
                      </div>
                    </div>
                  )}
                </article>

                <PostNav prev={entry.prev} next={entry.next} />

                {related.length > 0 && (
                  <div style={{ marginTop: 'clamp(22px,2.8vw,34px)' }}>
                    <div className="sh">
                      <div>
                        <h2>Related reading</h2>
                        <p>The guides people open next</p>
                      </div>

                      {/*
                       * `All articles` — reference ka `.viewall` (client, 10 Sep).
                       *
                       * ⚠️ **Destination server se aata hai (`blogPath`), yahan hardcoded
                       * `/blog` nahi hai.** Listing page ek aam entry hai jise client ne banaya
                       * hai; uska slug kuch bhi ho sakta hai. Listing page abhi bana hi na ho to
                       * `blogPath` `null` hota hai aur ye link **render hi nahi hota** — ek
                       * link jo 404 pe le jaaye, us link se bura hai jo hai hi nahi (D-30).
                       */}
                      {entry.blogPath && (
                        <a className="viewall" href={entry.blogPath}>
                          All articles
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </a>
                      )}
                    </div>

                    {/*
                     * ⚠️ Related me **excerpt nahi** — reference me bhi wahi hai (`.bp__x` sirf
                     * listing grid pe). Chaar card ke saath excerpt column ko bahut lamba kar
                     * deta hai.
                     */}
                    <div className="bpg">
                      {related.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          author={settings?.blogAuthor?.name}
                          showExcerpt={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {hasSidebar && (
                <Sidebar
                  widgets={sidebarWidgets}
                  settings={settings}
                  sourcePath={entry.path}
                  before={<Toc items={entry.toc} />}
                  pinBefore={(entry.toc ?? []).length > 0}
                />
              )}
            </div>
          </div>
        </section>

        {/*
         * Aakhri CTA — `settings.ctaSection` se, **static** (client, 9 Sep: _"CTA section static
         * hi aayega setting se same as tour and itinerary"_).
         *
         * Wahi component jo package aur tour dono pe hai. D-67 ne ye case pehle hi soch liya tha:
         * design me is card ke box me daam tha, aur client ne wo raasta band kiya kyunki _"ye
         * card doosre pages pe bhi jaayega jahan koi package hai hi nahi"_. Blog post theek wahi
         * page hai.
         *
         * Khaali hone pe component khud `null` lauta deta hai, isliye yahan koi shart nahi.
         */}
        <CtaSection cta={settings?.ctaSection} />
      </main>

      {/*
       * Mobile ki patti — Call · WhatsApp · Get free quote. Teesra button sidebar ke enquiry form
       * ko **sheet** ki tarah kholta hai (client, 9 Sep).
       *
       * `hasForm` isi liye widgets se aata hai: form na ho to bar sirf Call/WhatsApp dikhati hai,
       * aur teenon na hon to `MobileBar` khud `null` lauta deta hai (D-30).
       */}
      <MobileBar
        settings={settings}
        hasForm={sidebarWidgets.some((w) => w.type === 'enquiryForm')}
      />
    </EnquiryDockProvider>
  )
}
