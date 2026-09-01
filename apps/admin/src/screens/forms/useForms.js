import { useCallback, useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'

/**
 * Enquiry forms ka data — client, 1 Sep.
 *
 * Wahi lakeer jo `usePackages.js` pe hai: **filter aur page server ko jaate hain, client pe
 * filter nahi hota** (R14).
 */

/** List + tabs ke counts — dono ek hi call se aate hain (controller unhe saath bhejta hai). */
export function useForms(query) {
  const [state, setState] = useState({
    data: [],
    counts: null,
    meta: null,
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await api.get('/forms', { params: query })
      setState({
        data: res.data.data.forms,
        counts: res.data.data.counts,
        meta: res.data.meta,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState({
        data: [],
        counts: null,
        meta: null,
        loading: false,
        error: errorMessage(err),
      })
    }
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}

/** Ek form — builder screen ke liye. `id` na ho to naya form (server default deta hai). */
export function useForm(id) {
  const [state, setState] = useState({ form: null, loading: Boolean(id), error: null })

  const load = useCallback(async () => {
    if (!id) {
      setState({ form: null, loading: false, error: null })
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await api.get(`/forms/${id}`)
      setState({ form: res.data.data.form, loading: false, error: null })
    } catch (err) {
      setState({ form: null, loading: false, error: errorMessage(err) })
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}
