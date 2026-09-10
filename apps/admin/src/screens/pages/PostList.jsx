import EntriesList from './EntriesList.jsx'

/**
 * All Posts — blog ki list (spec 008, Slice C).
 *
 * ⚠️ **Ye screen aaj tak `NotBuiltYet` pe thi** (A-9), jabki `post` type Phase 1 se DB me
 * maujood hai. Yaani API se post ban sakta tha par admin me uska koi raasta nahi tha.
 *
 * ✅ Naya kuch likhna nahi pada — `EntriesList` `type` se chalta hai (D-87 Slice C ka bacha
 * hua faayda). `PackagesList` ko chhua bhi nahi gaya: uske apne filter aur bulk actions
 * package ke domain ke hain.
 */
export default function PostList() {
  return (
    <EntriesList
      type="post"
      title="Posts"
      addLabel="Add New Post"
      basePath="/posts"
      searchLabel="Search posts…"
      thirdColumn="category"
      postFilters
    />
  )
}
