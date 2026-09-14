import { BlogFilterProvider } from '../blog/BlogFilter.jsx'
import PostList from '../blog/PostList.jsx'
import PostListLead from '../blog/PostListLead.jsx'
import { articleHtml, wrapTables } from '../../lib/article-html.js'
import PackageList from './PackageList.jsx'

/**
 * Page ke content blocks — D-87 §7 ka `content.blocks[]`, aur unka render (Slice D).
 *
 * ⚠️ **Har block apna poora section hai** — ek `.blk`, jisme uska apna heading, uski apni line
 * aur uska apna structure. Ye D-88 §9 me tay hua: pehle plan ye tha ki Text block ke baad aane
 * wale layout blocks usi section me "group" ho jaayein, par wo ek aisa jaadu banta jo admin me
 * dikhta hi nahi — client do panel banata aur page pe ek dabba milta.
 *
 * Ab har panel = ek `.blk`. Admin jo dikhata hai, page wahi deta hai.
 *
 * ⚠️ `.blk` pe `content-visibility: auto` hai (D-85) aur uske saath `contain: layout style
 * paint` bhi. Yaani `.blk` ke bahar nikalta hua koi hissa **kat jaayega** — koi tooltip ya
 * popover andar mat daalna.
 */

/**
 * Har block ka heading + uske neeche ki line.
 *
 * ⚠️ **Khaali `heading` par kuch nahi chhapta** — ye D-65 se ulta hai, aur jaan-boojh kar. Wahan
 * section theme ke apne hote the aur bina heading ke bemaani lagte, isliye fallback tha. Yahan
 * section **client ne khud banaya** hai; usne heading khaali chhoda hai to uska matlab hai
 * "heading nahi chahiye", galti nahi.
 *
 * Khaali `description` bhi poori tarah gayab — wahi jo D-65 me tha.
 */
function BlockHead({ heading, description }) {
  if (!heading && !description) return null

  return (
    <>
      {heading ? <h2>{heading}</h2> : null}
      {description ? (
        <div className="blk__intro" dangerouslySetInnerHTML={{ __html: description }} />
      ) : null}
    </>
  )
}

function RichTextBlock({ props, article, lead }) {
  if (!props.html) return null

  /**
   * ⚠️ **`article` sirf blog post pe true hota hai**, aur wo zaroori hai.
   *
   * `.lead`, `.callout` aur `figure.artfig` article ke design ka hissa hain
   * (`blog-detail-v1.html`). Inhe har `richText` block pe chala dena tour aur package pages ka
   * pehla paragraph bhi bada kar deta — ek badlaav jo kisi ne maanga hi nahi. `wrapTables()`
   * iske bahar hai kyunki table ka dhaancha har jagah sahi hona chahiye.
   *
   * ⚠️ Kram `articleHtml()` ke andar hai, yahan nahi — caption ka `.lead` ban jaana kram ka hi
   * bug tha (11 Sep), aur yahan likhe kram ka test ho hi nahi sakta tha.
   */
  /**
   * ⚠️ `lead` — `page` pe `false` (D-95): callout · caption · table sab, par bada pehla
   * paragraph nahi. Post pe default `true`.
   */
  const html = article ? articleHtml(props.html, { lead }) : wrapTables(props.html)

  return <div className="blk" dangerouslySetInnerHTML={{ __html: html }} />
}

function TwoColumnBlock({ props }) {
  const { heading, description, left, right, ratio, reverseOnMobile } = props

  if (!left && !right && !heading && !description) return null

  return (
    <section className="blk">
      <BlockHead heading={heading} description={description} />

      {/*
       * ⚠️ **`includedExcluded` pe poora dhaancha hi alag hai — `.inx`, `.twocol` nahi.**
       *
       * Aur uske liye ek bhi nayi CSS nahi likhni padi: `.inx`, `.inx__c`, `.inx__c.no` aur unke
       * `h3` ke rang **pehle se globals.css me hain** (2279–2307) — wo package page ke
       * "What's included" ke liye bane the. Yahan bas wahi wrapper laga diya.
       *
       * Ye D-88 §9 wali soch ka ulta bhi nahi hai: heading block ka apna hai, ye sirf uske andar
       * ka look hai.
       */}
      {props.style === 'includedExcluded' ? (
        <div className="inx">
          {/* Doosra khaana hamesha "not included" — wahi kram reference me hai */}
          <div className="inx__c" dangerouslySetInnerHTML={{ __html: wrapTables(left) }} />
          <div className="inx__c no" dangerouslySetInnerHTML={{ __html: wrapTables(right) }} />
        </div>
      ) : (
        /*
         * `ratio` ek class banti hai, inline style nahi — do wajah: reference me bhi wahi class
         * hai, aur inline grid CSS ko media query se mobile pe todna padta.
         */
        <div
          className={`twocol twocol--${ratio ?? '50-50'}${reverseOnMobile ? ' twocol--rev' : ''}`}
        >
          <div dangerouslySetInnerHTML={{ __html: wrapTables(left) }} />
          <div dangerouslySetInnerHTML={{ __html: wrapTables(right) }} />
        </div>
      )}
    </section>
  )
}

/**
 * Cards — reference ka `.dgrid` / `.dcard` (`tour-v3.html:1686`).
 *
 * ⚠️ Card ka `tag` (`Short break`, `Best for first-timers`) reference me `<em>` hai, aur wahi
 * rakha gaya — `admin-design-v3.html` me wo `Tag (optional)` hai. Ek `icon` enum banaya gaya
 * tha, wo mera andaza tha aur Slice A me hata diya gaya (design jeeta, R15).
 */
function CardsBlock({ props }) {
  const items = (props.items ?? []).filter((item) => item?.title || item?.text)

  if (!items.length) return null

  return (
    <section className="blk">
      <BlockHead heading={props.heading} description={props.description} />

      <div className="dgrid" style={{ '--dcols': props.columns ?? 3 }}>
        {items.map((item, i) => {
          const body = (
            <>
              {item.title ? <h3>{item.title}</h3> : null}
              {item.text ? <p dangerouslySetInnerHTML={{ __html: item.text }} /> : null}
              {item.tag ? <em>{item.tag}</em> : null}
            </>
          )

          /** `href` khaali ho to card ek saada dabba hai — khaali `<a>` kabhi nahi (D-30). */
          return item.href ? (
            <a className="dcard dcard--link" href={item.href} key={item.id ?? i}>
              {body}
            </a>
          ) : (
            <div className="dcard" key={item.id ?? i}>
              {body}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * FAQs — `<details>` se, koi JS nahi (D-59 wala hi rasta).
 *
 * ⚠️ `details`/`summary` sanitizer me D-87 ki jaanch me jode gaye the — wo pehle the hi nahi,
 * aur client editor me khud `<details>` likhta to wo write pe chup-chaap gayab hota.
 */
function FaqsBlock({ props }) {
  const items = (props.items ?? []).filter((faq) => faq?.question)

  if (!items.length) return null

  return (
    /**
     * `id` **server se** aati hai (`props.anchorId`) — blog post ki TOC ka link isi pe jaata
     * hai (client, 10 Sep). Do jagah slug banane ka matlab hota ki wo ek din alag ho jaayein;
     * wahi tark jo `withHeadingIds()` ke sar pe likha hai.
     *
     * Tour page pe ye `undefined` rehti hai (wahan TOC hai hi nahi) aur React attribute chhod
     * deta hai — koi khaali `id=""` nahi banta.
     *
     * `scrollMarginTop` `.art h2` wali hi wajah se hai: bina uske anchor pe jaate hi heading
     * sticky header ke peeche chali jaati hai.
     */
    <section className="blk" id={props.anchorId} style={{ scrollMarginTop: 96 }}>
      <BlockHead heading={props.heading} description={props.description} />

      {/*
       * ⚠️ **`faq--wide` — reference me tour ka FAQ apni chaudai khud khol deta hai.**
       *
       * `tour-v3.html:1803` me wo literally `<div class="faq" style="max-width:none;
       * margin-top:14px">` hai. Hamari `.faq` `max-width: 860px; margin-inline: auto` pe hai
       * (package page ke liye), aur uske bina yahan wo block ke andar sikud kar beech me aa
       * jaati thi — client ne yahi "style theek nahi hai" kaha.
       *
       * Modifier isliye, `.blk .faq` scope nahi: package page ka FAQ bhi `.blk` ke andar hai
       * (`PackagePage.jsx:729`) aur use badalne ki koi wajah nahi.
       */}
      <div className="faq faq--wide">
        {items.map((faq, i) => (
          /*
           * ⚠️ **Pehla FAQ khula rehta hai** — dono reference me `<details open>` sirf pehle pe
           * hai, aur package page bhi yahi karta hai (`PackagePage.jsx:734`). Client ne 8 Sep ko
           * pakda ki tour page pe wo band tha.
           */
          <details key={faq.id ?? i} open={i === 0}>
            <summary>{faq.question}</summary>
            <div dangerouslySetInnerHTML={{ __html: faq.answer ?? '' }} />
          </details>
        ))}
      </div>
    </section>
  )
}

const BLOCKS = {
  richText: RichTextBlock,
  twoColumn: TwoColumnBlock,
  cards: CardsBlock,
  packageList: PackageList,
  /**
   * ⚠️ **Naya list-type block jodo to yahan bhi jodo.** Chhoot jaane ka lakshan `500` nahi
   * hota — block admin me bhara hua rehta hai aur page pe **kuch nahi** aata. Yahi shakl
   * D-89 me 13 me se zyada tar farak ki thi.
   */
  postList: PostList,
  faqs: FaqsBlock,
}

/**
 * Wo hisse jo **columns ke upar, poori chaudai** pe jaate hain (spec 008, client 10 Sep).
 *
 * ⚠️ **Ye map isliye hai ki `TourPage` ko ye pata na ho ki blog kya hai.** Wahan
 * `type === 'postList'` likhna theek wahi hardcoding hoti jise D-09 ne mana kiya tha — page
 * ka dhaancha block ke naam se nahi bandhna chahiye.
 *
 * Jis block ka yahan koi entry nahi, uska lead pass me kuch render hi nahi hota.
 */
const LEADS = { postList: PostListLead }

/**
 * Jo blocks apni state doosri column ke saath baantte hain, unhe ek provider chahiye.
 *
 * ⚠️ **Ye faisla yahan hai, `TourPage` me nahi.** Wahan `type === 'postList'` likhne ka matlab
 * hota page ka dhaancha block ke naam se baandh dena (D-09) — wahi wajah jiske liye `LEADS`
 * map bana tha. `TourPage` sirf itna janta hai ki "in blocks ko ek scope chahiye ho sakta hai".
 *
 * Jis page pe aisa koi block nahi (aaj har tour aur package page), wahan **koi provider render
 * hi nahi hota** — ek khaali context bhi nahi.
 */
export function BlocksScope({ blocks = [], children }) {
  const needsFilter = blocks.some((block) => block?.type === 'postList')

  return needsFilter ? <BlogFilterProvider>{children}</BlogFilterProvider> : children
}

/**
 * @param {object} props
 * @param {'lead'|'main'} [props.slot]
 *   `lead` pass columns ke upar chalta hai, `main` unke andar. Ek hi `blocks` array dono baar
 *   aati hai — jo block us slot me kuch nahi deta wo chup-chaap gir jaata hai.
 */
export default function Blocks({ blocks = [], slot = 'main', article = false, lead = true }) {
  return blocks.map((block, i) => {
    const Block = slot === 'lead' ? LEADS[block.type] : BLOCKS[block.type]

    /**
     * ⚠️ Anjaan type chup-chaap gir jaata hai — 500 nahi, khaali dabba nahi.
     *
     * Aisa tab hota hai jab koi block type hata diya jaaye par purane pages me wo bacha ho.
     * Wahi niyam jo payload pe hai (`resolvePageBlocks`).
     */
    if (!Block) return null

    /**
     * `data` sirf `packageList` pe hota hai — wahi ek block hai jiske liye server query lagati
     * hai. Baaki ke liye ye `undefined` rehta hai aur wo use padhte hi nahi.
     */
    return (
      <Block
        key={block.id ?? i}
        props={block.props ?? {}}
        data={block.data}
        article={article}
        lead={lead}
      />
    )
  })
}
