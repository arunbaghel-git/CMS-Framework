/**
 * Kuch hatane se pehle ek pooch — client ka faisla, 27 Aug (D-64).
 *
 * Admin me remove/delete ke button aksar list ke andar hote hain aur unke bagal me doosre
 * button bhi hote hain. Ek galat click ka nateeja seedha hai: din, FAQ ya row chali jaati
 * hai, aur uska koi undo nahi — save karne tak wo sirf browser me hai, aur save ke baad
 * revision me.
 *
 * `window.confirm` jaan-boojh kar, apna modal nahi:
 *
 * - Wo **synchronous** hai, isliye har call-site sirf ek `if` line hai — koi state, koi
 *   "kaunsa item delete hone wala hai" wala extra render nahi
 * - Keyboard aur screen reader dono pe wo pehle se theek chalta hai
 * - Repo me ye pattern **pehle se hai** (`Menus.jsx`, `MegaBuilder.jsx`) — teesra tareeka
 *   banane ka matlab hota ki ek hi kaam do shakl me dikhe
 *
 * Naam me **kya** ja raha hai wo dena zaroori hai: "Remove this?" padh kar user ko ye nahi
 * pata chalta ki uska cursor kis row pe tha.
 *
 * @param {string} label jo cheez ja rahi hai — `Day 3`, `"Which ferry class…"`, `Havelock · Deluxe`
 * @returns {boolean}
 */
export function confirmRemove(label) {
  return window.confirm(`Remove ${label}? This can't be undone.`)
}
