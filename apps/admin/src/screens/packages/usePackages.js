import { useCallback, useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'

/**
 * Packages screens ka data — spec 007 Slice 3.
 *
 * Ek baat poore file me chalti hai: **filter aur page server ko jaate hain, client pe
 * filter nahi hota** (R14). 500 packages browser me la kar chhaanna wahi galti hai jo har
 * admin panel dheema karti hai.
 */

export const PACKAGE_TYPE = 'package'

/** List — `entryListQuerySchema` ke params hi jaate hain. */
export function usePackages(query) {
  const [state, setState] = useState({ data: [], meta: null, loading: true, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await api.get('/entries', { params: { type: PACKAGE_TYPE, ...query } })
      setState({
        data: res.data.data.entries,
        meta: res.data.meta,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState({ data: [], meta: null, loading: false, error: errorMessage(err) })
    }
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}

/**
 * Tabs ke counts — All · Published · Drafts · Trash. (Sold Out wala tab nahi hai —
 * `availability` field hi hata di gayi, D-54.)
 *
 * **Ek hi call** me sab aate hain. Paanch alag requests ka matlab hota paanch alag waqt
 * ke jawab: ek tab 58 dikhata aur doosra 57, aur wo farq kabhi samajh nahi aata.
 *
 * `reloadKey` isliye hai ki koi bhi write (trash, bulk, restore) ke baad counts turant
 * badalne chahiye — warna user trash karta hai aur tab me purana number khada rehta hai.
 */
export function usePackageCounts(reloadKey) {
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    api
      .get('/entries/counts', { params: { type: PACKAGE_TYPE } })
      .then((res) => setCounts(res.data.data.counts))
      // Counts na mile to tabs bina number ke dikhein — list phir bhi kaam karti rahe
      .catch(() => setCounts(null))
  }, [reloadKey])

  return counts
}

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
 * @param {string} path abhi sirf `hotels` — add-ons editor me chune hi nahi jaate (D-61)
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

/**
 * `package` content type — uska field set aur `supports`.
 *
 * Editor iske hisaab se chalta hai, hardcoded list se nahi: field set **code-owned** hai
 * (D-46) aur Slice 4-6 me badhega. Screen ko usme kuch nahi badalna chahiye.
 */
export function usePackageType() {
  const [contentType, setContentType] = useState(null)

  useEffect(() => {
    api
      .get('/content-types')
      .then((res) =>
        setContentType(res.data.data.contentTypes.find((t) => t.key === PACKAGE_TYPE) ?? null),
      )
      .catch(() => setContentType(null))
  }, [])

  return contentType
}

/**
 * Ek package — edit screen ke liye.
 *
 * `id` na ho to koi call nahi hoti aur `entry` `null` rehta hai; wahi "Add New" ka case hai.
 */
export function usePackage(id) {
  const [state, setState] = useState({ entry: null, loading: Boolean(id), error: null })

  const load = useCallback(async () => {
    if (!id) {
      setState({ entry: null, loading: false, error: null })
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await api.get(`/entries/${id}`)
      setState({ entry: res.data.data.entry, loading: false, error: null })
    } catch (err) {
      setState({ entry: null, loading: false, error: errorMessage(err) })
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load, setEntry: (entry) => setState((s) => ({ ...s, entry })) }
}

/**
 * Media ids → poore media documents (banner ka preview dikhane ke liye).
 *
 * ⚠️ Media resolve na ho to yahan `undefined` rehta hai aur `MediaDrop` khaali drop zone
 * dikhata hai — **toota hua `<img>` kabhi nahi** (D-42 §2). Wo invariant sirf data ka nahi
 * hai; delivery layer pe bhi toot sakta hai (D-43 §6), isliye preview hamesha resolved
 * document se aata hai, id se banaye hue URL se nahi.
 */
export function useMediaById(ids) {
  const [media, setMedia] = useState({})
  const key = ids.filter(Boolean).sort().join(',')

  useEffect(() => {
    const wanted = key ? key.split(',') : []
    if (wanted.length === 0) {
      setMedia({})
      return
    }

    let cancelled = false

    Promise.all(
      wanted.map((id) =>
        api
          .get(`/media/${id}`)
          .then((res) => [id, res.data.data.media])
          .catch(() => [id, null]),
      ),
    ).then((pairs) => {
      if (cancelled) return
      setMedia(Object.fromEntries(pairs.filter(([, doc]) => doc)))
    })

    return () => {
      cancelled = true
    }
  }, [key])

  return media
}
