import { useCallback, useEffect, useState } from 'react'

import { api, errorMessage } from './api.js'

/**
 * `entries` engine ke generic data hooks — **kisi bhi content type ke liye** (D-87 §7).
 *
 * ## Ye file kyun bani
 *
 * Ye saara code `screens/packages/usePackages.js` me tha, aur wahan `PACKAGE_TYPE` hardcoded
 * tha. Slice C me Pages aur Tour Pages ki apni list screens aayi jinhe **bilkul wahi** chahiye
 * tha — list, counts, ek entry, content type, media.
 *
 * Copy karna sabse sasta dikhta tha aur sabse mehnga hota. Is repo me wo galti **do baar**
 * ho chuki hai aur dono baar ek jaisi shakl thi: ek jagah field juda, doosri jagah nahi.
 * `bestFor` similar cards pe chhoot gaya tha (2 Sep), aur Bulk Upload ka slug do jagah do
 * tarah se banta tha (D-86) — us ek `null` se teen guard chup-chaap mar gaye the.
 *
 * ⚠️ `usePackages.js` ab inhi ke patle wrapper hai. Uske exported naam **jaan-boojh kar wahi**
 * rakhe gaye hain, taaki Slice 3-6 ki paanch screens ko haath na lagana pade.
 *
 * Ek baat poore file me chalti hai: **filter aur page server ko jaate hain, client pe filter
 * nahi hota** (R14). 500 entries browser me la kar chhaanna wahi galti hai jo har admin panel
 * dheema karti hai.
 */

/** List — `entryListQuerySchema` ke params hi jaate hain. */
export function useEntryList(type, query) {
  const [state, setState] = useState({ data: [], meta: null, loading: true, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await api.get('/entries', { params: { type, ...query } })
      setState({ data: res.data.data.entries, meta: res.data.meta, loading: false, error: null })
    } catch (err) {
      setState({ data: [], meta: null, loading: false, error: errorMessage(err) })
    }
  }, [type, query])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}

/**
 * Tabs ke counts — All · Published · Drafts · Trash.
 *
 * **Ek hi call** me sab aate hain. Paanch alag requests ka matlab hota paanch alag waqt ke
 * jawab: ek tab 58 dikhata aur doosra 57, aur wo farq kabhi samajh nahi aata.
 *
 * `reloadKey` isliye hai ki koi bhi write (trash, bulk, restore) ke baad counts turant badalne
 * chahiye — warna user trash karta hai aur tab me purana number khada rehta hai.
 */
export function useEntryCounts(type, reloadKey) {
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    api
      .get('/entries/counts', { params: { type } })
      // Counts na mile to tabs bina number ke dikhein — list phir bhi kaam karti rahe
      .then((res) => setCounts(res.data.data.counts))
      .catch(() => setCounts(null))
  }, [type, reloadKey])

  return counts
}

/**
 * Ek entry — edit screen ke liye.
 *
 * `id` na ho to koi call nahi hoti aur `entry` `null` rehta hai; wahi "Add New" ka case hai.
 */
export function useEntry(id) {
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
 * Ek content type — uska field set aur `supports`.
 *
 * Editor iske hisaab se chalta hai, hardcoded list se nahi: field set **code-owned** hai
 * (D-46) aur badalta rehta hai. Screen ko usme kuch nahi badalna chahiye.
 */
export function useContentType(key) {
  const [contentType, setContentType] = useState(null)

  useEffect(() => {
    api
      .get('/content-types')
      .then((res) => setContentType(res.data.data.contentTypes.find((t) => t.key === key) ?? null))
      .catch(() => setContentType(null))
  }, [key])

  return contentType
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

/**
 * Site ki currency — list ke `From price` column ke liye (client, 1 Sep).
 *
 * Currency package pe **nahi** hai, `settings.currency` pe hai (D-56 §2).
 *
 * Call fail ho jaaye to `INR` — wahi default `formatPrice()` ka bhi hai. List currency ke liye
 * kabhi rukni nahi chahiye: daam galat chinh ke saath dikhna khaali list se behtar hai.
 */
export function useSiteCurrency() {
  const [currency, setCurrency] = useState('INR')

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setCurrency(res.data.data.settings?.currency ?? 'INR'))
      .catch(() => setCurrency('INR'))
  }, [])

  return currency
}
