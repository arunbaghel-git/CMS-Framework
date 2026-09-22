import { Inter } from 'next/font/google'

import FloatingContact from '../components/FloatingContact.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { getIntegrations, getSettings } from '../lib/cms.js'
import './globals.css'

/**
 * Inter — reference ka font.
 *
 * `next/font/google` build ke waqt font download kar ke **self-host** karta hai: runtime
 * pe Google ko koi request nahi jaati, layout shift nahi hota, aur CSP me ek aur origin
 * kholni nahi padti (wo Phase 4-5 me aayegi).
 *
 * ⚠️ Iska matlab hai ki **build ke waqt internet chahiye**. Offline build karna ho to ye
 * font locally rakhna padega (`next/font/local`).
 *
 * ⚠️ **`weight` jaan-boojh kar nahi diya gaya hai** — Inter ek **variable font** hai (D-85).
 *
 * Pehle yahan `weight: ['400','500','600','700','800','900']` tha. Uska matlab tha ki
 * `next/font` chhe **static instances** banata, aur browser unme se do utaarta — naapne pe
 * wo do file mila kar **133 KB** thin (48 KB + 85 KB), aur doosri 866ms pe aati thi.
 *
 * `weight` hataane pe ek hi **variable** file aati hai jisme poora range hota hai. Design me
 * kuch nahi badalta: `--fw-normal` se `--fw-black` tak jo chhe weight `globals.css` me use
 * hote hain (D-73), wo sabhi isi ek file se aate hain — aur beech ki value bhi, agar kabhi
 * chahiye ho.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

/**
 * Root layout — header aur footer **har page pe**, asli API data se (D-27).
 *
 * Dono server components hain aur tag-based cache me baithte hain (D-14). Isliye admin me
 * menu ya settings badalte hi revalidate webhook inhe saaf kar deta hai, aur agla request
 * naya data uthata hai.
 */

/**
 * `<title>` aur favicon settings se — hardcoded kuch nahi.
 *
 * `searchEngineVisible` public payload me isliye hai ki uska kaam hi yahi hai: naya
 * instance hamesha staging hota hai, aur wahan noindex default hona chahiye (spec 004 §3).
 */
export async function generateMetadata() {
  const settings = await getSettings()

  return {
    title: settings?.siteName ?? 'CMS',
    description: settings?.tagline ?? '',
    // Favicon resolve na ho to koi entry hi nahi — toota hua icon kabhi nahi (D-42 §2)
    icons: settings?.favicon ? { icon: settings.favicon.url } : undefined,
    robots: settings?.searchEngineVisible ? undefined : { index: false, follow: false },
  }
}

/**
 * Client ki apni CSS — **Settings ▸ Custom CSS** (client, 16 Sep: _"poori site par"_).
 *
 * `Custom editor` block me `<style>` likha hi nahi ja sakta (sanitizer use gira deta hai, R20), isliye
 * CSS ka ghar settings hai aur wo yahan ek `<style>` me aati hai.
 *
 * ⚠️ **`</style` do jagah ruka hua hai** — Zod me (write pe) aur yahan (render pe). Ek hi jagah rokna
 * kaafi hota, par purana data ya seedha DB edit us ek rok ke peeche se aa sakta hai, aur yahan se bacha
 * hua `</style` poore page ka HTML tod deta (A-27 wali baat). CSS me JS chalti nahi, isliye is rok ke
 * baad yahan XSS ka raasta nahi bachta.
 */
function styleTag(css) {
  if (!css) return ''

  return `<style>${String(css).replace(/<\/style/gi, '')}</style>`
}

/**
 * `<head>` ka wo poora hissa jo **hum** likhte hain — ek hi string me.
 *
 * ## ⚠️ Ye ek string kyun hai, do components kyun nahi
 *
 * 22 Sep tak yahan do alag components the (`ThemeColors`, `CustomCss`) aur wo theek chal rahe the.
 * Integrations (D-106) ke saath wo raasta band ho gaya: us field me client ka **kachcha HTML** aata
 * hai (`<script>`, `<meta>`, `<noscript>`), aur React ek string ko element nahi bana sakta — use
 * `dangerouslySetInnerHTML` chahiye, jo kisi **element** pe lagta hai.
 *
 * Us element ko `<head>` ke andar rakhna galat nikla, **aur ye naap kar dekha gaya**: SSR ke HTML me
 * `<div>` head ke andar chhapta to hai, par **browser ka parser wahin `<head>` band kar deta hai**
 * (HTML spec: head me anjaan tag milte hi "after head" mode). Uske baad ki hamari CSS `<body>` me
 * chali jaati.
 *
 * Isliye ab `<head>` par **khud** `dangerouslySetInnerHTML` lagta hai aur teenon cheezein string ki
 * tarah judti hain. Ye bhi naap kar dekha gaya: Next apni metadata (title, favicon, preload) phir
 * bhi isi `<head>` me daalti hai — dono saath rehte hain.
 *
 * ⚠️ **Kram maayne rakhta hai:** theme ke rang → client ki CSS → integrations.
 * - CSS pehle, taaki client ki apni CSS rangon ko override kar sake (17 Sep se yahi hai)
 * - **Integrations sabse aakhir me**, kyunki wo ekmatra hissa hai jiski HTML hum saaf nahi karte:
 *   usme ek adhoora tag bhi ho to uske **baad** ka sab tootta hai — aur uske baad hamara kuch nahi
 */
function headHtml(settings, integrations) {
  return styleTag(settings?.themeCss) + styleTag(settings?.customCss) + (integrations?.header ?? '')
}

/**
 * `<body>` ke andar ka integration code — `body` (sabse upar) aur `footer` (sabse neeche).
 *
 * ⚠️ **Yahan wrapper `<div>` chalta hai aur head me nahi chalta** — farak HTML parser ka hai, hamara
 * nahi: `<body>` me `<div>` bilkul saadharan hai. `display: contents` isliye ki wo layout me apni koi
 * jagah na le — GTM ka `<noscript>` aur `<script>` waise bhi kuch dikhate nahi, par kal koi dikhne
 * wala tag paste kare to wo hamare grid/flex ko na hilaye.
 */
function RawHtml({ html }) {
  if (!html) return null

  return <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />
}

export default async function RootLayout({ children }) {
  /**
   * Do call, **ek hi cached fetch** — `getIntegrations()` wahi `/public/settings` padhti hai jo
   * `getSettings()` padhti hai. Alag isliye ki integrations ka code `settings` object ke saath
   * `MobileNav` tak pahunch kar har page ke HTML me **dobara** na jaaye (A-36, D-103 §7 wala bug).
   */
  const [settings, integrations] = await Promise.all([getSettings(), getIntegrations()])

  return (
    <html lang="en" className={inter.variable}>
      <head dangerouslySetInnerHTML={{ __html: headHtml(settings, integrations) }} />
      <body>
        {/* Integrations ▸ Body — `<body>` khulte hi; GTM ka `<noscript>` yahin kaam karta hai */}
        <RawHtml html={integrations?.body} />
        <SiteHeader />
        {children}
        <SiteFooter />
        {/*
          Yahan hai, kisi page component me nahi — ye har page pe ek jaisa hai aur
          `settings` upar pehle se maujood hai. Page-by-page lagane ka matlab hota ki
          naya page type banate waqt wo har baar chhoot sakta hai (`.mobar` ke saath
          theek yahi ho chuka hai — tour aur blog listing pe wo aaj bhi nahi hai).
        */}
        <FloatingContact settings={settings} />
        {/*
          Integrations ▸ Footer — sabse aakhir, `</body>` se theek pehle. Chat widget aur heatmap
          yahan isliye jaate hain ki wo zaroori nahi hain: upar rakhne se page der se khulta hai
          (wahi soch jo D-101 ki speed wali thi).
        */}
        <RawHtml html={integrations?.footer} />
      </body>
    </html>
  )
}
