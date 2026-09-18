import { lazyImages, wrapTables } from '../lib/article-html.js'
import HtmlSwitcher from './home/HtmlSwitcher.jsx'

/**
 * `Custom editor` — client ka apna HTML (client, 16 Sep, D-96 §25).
 *
 * Ek hi component do jagah chalta hai, kyunki client ne dono maange (home **aur** tour):
 *
 * | `variant` | Kahan | Kya banta hai |
 * | --- | --- | --- |
 * | `section` | Home ka section | `.hsec` — poori chaudai, andar `.wrap`, background admin se |
 * | `block` | Tour page ka block | `.blk` — column ke andar, baaki blocks jaisa |
 *
 * ⚠️ **CSS is HTML ke andar nahi likhi ja sakti** — sanitizer `<style>` ka poora content gira deta hai
 * (R20). Uska ghar **Settings ▸ Custom CSS** hai, jo `layout.jsx` se har page ke `<head>` me jaati hai.
 *
 * Client ki di hui `className` bahar wale element pe lagti hai, taaki CSS poore section ko pakad sake
 * (`.my-strip { … }`). Uski shape Zod me hi sakht hai (sirf akshar, ank, space, `-`, `_`).
 *
 * ## Tabs wala HTML khud chal jaata hai (D-96 §29)
 *
 * Content me `sw-tab` mile to andar ka hissa `HtmlSwitcher` render karta hai — client ka island map isi
 * se chalta hai (pill dabao, card badle). **Sirf tab**, warna har saada block bekaar me client component
 * ban jaata aur uska JS har page pe jaata.
 *
 * `wrapTables()` yahan bhi chalta hai — wahi A-19 wali baat: look client ki likhi class pe nahi tikna
 * chahiye, warna table mobile pe page se bahar nikal jaati hai.
 */
export default function CustomHtml({ props = {}, variant = 'section' }) {
  const { background, className, html } = props
  if (!html) return null

  const inner = lazyImages(wrapTables(html))
  const markup = { __html: inner }
  /** Sasta sa sawaal — poori HTML me ek class dhoondhni hai, parse kuch nahi karna. */
  const hasTabs = inner.includes('sw-tab')

  if (variant === 'block') {
    return (
      <div
        className={['blk', 'chb', 'chb--box', className].filter(Boolean).join(' ')}
        style={background ? { '--chb-bg': background } : undefined}
      >
        {hasTabs ? <HtmlSwitcher html={inner} /> : <div dangerouslySetInnerHTML={markup} />}
      </div>
    )
  }

  return (
    <section
      className={['hsec', 'chb', className].filter(Boolean).join(' ')}
      style={background ? { '--hsec-bg': background } : undefined}
    >
      {hasTabs ? (
        <HtmlSwitcher className="wrap" html={inner} />
      ) : (
        <div className="wrap" dangerouslySetInnerHTML={markup} />
      )}
    </section>
  )
}
