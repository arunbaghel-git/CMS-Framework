import EntriesList from './EntriesList.jsx'

/**
 * All Pages — `admin-design-v3.html` ke `#s-pages` se (D-87, Slice C).
 *
 * ⚠️ **Ye screen A-9 band karti hai.** `entries` engine 26 Aug se `page` type sambhal raha
 * hai (D-46) aur wo seed me register bhi hai, par admin me uska koi raasta nahi tha — nav ke
 * links `NotBuiltYet` pe jaate the. Yaani API se page banaya ja sakta tha, client se nahi.
 */
export default function PagesList() {
  return (
    <EntriesList
      type="page"
      title="Pages"
      addLabel="Add New Page"
      basePath="/pages"
      searchLabel="Search pages…"
      thirdColumn="author"
    />
  )
}
