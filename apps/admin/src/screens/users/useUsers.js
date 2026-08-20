import { useCallback, useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'

/**
 * Users list ka data.
 *
 * Filter aur page **server ko** jaate hain, client pe filter nahi hota (R14) —
 * 500 users ko browser me la kar chhaanna wahi galti hai jo har admin panel dheema
 * karti hai.
 */
export function useUsers(query) {
  const [state, setState] = useState({ data: [], meta: null, loading: true, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await api.get('/users', { params: query })
      setState({ data: res.data.data, meta: res.data.meta, loading: false, error: null })
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
 * Roles — form ka dropdown aur list ke tab labels dono isse aate hain.
 *
 * Labels DB se aate hain, code se nahi: Phase 7 me custom roles banenge aur unke naam
 * yahan hardcoded hote to wo kabhi dikhte hi nahi.
 */
export function useRoles() {
  const [roles, setRoles] = useState([])

  useEffect(() => {
    api
      .get('/roles')
      .then((res) => setRoles(res.data.data))
      // Roles na mile to bhi list dikhni chahiye — bas labels ki jagah keys aayengi
      .catch(() => setRoles([]))
  }, [])

  return roles
}
