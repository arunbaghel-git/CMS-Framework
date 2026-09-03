/**
 * Date/time input pe **poore box** pe click karne se picker khule — client ka niyam (3 Sep).
 *
 * Browser ka default sirf us chhote calendar icon pe khulta hai. Baaki poora box click karne
 * pe kuch nahi hota, aur user ko lagta hai ki field kaam hi nahi kar raha — client ne yahi
 * pehle public site ke Travel date pe pakda tha (2 Sep, `63ac46b`), aur 3 Sep ko kaha ki ye
 * **hamesha** aise hi hona chahiye, aage bhi.
 *
 * Isliye ye helper yahan hai, kisi ek screen me nahi: har naye `date` · `datetime-local` ·
 * `time` · `month` input pe `onClick={openPicker}` lagta hai (R19).
 *
 * ⚠️ `try/catch` **zaroori hai, ehtiyaat nahi**: `showPicker()` throw karta hai jab wo kisi
 * asli click ke bina bulaya jaaye (browsers use user-gesture ke peeche rakhte hain), aur
 * purane browsers me wo method hai hi nahi. Dono soorat me field waise ka waisa chalta rehna
 * chahiye — **type kar ke bharna hamesha kaam karta hai**, aur wo raasta kabhi band nahi hona
 * chahiye.
 *
 * @param {{ currentTarget: HTMLInputElement }} event
 */
export function openPicker(event) {
  try {
    event.currentTarget.showPicker?.()
  } catch {
    /* Browser ne mana kar diya — user haath se type kar sakta hai, ye rok nahi hai. */
  }
}
