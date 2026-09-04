import { IMPORT_RUN_TERMINAL } from '@cms/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'

/**
 * Bulk Upload ka data (D-81).
 *
 * Hand-rolled `useState` + `useEffect` — `@tanstack/react-query` package me hai par is admin me
 * kahin use nahi hota, aur ek feature ke liye doosra pattern shuru karna baaki screens se mel
 * nahi khaata.
 */

/** Purane run ki list — Bulk Upload screen ke neeche. */
export function useImportRuns() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/bulk-imports', { params: { page: 1, limit: 20 } })
      setRuns(res.data.data.runs)
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { runs, loading, error, reload }
}

/** Chalta hua import kitni der me dobara poochha jaaye. */
const POLL_MS = 3000

/**
 * Ek run — aur jab tak wo chal raha ho, har 3 second me dobara.
 *
 * ## Poll, SSE nahi
 *
 * Is codebase me na koi queue hai na SSE; akela long-running pattern `publishDueEntries()` ka
 * claim-loop hai. Ek chhote feature ke liye naya transport gadhna theek nahi tha — 20 line ka
 * `setTimeout` wahi kaam kar deta hai.
 *
 * ⚠️ **Poll khatam hone pe ruk jaati hai**, aur wo zaroori hai: prod me rate limiter 120
 * request/minute **per IP** hai, aur ek office ek hi IP ke peeche hota hai. Ek bhoola hua
 * 3-second poll do khule tab me poore admin ko 429 dila sakta hai — aur wo aisa dikhega jaise
 * importer ne kuch tod diya ho.
 *
 * `useRef` isliye ki timer ko cleanup me pakadna hai; `id` badalne ya screen band hone pe wo
 * turant band ho jaana chahiye.
 */
export function useImportRun(id) {
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    let alive = true

    async function tick() {
      try {
        const res = await api.get(`/bulk-imports/${id}`)
        if (!alive) return

        const next = res.data.data.run
        setRun(next)
        setError(null)

        /** Ho gaya to dobara mat poochho. */
        if (!IMPORT_RUN_TERMINAL.includes(next.status)) {
          timer.current = setTimeout(tick, POLL_MS)
        }
      } catch (err) {
        if (alive) setError(errorMessage(err))
      } finally {
        if (alive) setLoading(false)
      }
    }

    tick()

    return () => {
      alive = false
      clearTimeout(timer.current)
    }
  }, [id])

  return { run, loading, error }
}

/** Naya import shuru karo — run ki id lauti hai. */
export async function startImport(sheetUrl) {
  const res = await api.post('/bulk-imports', { sheetUrl })

  return res.data.data.run
}
