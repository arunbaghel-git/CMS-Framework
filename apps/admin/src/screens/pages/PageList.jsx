import EntriesList from './EntriesList.jsx'

/**
 * `Pages ▸ All Pages` — `admin-design-v3.html` ka `#s-pages` (client, 14 Sep, D-95).
 *
 * Design ke column: Title · **Author** · Status · Updated. Nested page title ke aage `—` se
 * dikhta hai — wo `EntriesList` pehle se karta hai.
 *
 * `All dates` dropdown — client, 14 Sep (Posts jaisa, par bina Category ke).
 */
export default function PageList() {
  return (
    <EntriesList
      type="page"
      title="Pages"
      addLabel="Add New Page"
      basePath="/pages"
      searchLabel="Search pages…"
      thirdColumn="author"
      dateFilter
    />
  )
}
