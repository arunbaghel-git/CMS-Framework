import { isEmptyHtml } from '@cms/shared'

import { RichTextDoc } from './RichText.jsx'

/**
 * Ek section ka heading + uske neeche ki lines — Q-9 (D-65), rich text D-69 me.
 *
 * Dono admin se aate hain (`packageDefaults.sectionLabels`). **Fallback yahan nahi hai** —
 * wo API ki public projection me lagta hai (`resolveSectionLabels()`), taaki "khaali chhoda"
 * aur "kabhi chhua hi nahi" ka farak ek hi jagah tay ho.
 *
 * ## Description ab HTML hai
 *
 * Client textarea me bold/heading/list nahi bana pa raha tha (D-69), to ab wahan wahi editor hai
 * jo Overview pe hai. D-80 me wo TipTap se TinyMCE ho gaya aur content **HTML** ban gaya —
 * isliye ab XSS ka bachav yahan nahi, **write pe** hai (`core/sanitize-html.js`).
 *
 * ⚠️ `isEmptyHtml()` zaroori hai, `html.length` **kaafi nahi**. Editor khol kar band karne se
 * wo `'<p></p>'` chhod jaata hai — wo "bhari hui" lagti hai par page pe usse ek khaali `<p>`
 * ke alawa kuch nahi banta, aur uska margin heading ke neeche ek bina wajah ka gap dikha deta.
 *
 * ⚠️ `.rt-sec` class `.rt` se alag hai: section ki description ke andar ke `h3`/`p` ka
 * spacing overview ke rich text se alag hai (wo page ka pehla content hai, ye ek heading ke
 * neeche ki line).
 */
/**
 * `suffix` heading ke **andar** chhapta hai, uske baad nahi.
 *
 * Aaj ek hi jagah lagta hai — reviews ka `— 4.9 average from 412 trips`, jo reference me
 * bhi `<h2>` ke andar ek `<span>` hai. Prop isliye hai ki us ek section ke liye poora
 * heading + description ka jodha dobara likhna padta, aur do jagah likhi hui ek cheez is
 * repo me hamesha ek din alag ho jaati hai (D-43 §2, D-65).
 */
export default function SectionHead({ label, suffix }) {
  const description = label?.description

  return (
    <>
      <h2>
        {label?.heading}
        {suffix}
      </h2>
      {!isEmptyHtml(description) && <RichTextDoc html={description} className="rt rt-sec" />}
    </>
  )
}
