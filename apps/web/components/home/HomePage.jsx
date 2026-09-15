import HeroForm from './HeroForm.jsx'
import InfoCards from './InfoCards.jsx'

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
}

export default function HomePage({ entry }) {
  return (
    <main className="home">
      {(entry.blocks ?? []).map((block, i) => {
        const Section = SECTIONS[block.type]
        return Section ? (
          <Section key={block.id ?? i} props={block.props ?? {}} data={block.data ?? {}} />
        ) : null
      })}
    </main>
  )
}
