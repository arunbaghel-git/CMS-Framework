import { useCallback, useEffect, useState } from 'react'

import { api, errorMessage } from './api.js'

/**
 * Media ka data — Phase 2 ka bacha hua hissa (client, 3 Sep).
 *
 * Foundation D-41 me pull-forward ho chuka tha (upload · WebP variants · storage driver ·
 * hardening). Yahan sirf screen ka data hai.
 *
 * ⚠️ Ye `lib/` me hai, kisi screen ke andar nahi: ise **do** jagah chahiye — Media Library
 * ki screen, aur `MediaPicker` jo `components/admin/` me baithta hai. Screen ke andar rakhne
 * ka matlab hota ek shared component ka kisi screen ke andar se import karna.
 *
 * Wahi niyam jo `usePackages.js` pe hai: **filter aur page server ko jaate hain** (R14).
 * Media wo list hai jo sabse tezi se badhti hai — ek chalti hui site pe hazaar image aam
 * baat hai — isliye yahan client-side filter sabse mehnga hota.
 */

/** Ek image ka sabse chhota chalne laayak variant — grid ke thumbnail ke liye. */
export function thumbOf(media) {
  return media?.variants?.find((variant) => variant.key === 'thumb') ?? media?.variants?.[0]
}

/** Sabse bada variant — detail ke preview aur "Copy URL" ke liye. */
export function largeOf(media) {
  return (
    media?.variants?.find((variant) => variant.key === 'large') ??
    media?.variants?.[media.variants.length - 1] ??
    null
  )
}

export function useMediaList(query) {
  const [state, setState] = useState({
    data: [],
    /** `All dates` dropdown ke vikalp — data se aate hain, banaye nahi jaate. */
    months: [],
    meta: null,
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const res = await api.get('/media', { params: query })
      setState({
        data: res.data.data,
        months: res.data.months ?? [],
        meta: res.data.meta,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState({ data: [], months: [], meta: null, loading: false, error: errorMessage(err) })
    }
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, reload: load }
}

/**
 * Ek file upload — `multipart/form-data`.
 *
 * ⚠️ `Content-Type` **haath se set nahi karte**. Browser use `FormData` ke saath khud
 * lagata hai, aur uske saath ek `boundary` bhi jodta hai; apna header likhne pe wo boundary
 * gayab ho jaata hai aur server request parse hi nahi kar paata.
 *
 * @param {File} file
 */
export async function uploadMedia(file) {
  const body = new FormData()
  body.append('file', file)

  const res = await api.post('/media', body)

  return res.data.data.media
}
