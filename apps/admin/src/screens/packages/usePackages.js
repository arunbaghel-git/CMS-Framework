import { useEffect, useState } from 'react'

import { api } from '../../lib/api.js'
import { useContentType, useEntry, useEntryCounts, useEntryList } from '../../lib/use-entries.js'

/**
 * Packages screens ka data — spec 007 Slice 3.
 *
 * ⚠️ **Generic hisse yahan se nikal gaye hain** (D-87 §7 · Slice C). List, counts, ek entry,
 * content type, media aur currency — ye chhe kisi bhi content type pe ek jaise hain, aur ab
 * `lib/use-entries.js` me rehte hain. Pages aur Tour Pages ki screens wahi use karti hain.
 *
 * Copy karna sasta dikhta tha aur mehnga hota: is repo me wo galti do baar ho chuki hai aur
 * dono baar shakl ek thi — `bestFor` similar cards pe chhoot gaya tha (2 Sep), aur Bulk
 * Upload ka slug do jagah do tarah se banta tha (D-86); us ek `null` se teen guard chup-chaap
 * mar gaye the.
 *
 * Neeche jo bacha hai wo sach me **packages ka apna** hai: taxonomy, transfer, hotel aur
 * add-on ki lists.
 *
 * ⚠️ Exported naam **jaan-boojh kar wahi** rakhe gaye hain (`usePackages`, `usePackage`,
 * `usePackageCounts`, `usePackageType`) — Slice 3-6 ki paanch screens ko haath lagane ki koi
 * wajah nahi thi.
 */

export const PACKAGE_TYPE = 'package'

export const usePackages = (query) => useEntryList(PACKAGE_TYPE, query)
export const usePackageCounts = (reloadKey) => useEntryCounts(PACKAGE_TYPE, reloadKey)
export const usePackageType = () => useContentType(PACKAGE_TYPE)
export const usePackage = (id) => useEntry(id)

export { useMediaById, useSiteCurrency } from '../../lib/use-entries.js'

/**
 * Ek taxonomy ki poori list — Destinations ya Package Type.
 *
 * Ye jaan-boojh kar **poori** aati hai (`limit: 200`), paginated nahi: ye list screen ke
 * filter dropdown aur editor ke checklist dono bharti hai, aur dono ko ek saath saare
 * option chahiye. Client ki vocabulary itni badi nahi hoti — aur 200 se aage jaaye to wo
 * apne aap me ek sawaal hai.
 */
export function useTaxonomyList(type) {
  const [items, setItems] = useState([])

  useEffect(() => {
    api
      .get('/taxonomies', { params: { type, limit: 200, sort: 'name', order: 'asc' } })
      .then((res) => setItems(res.data.data.taxonomies))
      .catch(() => setItems([]))
  }, [type])

  return items
}

/**
 * Transfer list — Itinerary Builder ke har din ka dropdown.
 *
 * `useTaxonomyList` jaisa hi, par ye `master-lists` module se aati hai (taxonomy nahi hai —
 * uska apna URL aur publish lifecycle nahi hai, D-48).
 */
export function useTransferList() {
  const [items, setItems] = useState([])

  useEffect(() => {
    api
      .get('/transfers', { params: { limit: 200 } })
      .then((res) => setItems(res.data.data.items))
      .catch(() => setItems([]))
  }, [])

  return items
}

/**
 * Hotels aur Add Ons ki poori list — Pricing/Hotels panel aur Add-ons checklist ke liye.
 *
 * `useTransferList` jaisa hi pattern, aur wahi `limit: 200` wali soch. Hotels ka case
 * thoda alag hai: wo master lists me **sabse pehle badi** hone wali list hai (har
 * destination pe chaar category), isliye 200 pe pahunchna yahan sabse pehle mumkin hai.
 * Us din ye dropdown ek search wala control banega — par wo tab, jab wo sach me ho.
 *
 * @param {string} path `hotels` ya `add-ons`
 */
function useMasterList(path) {
  const [items, setItems] = useState([])

  useEffect(() => {
    api
      .get(`/${path}`, { params: { limit: 200 } })
      .then((res) => setItems(res.data.data.items))
      .catch(() => setItems([]))
  }, [path])

  return items
}

export const useHotelList = () => useMasterList('hotels')
export const useAddOnList = () => useMasterList('add-ons')
