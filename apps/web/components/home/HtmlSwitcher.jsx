'use client'

import { useEffect, useRef } from 'react'

import { switchKey } from '../../lib/html-switch.js'

/**
 * Custom editor ke HTML ko tabs bana deta hai — `sw-tab` / `sw-panel` / `i-<key>` (D-96 §29).
 *
 * Client ka island map isi se chalta hai: pill ya map ka pin dabao, uska card dikhta hai aur pin
 * highlight hota hai — bilkul reference ke demo jaisa, par JS **theme me** hai, content me nahi.
 *
 * ## Teen baatein jo yahan jaan-boojh kar hain
 *
 * 1. **Ek hi listener, root pe** (event delegation) — client ka HTML kabhi bhi badal sakta hai, aur har
 *    element pe listener lagana matlab har badlaav pe unhe dobara jodna
 * 2. **`role`/`tabindex` yahi lagata hai** — wo attributes sanitizer se guzarte hi nahi, to unhe content me
 *    likhwana bekaar hai. Keyboard wala raasta (Enter/Space) isi wajah se chalta hai
 * 3. **`sw-ready`** — mount hone se pehle CSS pehla panel dikhati hai (SSR pe bhi kuch to dikhe), aur
 *    mount hote hi wo kaam JS le leta hai. Bina iske pehla paint khaali jaata
 */
export default function HtmlSwitcher({ html, className }) {
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return undefined

    const tabs = /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.sw-tab')])
    const panels = /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.sw-panel')])
    if (!tabs.length || !panels.length) return undefined

    const show = (key) => {
      if (!key) return
      for (const tab of tabs) tab.classList.toggle('is-on', switchKey(tab.classList) === key)
      for (const panel of panels)
        panel.classList.toggle('is-on', switchKey(panel.classList) === key)
    }

    for (const tab of tabs) {
      /** SVG ke `<g>` pe bhi chalta hai — wahan `role`/`tabindex` ke bina wo keyboard ko dikhta hi nahi. */
      tab.setAttribute('role', 'button')
      tab.setAttribute('tabindex', '0')
    }

    const onClick = (event) => {
      const tab = event.target.closest?.('.sw-tab')
      if (tab && root.contains(tab)) show(switchKey(tab.classList))
    }

    const onKeyDown = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      const tab = event.target.closest?.('.sw-tab')
      if (!tab || !root.contains(tab)) return

      event.preventDefault()
      show(switchKey(tab.classList))
    }

    root.addEventListener('click', onClick)
    root.addEventListener('keydown', onKeyDown)
    root.classList.add('sw-ready')

    /** Shuruaat me pehla panel — wahi jo CSS mount se pehle dikha rahi thi, taaki kuch hile nahi. */
    show(switchKey(panels[0].classList))

    return () => {
      root.removeEventListener('click', onClick)
      root.removeEventListener('keydown', onKeyDown)
      root.classList.remove('sw-ready')
    }
  }, [html])

  return <div className={className} ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
}
