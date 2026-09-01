import { isEmptyDoc } from '@cms/shared'

import { RichTextDoc } from './RichText.jsx'

/**
 * Ek section ka heading + uske neeche ki lines — Q-9 (D-65), rich text D-69 me.
 *
 * Dono admin se aate hain (`packageDefaults.sectionLabels`). **Fallback yahan nahi hai** —
 * wo API ki public projection me lagta hai (`resolveSectionLabels()`), taaki "khaali chhoda"
 * aur "kabhi chhua hi nahi" ka farak ek hi jagah tay ho.
 *
 * ## Description ab doc hai, string nahi
 *
 * Client textarea me bold/heading/list nahi bana pa raha tha (D-69), to ab wahan wahi TipTap
 * editor hai jo Overview pe hai. Yahan wo doc `RichTextDoc` se render hota hai — **HTML
 * kabhi parse nahi hoti**, renderer nodes se React elements banata hai. Isliye XSS filter
 * nahi karna padta; wo ban hi nahi sakta.
 *
 * ⚠️ `isEmptyDoc()` zaroori hai, `doc.content.length` **kaafi nahi**. Editor khol kar band
 * karne se TipTap `{content:[{type:'paragraph'}]}` chhod jaata hai — wo "bhari hui" lagti
 * hai par page pe usse ek khaali `<p>` ke alawa kuch nahi banta, aur uska margin heading ke
 * neeche ek bina wajah ka gap dikha deta.
 *
 * ⚠️ `.rt-sec` class `.rt` se alag hai: section ki description ke andar ke `h3`/`p` ka
 * spacing overview ke rich text se alag hai (wo page ka pehla content hai, ye ek heading ke
 * neeche ki line).
 */
export default function SectionHead({ label }) {
  const description = label?.description

  return (
    <>
      <h2>{label?.heading}</h2>
      {!isEmptyDoc(description) && <RichTextDoc doc={description} className="rt rt-sec" />}
    </>
  )
}
