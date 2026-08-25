/**
 * Footer ke columns `menuLocations` se `settings.footerColumns[]` me — D-44, spec 006 §7.3.
 *
 * D-43 me footer ke 4 columns theme locations the (`footerColumn1..4`). D-44 me wo
 * `settings` ke andar aa gaye, kyunki ab column sirf menu nahi hota — usme text blocks,
 * apni heading aur width bhi hoti hai, aur unki **ginti** admin chunta hai.
 *
 * Ye migration **data move karti hai**, sirf index nahi banati — is repo me pehli aisi.
 * Isliye do baatein maayne rakhti hain:
 *
 * 1. **Idempotent.** Dobara chale to kuch na bigde — settings me `footerColumns` pehle se
 *    bhari ho to haath hi nahi lagta. Bina iske dobara chalane pe columns duplicate ho
 *    jaate ya client ka kiya hua edit purane assignments se overwrite ho jaata.
 * 2. **`down()` sach me ulta karti hai.** Columns wapas `menuLocations` me jaate hain,
 *    taaki rollback pe footer khaali na ho jaaye.
 *
 * **Heading kahan se aati hai:** pehle footer column ki heading `menus.name` se render
 * hoti thi. Ab wo column ki apni field hai (D-44 §3) — text-only column me koi menu hai
 * hi nahi, to naam kahan se aata. Migration wahi purana naam heading me likh deti hai,
 * isliye kisi chalte hue site ka footer heading khoye bina waisa ka waisa rehta hai.
 *
 * Collection chhota hai (ek settings document, 4 location rows) — yahan batching ki
 * zaroorat nahi.
 */

/** Wahi 4 locations jo D-43 me the. Ye list ab kahin aur nahi bachi, isliye yahin likhi hai. */
const LEGACY_FOOTER_LOCATIONS = ['footerColumn1', 'footerColumn2', 'footerColumn3', 'footerColumn4']

/**
 * Ids yahan **deterministic** hain (`fc1`…), `randomUUID()` nahi.
 *
 * Wajah idempotency hai: migration dobara chale to wahi ids banni chahiye, warna
 * `down()` ke baad `up()` chalane pe har baar naye ids aate aur "kuch nahi badla" wala
 * check jhooth bolne lagta.
 */
const columnId = (index) => `fc${index + 1}`

export async function up({ db }) {
  const settings = db.collection('settings')
  const menuLocations = db.collection('menuLocations')
  const menus = db.collection('menus')

  const docs = await settings.find({}).toArray()

  for (const doc of docs) {
    // Pehle se bhara hua hai to chhedo mat — ye wahi idempotency wali shart hai
    if (Array.isArray(doc.footerColumns) && doc.footerColumns.length > 0) continue

    const rows = await menuLocations
      .find({ siteId: doc.siteId, location: { $in: LEGACY_FOOTER_LOCATIONS } })
      .toArray()

    const assigned = new Map(rows.map((r) => [r.location, r.menuId]))

    /**
     * Sirf wahi columns banao jinpe sach me koi menu tha.
     *
     * Chaaron hamesha banana galat hota: jis instance pe sirf ek footer menu tha, uske
     * admin ko 4 columns dikhte — teen khaali — aur site pe teen khaali columns render
     * hote. Khaali cheez khaali dikhni chahiye, tooti hui nahi (D-30).
     */
    const columns = []
    for (const location of LEGACY_FOOTER_LOCATIONS) {
      const menuId = assigned.get(location) ?? null
      if (!menuId) continue

      const menu = await menus.findOne({ _id: menuId, deletedAt: null }).catch(() => null)

      columns.push({
        id: columnId(columns.length),
        // Purani heading `menus.name` se aati thi — wahi bacha lo (D-44 §3)
        heading: menu?.name ?? '',
        type: 'menu',
        width: 'normal',
        menuId: String(menuId),
        textBlocks: [],
      })
    }

    await settings.updateOne(
      { _id: doc._id },
      {
        $set: {
          footerColumns: columns,
          // Naye fields ka default — purane document me ye key hoti hi nahi
          footerLogoMediaId: doc.footerLogoMediaId ?? null,
        },
      },
    )
  }

  /**
   * Purani location rows hata do.
   *
   * `isThemeMenuLocation()` ab inhe pehchanti hi nahi, isliye ye rows chhodne ka matlab
   * hota "aisa data jo koi na padhta ho, par menu delete hone pe uska cleanup phir bhi
   * chalta ho". Wahi cheez agle developer ko confuse karti hai.
   */
  await menuLocations.deleteMany({ location: { $in: LEGACY_FOOTER_LOCATIONS } })
}

export async function down({ db }) {
  const settings = db.collection('settings')
  const menuLocations = db.collection('menuLocations')

  const docs = await settings.find({}).toArray()

  for (const doc of docs) {
    const columns = Array.isArray(doc.footerColumns) ? doc.footerColumns : []

    /**
     * Sirf **menu wale** columns wapas ja sakte hain — `menuLocations` me text block
     * rakhne ki koi jagah hai hi nahi. Ye rollback ka asli nuksaan hai aur ise chhupana
     * nahi chahiye: text-only columns ka content wapas jaate waqt kahin nahi jaayega.
     * Isiliye `footerColumns` neeche **delete nahi** hoti, sirf locations dobara banti
     * hain — dobara `up()` chalao to sab wapas mil jaata hai.
     */
    const withMenus = columns.filter((c) => c.menuId).slice(0, LEGACY_FOOTER_LOCATIONS.length)

    for (const [index, column] of withMenus.entries()) {
      await menuLocations.updateOne(
        {
          siteId: doc.siteId,
          locale: doc.locale ?? 'en',
          location: LEGACY_FOOTER_LOCATIONS[index],
        },
        { $set: { menuId: String(column.menuId), updatedAt: new Date() } },
        { upsert: true },
      )
    }
  }
}
