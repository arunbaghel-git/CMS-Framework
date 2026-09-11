/**
 * Post ka parent Blog settings ke URL mode se (D-92 §13, client 11 Sep).
 *
 * Post ka parent **sirf breadcrumb** banata hai (D-91 §3), aur client ka niyam hai ki breadcrumb URL
 * ke saath chale:
 *
 * | `blogSettings.postUrlMode` | URL | parent | breadcrumb |
 * | --- | --- | --- | --- |
 * | `nested` | `/blog/post` | blog listing page | `Home › Blog › Post` |
 * | `root` | `/post` | koi nahi | `Home › Post` |
 *
 * ⚠️ 11 Sep tak ye kahin tay hi nahi hota tha — 9 Sep ke 12 post ko parent ek baar mila, uske baad
 * ke har post (admin ya Bulk Upload) ko nahi, aur URL switch sirf path badalta tha. Ab code ye khud
 * karta hai (`postParentFor()`, `syncPostUrlPattern()`); ye migration **pehle se pade** data ko
 * usi niyam pe laati hai.
 *
 * Listing page wahi jo code chunta hai: `postList` wala sabse purana `blogPage`. Listing na ho to
 * parent `null` — breadcrumb kisi aisi jagah nahi le ja sakta jo hai hi nahi.
 *
 * ⚠️ Cache yahan saaf **nahi** hota (migration ke paas `SITE_URL` wala revalidate nahi hai). Badle
 * hue post pages `CACHE_SECONDS` (1 ghanta) me apne aap naya breadcrumb dikhayenge.
 */

export async function up({ db }) {
  const entries = db.collection('entries')

  const groups = await entries
    .aggregate([
      { $match: { type: 'post' } },
      { $group: { _id: { siteId: '$siteId', locale: '$locale' } } },
    ])
    .toArray()

  for (const {
    _id: { siteId, locale },
  } of groups) {
    const settings = await db.collection('settings').findOne({ siteId })
    const mode = settings?.blogSettings?.postUrlMode ?? 'nested'

    const listing =
      mode === 'root'
        ? null
        : await entries
            .find({
              siteId,
              locale,
              type: 'blogPage',
              deletedAt: null,
              'content.blocks.type': 'postList',
            })
            .sort({ createdAt: 1 })
            .limit(1)
            .next()

    const parent = listing ? String(listing._id) : null

    /** `$ne` ghaayab field ko bhi pakadta hai — bina parent wale purane post bhi aa jaate hain. */
    await entries.updateMany(
      { siteId, locale, type: 'post', parentId: { $ne: parent } },
      { $set: { parentId: parent } },
    )
  }
}

export async function down() {
  /**
   * Wapas nahi jaata. Pehle kis post pe kaunsa parent tha, ye kahin likha nahi hai — aur wo haalat
   * waise bhi galat thi (setting se alag). Setting dobara Save karne se `syncPostUrlPattern()`
   * wahi niyam lagata hai jo ye migration.
   */
}
