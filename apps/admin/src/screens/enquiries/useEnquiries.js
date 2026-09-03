import { useCallback, useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'

/**
 * Enquiries inbox ka data — client, 3 Sep.
 *
 * Wahi niyam jo `usePackages.js` pe hai: **filter aur page server ko jaate hain, client pe
 * filter nahi hota** (R14). Enquiries wo list hai jo sabse tezi se badhti hai — ek chalti
 * hui site pe mahine me sau se upar — isliye yahan ye baat sabse zyada maayne rakhti hai.
 */

/**
 * Status → badge ki class.
 *
 * Nayi classes nahi banayi — `primitives.css` ke maujood variants hi use hote hain (R15).
 * Isiliye ye map yahan hai aur dono screens (list aur detail) isi se padhti hain: do jagah
 * do map ban jaane ka matlab hota ek din ek screen pe rang alag ho jaana.
 */
export const ENQUIRY_BADGE = {
  new: 'b-new',
  contacted: 'b-pend',
  quoted: 'b-pend',
  negotiating: 'b-pend',
  converted: 'b-pub',
  lost: 'b-close',
}

/** List + counts ek hi call me — tabs list ke saath render hote hain, do call me nahi. */
export function useEnquiries(query) {
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
      const res = await api.get('/enquiries', { params: query })
      setState({
        data: res.data.data.enquiries,
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

/**
 * Ek enquiry — uske saath uska form aur derived columns bhi.
 *
 * Columns server se aate hain, yahan derive nahi hote: wahi ek niyam list, detail aur CSV
 * teenon pe chalna chahiye, warna teen jagah teen shakl ban jaati hain.
 */
export function useEnquiry(id) {
  const [state, setState] = useState({ enquiry: null, columns: null, loading: true, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await api.get(`/enquiries/${id}`)
      setState({
        enquiry: res.data.data.enquiry,
        columns: res.data.data.columns,
        form: res.data.data.form,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState({ enquiry: null, columns: null, loading: false, error: errorMessage(err) })
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}

/** Forms ki list — inbox ke "All forms" wale filter ke liye. */
export function useFormOptions() {
  const [forms, setForms] = useState([])

  useEffect(() => {
    api
      .get('/forms', { params: { limit: 100 } })
      .then((res) => setForms(res.data.data.forms ?? []))
      /**
       * Fail ho jaaye to khaali — filter ke bina list phir bhi chalti hai.
       *
       * Wahi soch jo `useSiteCurrency()` pe hai: ek sahayak call ke liye poori screen kabhi
       * nahi rukni chahiye.
       */
      .catch(() => setForms([]))
  }, [])

  return forms
}
