import { useEntryList } from '../../lib/use-entries.js'
import PageEdit from './PageEdit.jsx'

/**
 * `Pages ▸ Home Page` — **seedha edit screen, list nahi** (client, 15 Sep, D-96).
 *
 * Home page ek hi hota hai (`homePage` ka path `/` hai, aur `{siteId, locale, path}` unique), to
 * id URL me nahi hai: yahan list se dhoondh kar `PageEdit` ko di jaati hai.
 *
 * ⚠️ **Screen kholne se entry nahi banti** (R13 — state badalne wala GET nahi). Na mile to editor
 * khaali khulta hai aur **pehli Save** POST karti hai. Do tab se ek saath Save hua to doosra server
 * pe 409 khaata hai ("There is already a Home Page") — koi duplicate nahi banta.
 *
 * `key` isliye ki pehli Save ke baad `PageEdit` naye id ke saath **dobara mount** ho — warna uska
 * form state purane "Add New" wale id-less haal me atka rehta aur agli Save phir POST karti.
 */
export default function HomePageEdit() {
  const { data, loading, error, reload } = useEntryList('homePage', { limit: 1 })

  if (loading && data.length === 0) return <p className="subtitle">Loading…</p>

  if (error) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  const home = data[0]

  return <PageEdit key={home?.id ?? 'new'} type="homePage" entryId={home?.id} onCreated={reload} />
}
