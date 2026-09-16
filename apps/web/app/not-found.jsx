import Link from 'next/link'

import { getSettings } from '../lib/cms.js'

/**
 * 404 — site ka apna page (client, 16 Sep: _"abhi theek hai, par accha nahi lag raha"_).
 *
 * Ab tak yahan **Next ka apna default** aata tha: system font me `404 | This page could not be found.`,
 * aur uske upar-neeche hamara header aur footer. Yaani ek visitor ko site ke beech me ek anjaan page
 * milta tha.
 *
 * ## Yahan kuch bhi Andaman-specific nahi hai
 *
 * Har line theme ki hai aur har link **settings se** aata hai (CMS har client ka hai — D-96 §15):
 *
 * | Cheez | Kahan se |
 * | --- | --- |
 * | Site ka naam | `settings.siteName` |
 * | "Talk to us" ka link | `settings.quoteUrl` (Settings ▸ General ▸ Get quote link) |
 * | WhatsApp | `settings.whatsapp` |
 *
 * ⚠️ **Jo cheez na ho, uska button banta hi nahi** (D-30) — sirf "Go to homepage" hamesha rehta hai,
 * kyunki `/` har site pe hota hai.
 *
 * ⚠️ **Yahan koi hardcoded raasta nahi** (`/packages`, `/contact`) — wo R3 ka ulta hota: routing ka
 * ekmatra source `entries.path` hai, aur har client ke page alag hote hain.
 */

/** `+91 98100 66496` → `919810066496` — wahi helper jo `MobileBar` me hai. */
const digits = (value) =>
  String(value ?? '')
    .replace(/[^\d+]/g, '')
    .replace(/^\+/, '')

export default async function NotFound() {
  const settings = await getSettings()

  const quoteUrl = settings?.quoteUrl?.trim()
  const whatsapp = settings?.whatsapp?.trim()

  return (
    <main className="nf">
      <div className="wrap nf__in">
        <span className="nf__code">404</span>

        <h1>We couldn&rsquo;t find that page</h1>

        <p>
          The link may be old, or the page may have been moved or renamed. Nothing is lost — start
          again from the homepage, or ask us and we&rsquo;ll point you to the right place.
        </p>

        <div className="nf__btns">
          <Link className="btn btn--primary" href="/">
            Go to homepage
          </Link>

          {quoteUrl && (
            <Link className="btn btn--outline" href={quoteUrl}>
              Talk to us
            </Link>
          )}

          {whatsapp && (
            <a
              className="btn btn--whatsapp"
              href={`https://wa.me/${digits(whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          )}
        </div>

        {settings?.siteName ? <span className="nf__site">{settings.siteName}</span> : null}
      </div>
    </main>
  )
}
