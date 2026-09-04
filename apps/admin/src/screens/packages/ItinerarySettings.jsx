import { useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'

/**
 * Itinerary Settings — package pages ke wo do faisle jo har page pe ek jaise hain (D-82).
 *
 * ## Ye alag screen kyun hai
 *
 * `PackageDefaults.jsx` pehle se teen mode sambhalti hai (What's Included · Itinerary Images ·
 * Section Headings) aur 700 line ki hai. Ek checkbox aur do number ke liye usme chautha mode
 * jodne se wo aur uljhti, jabki inka apna kuch bhi saanjha nahi hai.
 *
 * Data wahi hai — `packageDefaults` singleton, wahi `PATCH /package-defaults`.
 *
 * ## Dono cheezein pehle **code me gadi hui** thi
 *
 * | Pehle | Ab |
 * | --- | --- |
 * | `entry.fields.seoSchema` — har package pe ek checkbox | yahan, ek jagah |
 * | API me `limit(12)` | `similar.total` |
 * | `Similar.jsx` me `const PER_PAGE = 3` | `similar.perPage` |
 *
 * ⚠️ Structured data ka toggle per-package tha aur uska nateeja data me dikha: **paanchon
 * package pe wo `false` mila** — yaani ek bana-banaya feature kabhi chala hi nahi. Wo
 * per-package faisla hai bhi nahi: site ya to structured data bhejti hai ya nahi.
 */
export default function ItinerarySettings() {
  const { can } = useAuth()
  const readOnly = !can('packageDefaults.update')

  const [seoSchema, setSeoSchema] = useState(true)
  const [total, setTotal] = useState(12)
  const [perPage, setPerPage] = useState(3)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    api
      .get('/package-defaults')
      .then((res) => {
        const data = res.data.data.packageDefaults

        setSeoSchema(data.seoSchema !== false)
        setTotal(data.similar?.total ?? 12)
        setPerPage(data.similar?.perPage ?? 3)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      await api.patch('/package-defaults', { seoSchema, similar: { total, perPage } })
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  return (
    <>
      <div className="page-head">
        <h1>Itinerary Settings</h1>
      </div>
      <p className="subtitle">These apply to every package page, not to one package.</p>

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
        </div>
      )}

      <form onSubmit={save}>
        <div className="panel">
          <div className="panel-head">
            <h2>Search engines</h2>
          </div>
          <div className="panel-body">
            <label className="inline-lbl">
              <input
                type="checkbox"
                checked={seoSchema}
                disabled={readOnly}
                onChange={(e) => setSeoSchema(e.target.checked)}
              />{' '}
              Emit Product + Trip schema
            </label>
            <p className="hint">
              Sends the trip, its day-by-day plan, prices and rating to search engines as structured
              data. This is what makes the price and star rating show up in Google results.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Similar itineraries</h2>
          </div>
          <div className="panel-body">
            <div className="field">
              <label htmlFor="similarTotal">How many to find</label>
              <input
                id="similarTotal"
                className="inp"
                type="number"
                min="0"
                max="60"
                value={total}
                disabled={readOnly}
                onChange={(e) => setTotal(Number(e.target.value))}
              />
              <p className="hint">
                The most packages that can appear in this section. Only packages with the same
                nights and days are ever shown.
              </p>
            </div>

            <div className="field">
              <label htmlFor="similarPerPage">How many per page</label>
              <input
                id="similarPerPage"
                className="inp"
                type="number"
                min="1"
                max="12"
                value={perPage}
                disabled={readOnly}
                onChange={(e) => setPerPage(Number(e.target.value))}
              />
              <p className="hint">
                {/*
                  Ginti yahin dikha di jaati hai — client ne "10 me se 5, phir pagination" hi
                  poochha tha, aur do number se page kitne banenge ye khud ginwana usse ek
                  sawaal kam kar deta hai.
                */}
                Cards shown at a time. {total} found and {perPage} per page means{' '}
                <b>{perPage > 0 ? Math.ceil(total / perPage) : 0}</b> page
                {perPage > 0 && Math.ceil(total / perPage) === 1 ? '' : 's'} of pagination.
              </p>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={readOnly || saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </>
  )
}
