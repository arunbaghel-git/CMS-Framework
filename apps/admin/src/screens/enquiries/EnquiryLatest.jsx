import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { api } from '../../lib/api.js'

/**
 * `Enquiry Detail` — sidebar ka wo item jo design ke nav me hai.
 *
 * Detail page ko ek enquiry ki **id** chahiye, par nav item ke paas koi id nahi hoti. Isliye
 * ye **sabse nayi** enquiry kholta hai — client ka matlab bhi wahi tha ("it should show
 * enquiry details"), aur inbox me sabse aam kaam bhi yahi hai: jo abhi aayi hai use dekhna.
 *
 * ⚠️ Pehle ye seedha list pe bhej deta tha. Wo galat tha — item ka naam "Enquiry Detail" hai,
 * aur wo list dikhata tha (client ne 3 Sep ko yahi pakda).
 *
 * Ek bhi enquiry na ho to list pe — kyunki tab dikhane ko detail hai hi nahi.
 */
export default function EnquiryLatest() {
  const [state, setState] = useState({ id: null, empty: false, error: null })

  useEffect(() => {
    api
      .get('/enquiries', { params: { limit: 1 } })
      .then((res) => {
        const latest = res.data.data.enquiries?.[0]
        setState({ id: latest?.id ?? null, empty: !latest, error: null })
      })
      /**
       * Fail hone pe list pe bhej dete hain, error screen nahi.
       *
       * Ye ek **raasta** hai, manzil nahi: yahan atak kar error dikhane se behtar hai user
       * ko wahan pahuncha dena jahan se wo khud koi enquiry khol le.
       */
      .catch(() => setState({ id: null, empty: true, error: true }))
  }, [])

  if (state.id) return <Navigate to={`/enquiries/${state.id}`} replace />

  if (state.empty) {
    return (
      <>
        <div className="page-head">
          <h1>Enquiry Detail</h1>
          <Link className="btn page-title-action" to="/enquiries">
            All Enquiries
          </Link>
        </div>
        <p className="muted">
          No enquiries yet. When someone submits an enquiry form, the newest one opens here.
        </p>
      </>
    )
  }

  return <p className="muted">Loading…</p>
}
