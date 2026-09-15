import { useSearchParams } from 'react-router-dom'

import MasterListScreen from './MasterListScreen.jsx'

/**
 * `Reviews` — do tab, **Text reviews** aur **Video reviews** (client, 15 Sep, D-96 §13).
 *
 * Dono ek hi generic list screen hain (`MasterListScreen`), sirf list alag. Tab URL me hai (`?tab=video`)
 * — refresh, back button aur link bhejna teeno kaam karte hain (EntriesList ke tabs wala hi tark).
 *
 * `key` isliye ki tab badalte hi form aur list ka state saaf ho — warna text review ka aadha bhara form
 * video tab pe chipka rehta.
 */
const TABS = [
  { id: 'text', label: 'Text reviews', list: 'reviews' },
  { id: 'video', label: 'Video reviews', list: 'videoReviews' },
]

export default function ReviewsScreen() {
  const [params, setParams] = useSearchParams()
  const active = TABS.find((tab) => tab.id === params.get('tab')) ?? TABS[0]

  const tabs = (
    <nav className="tabs" aria-label="Review type">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === active.id ? 'on' : ''}
          aria-current={tab.id === active.id ? 'true' : undefined}
          onClick={() => setParams(tab.id === 'text' ? {} : { tab: tab.id })}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )

  return <MasterListScreen key={active.list} list={active.list} tabs={tabs} />
}
