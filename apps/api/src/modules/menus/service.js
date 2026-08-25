import { randomUUID } from 'node:crypto'

import mongoose from 'mongoose'

import {
  DEFAULT_LOCALE,
  DEFAULT_SITE_ID,
  MENU_TYPE,
  THEME_MENU_LOCATIONS,
  isThemeMenuLocation,
  toPublicMenu,
} from '@cms/shared'

import { badRequest, conflict, notFound } from '../../core/errors.js'
import { revalidateTags } from '../../core/revalidate.js'
/**
 * ⚠️ **Ye import circular hai** — `settings/service.js` yahan se `menuExists` leti hai.
 *
 * Ye jaan-boojh kar hai aur chalta hai: dono taraf sirf `export async function`
 * declarations hain, jo ESM me hoist hoti hain, aur koi bhi module load ke waqt doosre ko
 * **call** nahi karta — sirf request handle karte waqt. Cycle tab toot-ti hai jab koi
 * top-level pe doosre ka export use kare; yahan wo kahin nahi hota.
 *
 * Wajah ye rakhne ki: menu delete hone pe uska footer reference saaf karna **menus ka
 * farz** hai (wahi jagah jahan location assignments clear hoti hain), aur footer columns
 * ka data **settings ka** hai. Ek chhota event bus is ek jodi ke liye zyada hai.
 */
import { clearFooterMenuReferences, isMenuUsedInFooter } from '../settings/service.js'
import { Menu, MenuLocation } from './model.js'

/**
 * Menus ka business logic — R1. Controller sirf validate karke yahan bhejta hai.
 */

const scope = (siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) => ({ siteId, locale })

// ── ids ──────────────────────────────────────────────────────────────────────

/**
 * Har node ko ek stable `id` deta hai.
 *
 * Ye **normalization** hai, business logic nahi — par phir bhi service me hai, model ke
 * hook me nahi: `findOneAndUpdate` `save` hooks chalata hi nahi (R1), aur menu hamesha
 * `findOneAndUpdate` se likhta hai. Hook me rakhne ka nateeja hota ki ids chup-chaap
 * assign hi na hon.
 *
 * Maujooda id **kabhi overwrite nahi hoti** — wo reorder ke aar-paar stable rehni chahiye.
 */
function withIds(items = []) {
  return items.map((item) => {
    const withId = { ...item, id: item.id || randomUUID() }

    if (withId.menuType === MENU_TYPE.DROPDOWN) {
      withId.children = (withId.children ?? []).map((child) => ({
        ...child,
        id: child.id || randomUUID(),
        children: (child.children ?? []).map((g) => ({ ...g, id: g.id || randomUUID() })),
      }))
    }

    if (withId.menuType === MENU_TYPE.MEGA && withId.mega) {
      withId.mega = {
        ...withId.mega,
        columns: (withId.mega.columns ?? []).map((col) => ({
          ...col,
          id: col.id || randomUUID(),
          groups: (col.groups ?? []).map((group) => ({
            ...group,
            id: group.id || randomUUID(),
            links: (group.links ?? []).map((l) => ({ ...l, id: l.id || randomUUID() })),
          })),
        })),
      }
    }

    return withId
  })
}

// ── cache ────────────────────────────────────────────────────────────────────

/**
 * Ek menu jitni locations pe assigned hai, un sabke tags invalidate karo.
 *
 * ⚠️ `cache-invalidation` skill me ye pehle `menu.location` padhta tha — **par location
 * menu pe hai hi nahi**. Wo `menuLocations` ka assignment hai, aur ek hi menu **kai**
 * locations pe ho sakta hai. Sirf ek tag invalidate karne ka nateeja: footer badla, par
 * header purana hi dikhta raha (D-43).
 *
 * @param {string} menuId
 */
async function invalidateMenu(menuId, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const assignments = await MenuLocation.find({ ...scope(siteId, locale), menuId }).lean()
  const tags = assignments.map((a) => `menu:${a.location}`)

  /**
   * Footer ke columns ab locations nahi hain (D-44) — wo `settings.footerColumns[]` me
   * hain, aur unka data `/api/public/settings` se jaata hai. Isliye ek footer menu
   * badalne pe stale hone wala tag `menu:*` nahi, **`settings`** hai.
   *
   * Ye bilkul wahi galti ka agla roop hai jo D-43 §4 me pakdi gayi thi: tag wahan se
   * lena chahiye jahan assignment sach me rehti hai, wahan se nahi jahan pehle rehti thi.
   */
  if (await isMenuUsedInFooter(menuId, siteId)) tags.push('settings')

  await revalidateTags(tags)
}

/**
 * Menu maujood hai ya nahi — `mediaExists` ka menu wala bhai.
 *
 * Settings service isse tab bulati hai jab admin footer column me menu chunta hai
 * (D-44): reference save hone se **pehle** check hoti hai, taaki footer chup-chaap
 * khaali column render na kare.
 *
 * Bekaar id (jo ObjectId hai hi nahi) pe `false` milta hai, CastError nahi.
 *
 * @param {string} id
 * @param {string} [siteId]
 */
export async function menuExists(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  if (!mongoose.isValidObjectId(id)) return false

  return Boolean(await Menu.exists({ _id: id, ...scope(siteId, locale), deletedAt: null }))
}

// ── menus ────────────────────────────────────────────────────────────────────

/**
 * Admin ki list — R14, pagination day 1 se.
 *
 * Menus aaj gine-chune hote hain, par "abhi to kam hain" har list pe kaha jaata hai aur
 * baad me kisi ek pe galat nikalta hai.
 */
export async function listMenus(query, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const { page, limit } = query
  const filter = { ...scope(siteId, locale), deletedAt: null }

  const [docs, total] = await Promise.all([
    Menu.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Menu.countDocuments(filter),
  ])

  return {
    menus: docs.map(toAdminMenu),
    meta: { page, limit, total },
  }
}

/**
 * Admin ko jaane wala shape.
 *
 * `toPublicMenu` yahan **use nahi hota** — admin ko `version` chahiye (uske bina wo
 * optimistic concurrency ka token wapas nahi bhej sakta) aur poora raw tree chahiye,
 * resolved `href` nahi.
 */
function toAdminMenu(doc) {
  if (!doc) return null
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, __v, ...rest } = plain

  return { ...rest, id: String(_id) }
}

export async function getMenu(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const doc = await Menu.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null })
  if (!doc) throw notFound('Menu not found')

  return toAdminMenu(doc)
}

export async function createMenu(input, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const existing = await Menu.findOne({ ...scope(siteId, locale), key: input.key })
  if (existing) throw conflict('A menu with this key already exists')

  const doc = await Menu.create({
    ...scope(siteId, locale),
    key: input.key,
    name: input.name,
    items: withIds(input.items ?? []),
    version: 0,
  })

  return toAdminMenu(doc)
}

/**
 * Update — `version` mismatch pe `409`.
 *
 * Menu ek bada nested tree hai, aur do admin ka ek saath save karna theek wahi case hai
 * jisme "last write wins" chup-chaap kisi ka poora kaam mita deta hai. Client jo version
 * padh kar aaya tha wahi wapas bhejta hai; badal chuka ho to use bataya jaata hai.
 */
export async function updateMenu(id, input, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Menu.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null })
  if (!current) throw notFound('Menu not found')

  if (input.version !== undefined && input.version !== current.version) {
    throw conflict('Someone else changed this menu while you were editing')
  }

  const $set = { version: current.version + 1 }
  if (input.name !== undefined) $set.name = input.name
  if (input.items !== undefined) $set.items = withIds(input.items)

  const updated = await Menu.findOneAndUpdate({ _id: id }, { $set }, { new: true })

  await invalidateMenu(id, siteId, locale)

  return toAdminMenu(updated)
}

/**
 * Soft delete (R12) — aur uske saare location assignments clear.
 *
 * Assignments clear na karne ka nateeja chup-chaap hota hai: location ek marey hue menu
 * ko point karti rehti hai aur public read khaali lautata rehta hai, bina wajah bataye.
 *
 * Slice 0 me menu ka Trash/restore screen **nahi** hai (spec 006 §9.3) — field reserve
 * hai, UI Phase 2 ke Trash work ke saath aayegi.
 */
export async function deleteMenu(id, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const current = await Menu.findOne({ _id: id, ...scope(siteId, locale), deletedAt: null })
  if (!current) throw notFound('Menu not found')

  // Tags delete se **pehle** collect karo — clear karne ke baad assignments mil hi nahi
  // paatin, aur wahi locations stale reh jaatin.
  await invalidateMenu(id, siteId, locale)

  await Menu.updateOne({ _id: id }, { $set: { deletedAt: new Date() } })
  await MenuLocation.updateMany(
    { ...scope(siteId, locale), menuId: id },
    { $set: { menuId: null } },
  )

  /**
   * Footer ke columns bhi is menu ko point kar rahe ho sakte hain (D-44).
   *
   * Column **delete nahi hota**, sirf uska `menuId` `null` hota hai — heading aur text
   * blocks client ka content hain. Ye wahi invariant hai jo locations pe upar chal raha
   * hai: koi reference kisi marey hue menu pe na bachi rahe.
   */
  await clearFooterMenuReferences(id, siteId)

  return { id }
}

// ── locations ────────────────────────────────────────────────────────────────

/**
 * Theme jo locations declare karta hai, unke saath current assignment.
 *
 * List **theme se** aati hai, DB se nahi — DB me sirf assignment hoti hai. Isliye theme
 * me nayi location jodne pe wo turant admin me dikhne lagti hai, bina kisi migration ke
 * (D-17).
 */
export async function getMenuLocations(siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const rows = await MenuLocation.find(scope(siteId, locale)).lean()
  const assigned = new Map(rows.map((r) => [r.location, r.menuId]))

  return THEME_MENU_LOCATIONS.map((l) => ({
    location: l.id,
    label: l.label,
    menuId: assigned.get(l.id) ?? null,
  }))
}

/**
 * Assignments set karo. `menuId: null` = "Not assigned", wo ek valid choice hai.
 */
export async function setMenuLocations(input, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const touched = new Set()

  for (const { location, menuId } of input.locations) {
    if (!isThemeMenuLocation(location)) {
      throw badRequest(`Unknown theme location: ${location}`)
    }

    if (menuId) {
      const menu = await Menu.findOne({ _id: menuId, ...scope(siteId, locale), deletedAt: null })
      if (!menu) throw badRequest('The selected menu could not be found')
    }

    const existing = await MenuLocation.findOne({ ...scope(siteId, locale), location }).lean()

    // Purani AUR nayi dono location stale hoti hai — dono invalidate karni padti hain.
    if ((existing?.menuId ?? null) !== (menuId ?? null)) touched.add(location)

    await MenuLocation.updateOne(
      { ...scope(siteId, locale), location },
      { $set: { menuId: menuId ?? null }, $setOnInsert: scope(siteId, locale) },
      { upsert: true },
    )
  }

  await revalidateTags([...touched].map((l) => `menu:${l}`))

  return getMenuLocations(siteId, locale)
}

// ── public ───────────────────────────────────────────────────────────────────

/**
 * Public read — location se menu.
 *
 * Unassigned location ya deleted menu pe **404 nahi**, khaali menu jaata hai. Public site
 * ka header ek missing assignment pe crash nahi hona chahiye — khaali cheez khaali dikhe,
 * tooti hui nahi (D-30).
 */
export async function getPublicMenu(location, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  const empty = { location, menu: null, items: [] }

  if (!isThemeMenuLocation(location)) throw notFound('Unknown menu location')

  const assignment = await MenuLocation.findOne({ ...scope(siteId, locale), location }).lean()
  if (!assignment?.menuId) return empty

  const menu = await Menu.findOne({
    _id: assignment.menuId,
    ...scope(siteId, locale),
    deletedAt: null,
  }).lean()

  if (!menu) return empty

  const publicMenu = toPublicMenu(menu)

  return { location, menu: { key: publicMenu.key, name: publicMenu.name }, items: publicMenu.items }
}

/**
 * Public read — **id se** menu, location se nahi.
 *
 * Footer ke columns D-44 me `settings.footerColumns[].menuId` pe chale gaye, isliye
 * unhe location wale raaste se nahi padha ja sakta. Baaki sab `getPublicMenu` jaisa hi
 * hai: deleted ya na-mile menu pe **404 nahi**, `null`.
 *
 * `null` isliye (khaali object nahi) ki caller ko farq karna padta hai — column me menu
 * assign hi nahi tha, aur menu assign tha par mit gaya, dono ka nateeja ek hai: us column
 * me koi list render nahi hoti.
 *
 * @param {string | null} menuId
 * @returns {Promise<{ key: string, name: string, items: any[] } | null>}
 */
export async function getPublicMenuById(menuId, siteId = DEFAULT_SITE_ID, locale = DEFAULT_LOCALE) {
  if (!menuId || !mongoose.isValidObjectId(menuId)) return null

  const menu = await Menu.findOne({ _id: menuId, ...scope(siteId, locale), deletedAt: null }).lean()
  if (!menu) return null

  const publicMenu = toPublicMenu(menu)

  return { key: publicMenu.key, name: publicMenu.name, items: publicMenu.items }
}
