import { Inter } from 'next/font/google'

import FloatingContact from '../components/FloatingContact.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { getIntegrations, getSeoSettings, getSettings } from '../lib/cms.js'
import { splitHeadHtml } from '../lib/head-html.js'
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
  const [settings, seo] = await Promise.all([getSettings(), getSeoSettings()])
  const ogImage = seo?.seo?.defaultOgImage
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? settings?.siteUrl

  return {
    /**
     * OG image ke `/uploads/…` jaise relative URL isi se poore bante hain (24 Sep). Iske bina Next
     * `localhost:3000` laga deta tha — yaani banner wali og:image production pe bhi kabhi sahi
     * nahi thi. Wahi pata jo `TourSchema`/`Schema` padhte hain.
     */
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title: settings?.siteName ?? 'CMS',
    // Jin pages ka apna metadata nahi (404) — `Settings ▸ SEO & Schema` ka default, phir tagline
    description: seo?.seo?.defaultDescription || settings?.tagline || '',
    openGraph: ogImage?.url ? { images: [{ url: ogImage.url }] } : undefined,
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
function styleCss(css) {
  return css ? String(css).replace(/<\/style/gi, '') : ''
}

/**
 * `<head>` ka wo hissa jo **hum** likhte hain — ab **asli elements**, ek string nahi (23 Sep).
 *
 * ## ⚠️ `<head>` pe `dangerouslySetInnerHTML` wapas mat lagana
 *
 * 22 Sep (D-106) se yahan teenon cheezein ek string ban kar `<head>` ke `innerHTML` me jaati thin. Aam pages
 * pe chalta tha, par **404 pe poori site ki CSS gayab** ho gayi: `notFound()` pe Next page browser me shuru se
 * banata hai, React `layout.css` ka `<link>` head me daalta hai, aur phir hamara `innerHTML` usse **mita**
 * deta hai. Headless Chrome se naapa: innerHTML ke saath head me link **0**, bina uske **1**.
 *
 * D-106 ki wajah bhi sach thi — head ke andar `<div>` wrapper browser ka parser head band kar deta hai. Isliye
 * Integrations ka HTML ab **server pe tootta hai** (`splitHeadHtml()`, apne test ke saath): head ke tags head
 * me, aur jo head me chal hi nahi sakta wo `<body>` ke shuru me — wahi jo browser khud karta.
 *
 * ⚠️ **Kram maayne rakhta hai:** theme ke rang → client ki CSS → integrations (17 Sep se yahi; integrations
 * aakhir me kyunki wahi ekmatra bina-safai wala hissa hai).
 */
function HeadTags({ settings, head }) {
  const css = [styleCss(settings?.themeCss), styleCss(settings?.customCss)].filter(Boolean)

  return (
    <>
      {css.map((text, i) => (
        <style
          key={`css-${i}`}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: text }}
        />
      ))}
      {head.map(({ tag, props, html }, i) => {
        const Tag = tag
        const key = `int-${i}`

        /** `<title>` ke andar sirf text — React wahan `dangerouslySetInnerHTML` nahi maanta. */
        if (tag === 'title') {
          return (
            <Tag key={key} {...props}>
              {html}
            </Tag>
          )
        }
        if (html === undefined) return <Tag key={key} {...props} />

        return (
          <Tag
            key={key}
            {...props}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      })}
    </>
  )
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
  const header = splitHeadHtml(integrations?.header)

  return (
    <html lang="en" className={inter.variable}>
      {/*
        ⚠️ `suppressHydrationWarning` — head ki `<style>`/integration tags ka maal `settings` ke cached fetch
        se banta hai, aur SSR ka HTML aur RSC payload ek hi pal ke nahi hote (22 Sep, client ka stack trace —
        D-106 §5.1). React `dangerouslySetInnerHTML` wale element ko waisa hi chhodta hai jaisa server ne
        bheja, jo yahan sahi hai. Ab ye attribute har aise element pe bhi hai, kyunki head ab ek string nahi
        (23 Sep).
      */}
      <head suppressHydrationWarning>
        <HeadTags settings={settings} head={header.head} />
      </head>
      <body>
        {/* Integrations ▸ Header ka wo hissa jo head me chal hi nahi sakta — browser bhi use yahin rakhta */}
        <RawHtml html={header.rest} />
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
