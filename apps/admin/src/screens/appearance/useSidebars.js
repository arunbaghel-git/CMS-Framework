import { useCallback, useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'

/**
 * Sidebars ka data — D-88.
 *
 * ⚠️ **Ye hooks `query` object nahi lete, alag-alag primitives lete hain.** 8 Sep ko wahi ek
 * cheez `useEntryList` pe bug bani thi: `PageEdit` inline object bhejta tha, har render pe wo
 * naya hota tha, `useCallback` ki dep har baar badalti thi aur request ka infinite loop chal
 * padta tha. Client ko wo _"Bahut zyada requests"_ ki shakl me dikha, kyunki rate limiter ne
 * use sunai dene laayak bana diya — warna wo chup-chaap chalta rehta.
 *
 * Primitives pe wo ho hi nahi sakta: string aur number ki identity nahi hoti, value hoti hai.
 */

export function useSidebars({ page = 1, limit = 50, q = '' } = {}) {
  const [state, setState] = useState({ data: [], meta: null, loading: true, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await api.get('/sidebars', { params: { page, limit, q: q || undefined } })

      setState({
        data: res.data.data.sidebars,
        meta: res.data.meta,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState({ data: [], meta: null, loading: false, error: errorMessage(err) })
    }
  }, [page, limit, q])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}

/**
 * Ek sidebar — editor screen ke liye.
 *
 * `id` na ho to naya sidebar: server ko koi call nahi jaati, khaali shape yahin banta hai.
 * Wahi rasta jo `useForm(id)` pe hai.
 */
export function useSidebar(id) {
  const [state, setState] = useState({ data: null, loading: Boolean(id), error: null })

  const load = useCallback(async () => {
    if (!id) {
      setState({ data: { name: '', widgets: [], version: 0 }, loading: false, error: null })
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await api.get(`/sidebars/${id}`)
      setState({ data: res.data.data.sidebar, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: errorMessage(err) })
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}
