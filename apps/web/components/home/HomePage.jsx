import CustomHtml from '../CustomHtml.jsx'
import MobileBar from '../package/MobileBar.jsx'
import TourSchema from '../tour/TourSchema.jsx'
import AwardBadges from './AwardBadges.jsx'
import HeroForm from './HeroForm.jsx'
import HomeFaqs from './HomeFaqs.jsx'
import ImageCards from './ImageCards.jsx'
import InfoCards from './InfoCards.jsx'
import LogoGrid from './LogoGrid.jsx'
import OfferCards from './OfferCards.jsx'
import PackageGrid from './PackageGrid.jsx'
import Testimonials from './Testimonials.jsx'
import TextVideo from './TextVideo.jsx'
import VideoReviews from './VideoReviews.jsx'

/**
 * Home page — `home-nav-v3.html` (client, 15 Sep, D-96).
 *
 * Page **sections ki list** hai, aur kram client ka hai (admin me drag). Yahan koi tay dhaancha
 * nahi — jo section jahan rakha, wahi wahan chhapta hai. Header aur footer layout se aate hain
 * (Slice 0), is component se nahi.
 *
 * Section ek-ek karke ban rahe hain (client ke paas har ek ki detail abhi nahi hai). Naya section
 * = `SECTIONS` me ek row + uski apni file. ⚠️ Server pe bhi chaar jagah: `HOME_PAGE_BLOCK_TYPES`,
 * uska props schema, `sanitizeContent()` aur `resolveHomeSection()`.
 *
 * Anjaan type `null` — purana ya aage ka section page nahi todta (D-30).
 */
const SECTIONS = {
  heroForm: HeroForm,
  infoCards: InfoCards,
  imageCards: ImageCards,
  faqs: HomeFaqs,
  videoReviews: VideoReviews,
  testimonials: Testimonials,
  logoGrid: LogoGrid,
  packageGrid: PackageGrid,
  offerCards: OfferCards,
  textVideo: TextVideo,
  awardBadges: AwardBadges,
  customHtml: CustomHtml,
}

export default function HomePage({ entry, settings }) {
  return (
    <>
      <main className="home">
        {/*
         * Structured data — `TourSchema` hi (D-96 §12): home pe breadcrumb nahi banti (ek hi kadam), aur
         * saare `faqs` sections milaa kar **ek** `FAQPage` — wahi niyam jo Tour/Blog pe hai.
         */}
        <TourSchema entry={entry} />
        {(entry.blocks ?? []).map((block, i) => {
          const Section = SECTIONS[block.type]
          return Section ? (
            <Section key={block.id ?? i} props={block.props ?? {}} data={block.data ?? {}} />
          ) : null
        })}
      </main>

      {/*
       * Mobile ki neeche wali patti — Call · WhatsApp · Get free quote (client, 16 Sep).
       *
       * ⚠️ **Ye `<main>` ke bahar hai**, wahi jagah jo package page pe hai: patti poore viewport pe fixed
       * hai, kisi section ke andar nahi.
       *
       * ⚠️ `hasForm` nahi bheja ja raha — home pe CTA popup nahi, **link** hai (client). Uska pata
       * `Settings ▸ General ▸ Get quote link` se aata hai; khaali ho to sirf Call aur WhatsApp rehte hain.
       *
       * ⚠️ 760px se neeche `body` pe `padding-bottom: 70px` **pehle se** lagta hai — yaani home pe wo
       * jagah aaj bhi chhuti hai, bas patti nahi hai. Yahi is kaam ka sabse seedha suboot tha ki patti
       * chhoot gayi thi, jaan-boojh kar hatayi nahi gayi.
       */}
      <MobileBar settings={settings} />
    </>
  )
}
