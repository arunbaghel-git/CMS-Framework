import EntriesList from './EntriesList.jsx'

/**
 * `Pages ▸ All Pages` — `admin-design-v3.html` ka `#s-pages` (client, 14 Sep, D-95).
 *
 * Design ke column: Title · **Author** · Status · Updated. Nested page title ke aage `—` se
 * dikhta hai — wo `EntriesList` pehle se karta hai.
 *
 * `All dates` dropdown — client, 14 Sep (Posts jaisa, par bina Category ke).
 *
 * ## Do type, ek screen (D-96 §31)
 *
 * `Section Layout` (`sectionPage`) bhi yahi list use karta hai — sirf naam, basePath aur upar pinned row
 * badalte hain. Doosri list file banane ka matlab hota do jagah ek hi cheez, aur is repo me uska nateeja
 * pehle ho chuka hai (D-65/D-51/D-58).
 *
 * ⚠️ **Home Page wali pinned row sirf `page` pe** — wo `page` parivaar ka ek hi entry hai (D-96 §10), aur
 * Section Layout ki list me wo bemaani hai.
 */
const LISTS = {
  page: {
    title: 'Pages',
    addLabel: 'Add New Page',
    basePath: '/pages',
    searchLabel: 'Search pages…',
    pinned: true,
  },
  sectionPage: {
    title: 'Section Layout',
    addLabel: 'Add Section Page',
    basePath: '/section-pages',
    searchLabel: 'Search section pages…',
    pinned: false,
  },
}

export default function PageList({ type = 'page' }) {
  const list = LISTS[type] ?? LISTS.page

  return (
    <EntriesList
      type={type}
      title={list.title}
      addLabel={list.addLabel}
      basePath={list.basePath}
      searchLabel={list.searchLabel}
      thirdColumn="author"
      dateFilter
      /* Home page sabse upar — client, 15 Sep (D-96 §10). Sirf `page` ki list me. */
      pinnedType={list.pinned ? 'homePage' : undefined}
      pinnedLabel={list.pinned ? 'Home Page' : undefined}
      pinnedPath={list.pinned ? '/pages/home' : undefined}
    />
  )
}
