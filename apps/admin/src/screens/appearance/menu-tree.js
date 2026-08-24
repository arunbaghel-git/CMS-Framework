import { MENU_TYPE, allowedColumnCounts } from '@cms/shared'

/**
 * Menu tree ke pure helpers — koi React, koi API nahi.
 *
 * Alag file isliye hai ki ye **testable** hain aur `Menus.jsx` ko chhote rakhte hain.
 * Yahan har function naya object lautata hai; state kabhi jagah pe mutate nahi hoti,
 * warna React ka re-render chup-chaap chhoot jaata hai.
 */

const blankLink = () => ({ type: 'url', url: '', target: '_self', className: '' })

/**
 * Naya node **client pe hi** id le leta hai.
 *
 * Server bhi missing ids bhar deta hai (`withIds`), par tab tak der ho chuki hoti hai:
 * React ki `key` index pe gir jaati, aur index-key + drag-drop milkar chup-chaap galat
 * behave karte — column 1 ko collapse karke position 3 pe drag karo, to "collapsed" wala
 * state position 1 pe hi baitha reh jaata (kyunki wahi key thi).
 *
 * Server client ki di hui id ko rakhta hai, badalta nahi — isliye ye poori tarah safe hai.
 */
const newId = () => crypto.randomUUID()

export const blankItem = () => ({
  id: newId(),
  label: 'New item',
  link: blankLink(),
  className: '',
  menuType: MENU_TYPE.LINK,
})

export const blankChild = () => ({
  id: newId(),
  label: 'New link',
  link: blankLink(),
  className: '',
})

export const blankGroup = () => ({
  id: newId(),
  heading: '',
  link: null,
  className: '',
  links: [],
})

export const blankColumn = () => ({ id: newId(), className: '', groups: [] })

export const blankCta = () => ({ text: '', buttonLabel: '', buttonUrl: '', className: '' })

/**
 * `menuType` badalne pe us type ke liye zaroori fields bana deta hai.
 *
 * Purana data **hataya nahi jaata** — dropdown se mega aur wapas jaane pe children bach
 * jaate hain. Save pe Zod unhe strip kar deta hai, par editor me user ka kaam nahi udta.
 */
export function withMenuType(item, menuType) {
  const next = { ...item, menuType }

  if (menuType === MENU_TYPE.DROPDOWN && !next.children) next.children = []

  if (menuType === MENU_TYPE.MEGA && !next.mega) {
    next.mega = { layout: 'wide', columnCount: 4, className: '', columns: [], cta: null }
  }

  if (menuType === MENU_TYPE.MEGA) next.mega = withColumnCount(next.mega, next.mega.columnCount)

  return next
}

/**
 * `columns[]` ko `columnCount` ke barabar rakhta hai.
 *
 * Server dono ka barabar hona enforce karta hai (spec 006 §2.2) — editor ko bhi wahi
 * karna chahiye, warna user Save dabaane par hi pata chalta hai ki kuch galat hai.
 */
export function withColumnCount(mega, columnCount) {
  const columns = [...(mega.columns ?? [])]

  while (columns.length < columnCount) columns.push(blankColumn())
  columns.length = columnCount

  return { ...mega, columnCount, columns }
}

/**
 * Layout badalne pe column count ko valid range me le aata hai.
 *
 * `wide` se `sm` jaane pe 6 columns valid nahi rehte. Chup-chaap invalid chhod dena
 * matlab Save pe 400 — isliye editor yahin sabse kareeb valid value pe le aata hai.
 */
export function withLayout(mega, layout) {
  const allowed = allowedColumnCounts(layout)
  const columnCount = allowed.includes(mega.columnCount) ? mega.columnCount : allowed.at(-1)

  return withColumnCount({ ...mega, layout }, columnCount)
}

/**
 * Ek item ko `from` se utha kar `to` pe rakh deta hai.
 *
 * Ye **swap nahi** hai. Drag-drop me item beech se nikal kar nayi jagah ghusta hai, aur
 * beech wale sab ek khaana khisak jaate hain — swap karne se 1 se 5 pe drag karna baaki
 * teen ko wahin chhod deta, jo dikhne me galat lagta.
 *
 * Range se bahar ya wahi jagah ho to list waisi hi lautti hai — isliye kinare pe keyboard
 * se ↑/↓ dabaane pe kuch nahi hota.
 */
export function moveItem(list, from, to) {
  if (from === to) return list
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list

  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)

  return next
}

export function replaceAt(list, index, value) {
  const next = [...list]
  next[index] = value
  return next
}

export function removeAt(list, index) {
  return list.filter((_, i) => i !== index)
}

/**
 * `.day-head` me dikhne wala type ka naam.
 *
 * Design me yahi wording hai (`Page`, `Mega menu`, `sub item`) — R11/R15. `entries`
 * jaisa internal naam yahan kabhi nahi jaata.
 */
export function itemTypeLabel(item) {
  if (item.menuType === MENU_TYPE.MEGA) return 'Mega menu'
  if (item.menuType === MENU_TYPE.DROPDOWN) {
    const count = item.children?.length ?? 0
    return `Dropdown · ${count} ${count === 1 ? 'item' : 'items'}`
  }

  return 'Custom link'
}

/** Mega ke summary ki ek line — design ke `4 child items · mega-menu layout enabled` jaisi. */
export function megaSummary(mega) {
  if (!mega) return ''
  const groups = (mega.columns ?? []).reduce((n, col) => n + (col.groups?.length ?? 0), 0)

  return `${mega.columnCount} columns · ${groups} ${groups === 1 ? 'group' : 'groups'} · ${mega.layout}`
}
