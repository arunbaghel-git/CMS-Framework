/**
 * Ek section ka heading + uske neeche ki line — Q-9 (client, 31 Aug).
 *
 * Dono ab admin se aate hain (`packageDefaults.sectionLabels`). **Fallback yahan nahi
 * hai** — wo API ki public projection me lagta hai (`toSectionLabels()`), taaki "khaali
 * chhoda" aur "kabhi chhua hi nahi" ka farak ek hi jagah tay ho.
 *
 * Yahan sirf ek baat bachi hai: `description` khaali ho to `<p>` **banti hi nahi**. Khaali
 * `<p>` chhodne pe uska margin phir bhi lagta hai aur heading ke neeche ek bina wajah ka
 * gap dikhta hai.
 *
 * ⚠️ Text plain hai, HTML nahi (D-44 §8 · D-59) — admin se aayi HTML render karna stored
 * XSS ka seedha raasta hai. Line breaks `pre-line` se zinda rehti hain, wahi tark jo footer
 * ke text blocks pe laga tha.
 */
export default function SectionHead({ label }) {
  return (
    <>
      <h2>{label?.heading}</h2>
      {label?.description && <p style={{ whiteSpace: 'pre-line' }}>{label.description}</p>}
    </>
  )
}
