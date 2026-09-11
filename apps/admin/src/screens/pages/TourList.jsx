import EntriesList from './EntriesList.jsx'

/**
 * All Tour Pages — `admin-design-v3.html` ke `#s-tour` se (D-87, Slice C).
 *
 * ⚠️ **Apna top-level menu hai, Pages ka submenu nahi** — client ka faisla #1. Wahi wajah
 * jiske liye `tourPage` ek alag content type hai: menu, list aur URL teenon alag maange gaye
 * the. Edit screen dono ka **ek hi** hai.
 */
export default function TourList() {
  return (
    <EntriesList
      type="tourPage"
      title="Tour Pages"
      addLabel="Add New Tour Page"
      basePath="/tour"
      searchLabel="Search tour pages…"
    />
  )
}
