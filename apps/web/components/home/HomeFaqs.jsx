import FaqAccordion from './FaqAccordion.jsx'
import SectionHead from './SectionHead.jsx'

/**
 * Home ka FAQ — reference ka `23. FAQ` (client, 15 Sep, D-96 §12).
 *
 * ⚠️ **Naya block type nahi** — yahi `faqs` block hai jo Tour/Page/Post pe chalta hai. Schema, HTML ki
 * safai, admin ka editor aur `FAQPage` structured data sab pehle se the; home ko sirf apna **background**
 * aur **section ka dhaancha** chahiye tha (heading center, list 860px beech me — reference jaisa).
 *
 * Accordion ka look `.faq` hi hai (package page wala, reference se hi) — koi nayi CSS nahi.
 */
export default function HomeFaqs({ props = {} }) {
  const { background, heading, description } = props
  const items = (props.items ?? []).filter((faq) => faq?.question)

  if (!items.length) return null

  return (
    <section className="hsec" style={background ? { '--hsec-bg': background } : undefined}>
      <div className="wrap">
        <SectionHead heading={heading} description={description} />
        <FaqAccordion items={items} />
      </div>
    </section>
  )
}
