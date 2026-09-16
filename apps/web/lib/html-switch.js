/**
 * Custom editor ke HTML me tabs — **class se**, `data-*` se nahi (client, 16 Sep).
 *
 * Client ka sawaal seedha tha: _"demo me to only HTML, CSS aur JS hai, to usme kaise perfectly kaam kar
 * raha hai — same logic ke saath class bhi add hai block me, use hi implement kar do"_. Bilkul theek —
 * bas JS ka ghar **theme** hai, content nahi: editor me `<script>` save hi nahi hota (R20), aur wo rok
 * jaan-boojh kar hai (ek block ka script poore site pe kuch bhi kar sakta hai).
 *
 * Isliye behaviour yahan hai aur wo **naam se nahi, dhaanche se** chalta hai:
 *
 * | Class | Matlab |
 * | --- | --- |
 * | `sw-tab i-<key>` | dabane wali cheez — pill, map ka pin, kuch bhi |
 * | `sw-panel i-<key>` | uska dabba — ek waqt me ek hi dikhta hai |
 * | `is-on` | JS lagata hai; CSS isi se rang/dikhna tay karti hai |
 *
 * ⚠️ Reference `data-i="havelock"` use karta hai, par sanitizer `data-*` girata hai (D-80 ka allowlist).
 * `class` bachti hai, isliye key wahin se aati hai — yahi ek badlaav hai reference se.
 *
 * ⚠️ Ye **kisi ek site ki cheez nahi** hai: `home-island-map` ka naam is file me kahin nahi hai. Kal
 * client koi bhi tabs wala dabba custom editor me banaye, wo inhi teen class se chal jaayega.
 */

/** `i-havelock` → `havelock`. Baaki classes (`ipill`, `hot`) chhodh di jaati hain. */
export const SWITCH_KEY_RE = /^i-([a-z0-9][a-z0-9-]*)$/i

/**
 * Element ki classes me se uski key nikaalo — na mile to khaali.
 *
 * @param {Iterable<string>} classList
 * @returns {string}
 */
export function switchKey(classList) {
  for (const name of classList ?? []) {
    const match = SWITCH_KEY_RE.exec(name)
    if (match) return match[1].toLowerCase()
  }

  return ''
}
