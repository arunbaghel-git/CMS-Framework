import { useCallback, useState } from 'react'

/**
 * Editor ke panels ka kram — client apne hisaab se laga sake (D-64).
 *
 * ## Ye `localStorage` me hai, DB me nahi — jaan-boojh kar
 *
 * Kram **UI ki state** hai, content ki nahi. Do wajah:
 *
 * 1. **Ye ek user ki pasand hai, site ki setting nahi.** DB me rakhne ka matlab hota ki ek
 *    editor apna kram badle aur baaki sabka editor badal jaaye.
 * 2. **Iska galat hona sasta hona chahiye.** localStorage saaf ho jaaye to default kram
 *    wapas aa jaata hai aur kuch kho nahi jaata — jabki DB me ek aur field, uska API,
 *    uski permission aur uska migration aata.
 *
 * Yahi tark `Panel` ke apne collapse state pe pehle se laga hua hai.
 *
 * ## Anjaan id chup-chaap gir jaati hai
 *
 * Kal koi panel jud sakta hai ya hat sakta hai. Purana saved kram usse nahi jaanta, isliye:
 * saved kram me se wahi ids li jaati hain jo aaj sach me hain, aur jo nayi hain wo **aakhir
 * me** jud jaati hain. Bina iske ek naya panel purane users ko dikhta hi nahi — aur wo
 * bilkul chup failure hoti.
 *
 * @param {string} key localStorage ki key — screen ke hisaab se alag
 * @param {string[]} ids default kram
 */
export function usePanelOrder(key, ids) {
  const read = useCallback(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? 'null')
      if (!Array.isArray(saved)) return ids

      const known = saved.filter((id) => ids.includes(id))
      return [...known, ...ids.filter((id) => !known.includes(id))]
    } catch {
      // Kharab JSON ya band storage — default kram hi theek hai
      return ids
    }
  }, [key, ids])

  const [order, setOrder] = useState(read)

  const move = useCallback(
    (from, to) => {
      setOrder((current) => {
        if (to < 0 || to >= current.length || from === to) return current

        const next = [...current]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)

        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // Storage band ho to kram is session me phir bhi chalta hai
        }

        return next
      })
    },
    [key],
  )

  return [order, move]
}
