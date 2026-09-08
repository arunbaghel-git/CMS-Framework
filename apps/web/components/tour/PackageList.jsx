'use client'

import { durationBucket } from '@cms/shared'
import { useState } from 'react'

import PackageCard from '../PackageCard.jsx'

/**
 * `Package list` block — reference ka `#pklist` (`tour-v3.html:1432`).
 *
 * ⚠️ **List ek chunav hai, filter nahi** (client, 8 Sep — D-88 §9 se pehle wala palat). Server
 * wahi packages bhejta hai jo client ne picker me chune, aur **usi kram me**. Yahan koi query
 * nahi hoti; ye component sirf pills se dikhna-chhupna karta hai.
 *
 * ## Client component sirf pills ke liye
 *
 * Cards server se poore bane hue aate hain (`toPackageCards()`). Ye file sirf itna tay karti hai
 * ki abhi kaunse dikh rahe hain — bilkul wahi lakeer jo `Similar` pe hai.
 *
 * ⚠️ **Facets server pe gine jaate hain, yahan nahi.** `2N / 3D [3]` wali ginti `limit` se
 * **pehle** hoti hai, warna wo jhoothi ho jaati (Slice B ka likha hua niyam).
 */

/** Design me `All` hamesha pehla pill hai aur shuru me `on` hota hai. */
const ALL = 'all'

export default function PackageList({ props, data }) {
  const [active, setActive] = useState(ALL)

  const cards = data?.cards ?? []
  const facets = data?.facets ?? []

  /**
   * Kuch chuna hi na gaya ho to section **render hi nahi hota** — khaali heading ke neeche ek
   * khaali patti "toota hua" lagti hai, "abhi nahi bhara" nahi (D-30).
   */
  if (!cards.length) return null

  /**
   * ⚠️ Chhaanna `durationBucket()` se hota hai, `nights` ki seedhi barabari se nahi.
   *
   * `d8plus` sirf ek aur bucket nahi, wo ek **range** hai (8 aur usse zyada) — reference me
   * literally `data-f="d8,d9,d12"` likha hai. Us matlab ko yahan dobara likhne ka nateeja wahi
   * hota jo D-86 ke slug pe tha: ek hi cheez do jagah, aur ek din wo alag.
   */
  const shown =
    active === ALL ? cards : cards.filter((card) => durationBucket(card.nights) === active)

  /**
   * Bar **sirf tab** jab client ne `pageFilter` chuna ho — warna server khaali `facets` bhejta
   * hai aur bar dikhti hi nahi.
   *
   * ⚠️ **Pehle yahan `> 1` tha, aur wo galat tha.** Soch ye thi ki ek hi pill bemaani hai. Par
   * live check pe nikla ki asli page ke saare paanch package `5N / 6D` ke hain — yaani facet ek
   * hi tha aur **client ka chuna hua filter chup-chaap gayab** ho gaya. Wahi shakl jo D-86 me
   * pakdi gayi thi: guard ka chalna kabhi error jaisa nahi dikhta, wo "kuch na hone" jaisa
   * dikhta hai.
   *
   * Ek pill pe bhi bar bekaar nahi hai — `.fbar__c` ki ginti (`5 packages`) apne aap me kaam ki
   * hai, aur reference me wo bar hamesha dikhti hai.
   */
  const showFilters = facets.length > 0

  return (
    /*
     * ⚠️ **`.blk` yahan nahi hai, aur wo client ne pakda** (8 Sep).
     *
     * Maine har block ko `.blk` de diya tha, par reference me package list ek **saada
     * `<div id="pklist">`** hai — koi safed card, koi border nahi (`tour-v3.html:1432`). Cards
     * khud apne dabbe hain; unhe ek aur dabbe me rakhna do border ek doosre ke andar bana deta.
     *
     * ⚠️ Iska ek asar hai jo yaad rakhna hoga: `.blk` ke saath `content-visibility: auto` bhi
     * jaata tha (D-85). Ye section lamba hota hai, to fold ke neeche uska layout ab paint se
     * pehle hoga. Naapne laayak farak nahi hai (baaki 9 `.blk` abhi bhi contain karte hain),
     * par LCP dobara naapte waqt ye baat hisaab me honi chahiye.
     */
    <section id="pklist">
      {(props.heading || props.subheading) && (
        <div className="sh">
          <div>
            {props.heading ? <h2>{props.heading}</h2> : null}
            {props.subheading ? <p>{props.subheading}</p> : null}
          </div>
        </div>
      )}

      {showFilters && (
        <div className="fbar">
          <span className="fbar__l">Duration</span>

          <button
            type="button"
            className={`dpill${active === ALL ? ' on' : ''}`}
            aria-pressed={active === ALL}
            onClick={() => setActive(ALL)}
          >
            All
          </button>

          {facets.map((facet) => (
            <button
              key={facet.key}
              type="button"
              className={`dpill${active === facet.key ? ' on' : ''}`}
              aria-pressed={active === facet.key}
              onClick={() => setActive(facet.key)}
            >
              {/*
               * ⚠️ **Pill pe ginti nahi** (client, 8 Sep). Maine yahan `<i>{count}</i>` daal
               * diya tha — reference me wo hai hi nahi, wahan pill sirf `2N / 3D` hai. Poori
               * list ki ginti `.fbar__c` me daayein kinare pe aati hai, aur wahi kaafi hai.
               *
               * `facets` phir bhi `count` ke saath aate hain aur wo theek hai — server use
               * `limit` se pehle ginta hai, aur wo ginti kabhi kaam aa sakti hai.
               */}
              {facet.label}
            </button>
          ))}

          <span className="fbar__c">
            {shown.length} {shown.length === 1 ? 'package' : 'packages'}
          </span>
        </div>
      )}

      <div className="prows">
        {shown.map((card) => (
          <PackageCard key={card.id} item={card} currency={data?.currency} />
        ))}
      </div>

      {/*
       * Pill pe kuch na mile — ye tabhi ho sakta hai jab facets aur cards ka hisaab alag ho
       * jaaye. Aaj wo ho nahi sakta (dono ek hi list se bante hain), par khaali jagah chhod
       * dena "page toot gaya" jaisa dikhta hai.
       */}
      {shown.length === 0 && <p className="blk__empty">No packages for this duration.</p>}
    </section>
  )
}
