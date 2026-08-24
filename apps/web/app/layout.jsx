import SiteFooter from '../components/SiteFooter.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { getSettings } from '../lib/cms.js'
import './globals.css'

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
