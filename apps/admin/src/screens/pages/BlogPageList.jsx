import EntriesList from './EntriesList.jsx'

/**
 * Blog Page — blog ka **listing** page (`blog-v1.html`, spec 008).
 *
 * ⚠️ **Client ne ise _"ek submenu me single page"_ kaha, aur ye phir bhi ek aam list hai.**
 * Wo jaan-boojh kar hai: usme aam taur pe **ek hi row** hogi, par doosra banane ka raasta
 * khula rehna chahiye — topic-wise landing page (`/blog/ferries`) bilkul yahi cheez hai, bas
 * uske `postList` block me `categoryId` bhara hota hai.
 *
 * Iska ulta — screen ko zabardasti ek entry pe baandhna — us raaste ko band kar deta, aur
 * uske badle me kuch bhi nahi milta.
 *
 * ⚠️ **Teesra column jaan-boojh kar nahi diya** (`thirdColumn` pass hi nahi hota) — client,
 * 10 Sep: _"column me Packages kyu aa raha hai, isme to hai hi nahi."_ Is page pe na packages
 * hain, na category, aur koi teesri cheez jo ginne laayak ho. Pehle uska default `packages`
 * tha, jo har entry ke blocks me `packageList` ginta tha — hamesha 0.
 */
export default function BlogPageList() {
  return (
    <EntriesList
      type="blogPage"
      title="Blog Pages"
      addLabel="Add New Blog Page"
      basePath="/blog-page"
      searchLabel="Search blog pages…"
    />
  )
}
