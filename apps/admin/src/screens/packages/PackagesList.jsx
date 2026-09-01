import { formatPrice, pricedCategories } from '@cms/shared'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import {
  useMediaById,
  usePackageCounts,
  usePackages,
  useSiteCurrency,
  useTaxonomyList,
} from './usePackages.js'
import './Packages.css'

/**
 * All Packages — `admin-design.html` ke `#s-packages` se.
 *
 * Design se **teen jaan-boojh kar liye gaye farq**, teenon client ke faisle se:
 *
 * 1. **`Code` column nahi hai** — Package Code field client ne 26 Aug ko hata diya tha
 *    (D-50 §2). Column rakh kar khaali chhodna user ko har baar confuse karta hai.
 * 2. **`Enq.` column bhi nahi hai** (client, 1 Sep). Wo Slice 3 se `—` dikha raha tha
 *    kyunki Enquiries bani hi nahi thi. Client ne use rakhne ki jagah hatane ko kaha —
 *    Enquiries banne pe wapas aayega.
 * 3. **`From price` ab **poori range** dikhata hai** — `₹24,999 – ₹49,999` (client,
 *    1 Sep: _"i ask to show low price and max price not only low price"_).
 *
 *    Pehle sirf sabse sasta daam tha, kyunki page ke upar wahi chhapta hai. Par list ka kaam
 *    alag hai: wahan client apne saare packages ek saath dekh raha hota hai, aur "yeh package
 *    kitne ka hai" ka jawab ek number se milta hi nahi jab uski chaar category ke chaar daam
 *    hain. Range se pata chalta hai ki package kahan se kahan tak jaata hai.
 *
 *    Dono sire `pricedCategories()` se aate hain — wahi function jo public page ke catbar
 *    aur hotels ke tabs bharta hai, aur wo **sasti se mehngi** ke kram me deta hai. Ek hi
 *    jagah se aane ka matlab hai ki list aur page kabhi alag daam nahi dikha sakte.
 *
 *    Sirf **ek** category ka daam bhara ho to ek hi number aata hai — `₹24,999 – ₹24,999`
 *    likhna ek jhoothi range hai.
 *
 *    ⚠️ **Sort nahi hai, sirf display** (client, 1 Sep — "sort karne ki kya jarurat hai").
 *    Wo waise bhi seedha nahi hota: `From price` stored nahi hai, to Mongo use sort nahi
 *    kar sakti — aggregation ya ek denormalized field chahiye hoti.
 *
 *    Jis package pe koi bhi category ki keemat nahi bhari, wahan `—` hi rehta hai — khaali
 *    daam ka matlab hai "wo category milti hi nahi" (D-56).
 *
 * `Itinerary` row action bhi abhi Edit pe hi le jaata hai — alag itinerary screen Slice 4
 * me banegi.
 */

const STATUS_BADGE = {
  published: 'b-pub',
  draft: 'b-draft',
  pending: 'b-draft',
  scheduled: 'b-draft',
  private: 'b-draft',
}

const STATUS_LABEL = {
  published: 'Published',
  draft: 'Draft',
  pending: 'Pending',
  scheduled: 'Scheduled',
  private: 'Private',
}

/** Design me `2 days ago` jaisa relative time hai — wahi shape. */
function timeAgo(value) {
  if (!value) return '—'

  const diff = Date.now() - new Date(value).getTime()
  const day = 86_400_000

  if (diff < day) return 'Today'
  if (diff < 2 * day) return 'Yesterday'
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} week(s) ago`

  return new Date(value).toLocaleDateString()
}

/** Duration — `6N / 7D`. Dono me se ek bhi na ho to `—`. */
function duration(fields) {
  const nights = fields?.nights
  const days = fields?.days

  if (nights == null && days == null) return '—'

  return `${nights ?? '?'}N / ${days ?? '?'}D`
}

export default function PackagesList() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()

  const destinations = useTaxonomyList('destination')
  const packageTypes = useTaxonomyList('packageType')
  const currency = useSiteCurrency()

  const [selected, setSelected] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)
  /** Har write ke baad counts dobara maangne ke liye. */
  const [writes, setWrites] = useState(0)

  const tab = params.get('tab') ?? 'all'
  const page = Number(params.get('page') ?? 1)
  const destination = params.get('destinations') ?? ''
  const packageType = params.get('packageTypes') ?? ''

  /**
   * Query me **URL wala** search jaata hai, input ka live text nahi — warna har keystroke
   * pe ek API call chali jaati (UsersList me bhi wahi pattern hai).
   */
  const appliedSearch = params.get('q') ?? ''
  const [search, setSearch] = useState(appliedSearch)

  const counts = usePackageCounts(writes)

  /** Tab → query. Trash ek alag view hai, status ka filter nahi (R12). */
  const tabQuery = useMemo(() => {
    if (tab === 'trash') return { trashed: true }
    if (tab === 'published') return { status: 'published' }
    if (tab === 'draft') return { status: 'draft' }
    return {}
  }, [tab])

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      ...tabQuery,
      ...(destination ? { destinations: destination } : {}),
      ...(packageType ? { packageTypes: packageType } : {}),
      ...(appliedSearch ? { q: appliedSearch } : {}),
    }),
    [page, tabQuery, destination, packageType, appliedSearch],
  )

  const { data, meta, loading, error, reload } = usePackages(query)

  /**
   * Rows ke banner — sirf **is page** ke, poori list ke nahi.
   *
   * `useMediaById` har id pe ek call karta hai, aur pagination day 1 se hai (R14), isliye
   * ye 20 se aage kabhi nahi jaata. Bina pagination ke ye 500 calls ban jaata — wahi wajah
   * hai ki ids yahan se aati hain, kisi global list se nahi.
   */
  const media = useMediaById(data.map((entry) => entry.fields?.bannerImage).filter(Boolean))

  const nameOf = (list, id) => list.find((t) => t.id === id)?.name

  /** Ek entry ke destinations/themes ke naam — ids se. */
  function labelFor(entry, key, list) {
    const ids = entry.taxonomies?.[key] ?? []
    const names = ids.map((id) => nameOf(list, id)).filter(Boolean)

    return names.length > 0 ? names.join(', ') : '—'
  }

  function setFilter(next) {
    const merged = { ...Object.fromEntries(params), ...next }
    // Filter badalne pe page 1 pe wapas — warna page 5 pe khaali list dikhti hai
    if (!('page' in next)) delete merged.page
    for (const [k, v] of Object.entries(merged)) if (!v) delete merged[k]

    setSelected([])
    setParams(merged)
  }

  function toggleRow(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const allSelected = data.length > 0 && selected.length === data.length

  async function applyBulk() {
    if (!bulkAction || selected.length === 0) return

    setBusy(true)
    setNotice(null)
    setActionError(null)

    try {
      const res = await api.post('/entries/bulk', { ids: selected, action: bulkAction })
      const { updated, failed } = res.data.data

      /**
       * Bulk fail-soft hai — kuch rows ruk sakti hain (jaise bachche wale item ka trash).
       * Isliye jawab me dono ginti dikhti hain; sirf "ho gaya" bolna jhooth hota.
       */
      setNotice(
        failed.length > 0
          ? `${updated} updated, ${failed.length} could not be updated.`
          : `${updated} item(s) updated.`,
      )
      setSelected([])
      setBulkAction('')
      setWrites((n) => n + 1)
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  /** Row action — ek hi id pe wahi kaam jo bulk karta hai. */
  async function rowAction(id, action) {
    setBusy(true)
    setNotice(null)
    setActionError(null)

    try {
      await api.post(`/entries/${id}/${action}`)
      setWrites((n) => n + 1)
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const TABS = [
    { id: 'all', label: 'All', count: counts?.all },
    { id: 'published', label: 'Published', count: counts?.published },
    { id: 'draft', label: 'Drafts', count: counts?.draft },
    { id: 'trash', label: 'Trash', count: counts?.trash },
  ]

  const canEdit = can('entry.update') || can('entry.update.own')

  return (
    <>
      <div className="page-head">
        <h1>Packages</h1>
        {can('entry.create') && (
          <Link className="btn page-title-action" to="/packages/new">
            Add New Package
          </Link>
        )}
      </div>

      {(error || actionError) && (
        <div className="notice err" role="alert">
          <span>{error ?? actionError}</span>
          <button className="btn btn-sm" type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
        </div>
      )}

      <ul className="subsubsub">
        {TABS.map(({ id, label, count }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={tab === id ? 'current' : ''}
              onClick={(e) => {
                e.preventDefault()
                setFilter({ tab: id === 'all' ? '' : id })
              }}
            >
              {label} {count != null && <span className="cnt">({count})</span>}
            </a>
          </li>
        ))}
      </ul>

      <div className="tablenav">
        {canEdit && (
          <>
            <select
              className="sel"
              style={{ width: 'auto' }}
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              aria-label="Bulk actions"
            >
              <option value="">Bulk actions</option>
              {tab === 'trash' ? (
                <option value="restore">Restore</option>
              ) : (
                <>
                  <option value="feature">Set Featured</option>
                  <option value="unfeature">Remove Featured</option>
                  <option value="trash">Move to Trash</option>
                </>
              )}
            </select>
            <button
              className="btn btn-plain"
              type="button"
              disabled={busy || !bulkAction || selected.length === 0}
              onClick={applyBulk}
            >
              Apply
            </button>
          </>
        )}

        <select
          className="sel"
          style={{ width: 'auto' }}
          value={destination}
          onChange={(e) => setFilter({ destinations: e.target.value })}
          aria-label="Filter by destination"
        >
          <option value="">All destinations</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          className="sel"
          style={{ width: 'auto' }}
          value={packageType}
          onChange={(e) => setFilter({ packageTypes: e.target.value })}
          aria-label="Filter by theme"
        >
          <option value="">All themes</option>
          {packageTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div className="spacer" />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setFilter({ q: search })
          }}
        >
          <input
            className="inp"
            style={{ width: 200 }}
            placeholder="Search packages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="pagination">
          <span>{meta ? `${meta.total} items` : ''}</span>
          <a
            className="pg"
            href="#prev"
            onClick={(e) => {
              e.preventDefault()
              if (page > 1) setFilter({ page: String(page - 1) })
            }}
          >
            ‹
          </a>
          <a className="pg on">{page}</a>
          <a
            className="pg"
            href="#next"
            onClick={(e) => {
              e.preventDefault()
              if (meta && page * meta.limit < meta.total) setFilter({ page: String(page + 1) })
            }}
          >
            ›
          </a>
        </div>
      </div>

      <table className="list">
        <thead>
          <tr>
            {canEdit && (
              <th className="col-cb">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : data.map((e) => e.id))}
                  aria-label="Select all"
                />
              </th>
            )}
            <th className="col-thumb" />
            <th>Package</th>
            <th>Destination</th>
            <th>Duration</th>
            <th>From price</th>
            <th>Theme</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={9} className="muted">
                Loading…
              </td>
            </tr>
          )}

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={9} className="muted">
                {tab === 'trash' ? 'Trash is empty.' : 'No packages yet.'}
              </td>
            </tr>
          )}

          {data.map((entry) => (
            <tr key={entry.id}>
              {canEdit && (
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(entry.id)}
                    onChange={() => toggleRow(entry.id)}
                    aria-label={`Select ${entry.title}`}
                  />
                </td>
              )}
              <td>
                {/*
                 * Banner ka thumbnail. Pehle yahan ek **khaali span** tha — sirf gradient
                 * wala placeholder, jo kabhi kisi image se juda hi nahi tha.
                 *
                 * Media resolve na ho to wahi placeholder wapas aa jaata hai, toota hua
                 * `<img>` kabhi nahi (D-42 §2): id set hone ke baawajood media delete ho
                 * sakti hai, aur tab `src` 404 deta.
                 */}
                {(() => {
                  const doc = media[entry.fields?.bannerImage]
                  const variant =
                    doc?.variants?.find((v) => v.key === 'thumb') ?? doc?.variants?.[0]

                  return variant ? (
                    <img className="thumb" src={variant.url} alt="" loading="lazy" />
                  ) : (
                    <span className="thumb" />
                  )
                })()}
              </td>
              <td>
                <Link className="row-title" to={`/packages/${entry.id}`}>
                  {entry.title}
                </Link>{' '}
                {entry.fields?.featured && <span className="badge b-hot">Featured</span>}
                <div className="row-actions">
                  {tab === 'trash' ? (
                    <span>
                      <a
                        href="#restore"
                        onClick={(e) => (e.preventDefault(), rowAction(entry.id, 'restore'))}
                      >
                        Restore
                      </a>
                    </span>
                  ) : (
                    <>
                      <span>
                        <Link to={`/packages/${entry.id}`}>Edit</Link>
                      </span>
                      <span>
                        <a
                          href="#duplicate"
                          onClick={(e) => (e.preventDefault(), rowAction(entry.id, 'duplicate'))}
                        >
                          Duplicate
                        </a>
                      </span>
                      {/* Itinerary ki apni screen Slice 4 me — abhi Edit hi kholta hai */}
                      <span>
                        <Link to={`/packages/${entry.id}`}>Itinerary</Link>
                      </span>
                      <span>
                        <a
                          className="del"
                          href="#trash"
                          onClick={(e) => (e.preventDefault(), rowAction(entry.id, 'trash'))}
                        >
                          Trash
                        </a>
                      </span>
                    </>
                  )}
                </div>
              </td>
              <td className="muted">{labelFor(entry, 'destinations', destinations)}</td>
              <td className="nowrap">{duration(entry.fields)}</td>
              <td className="nowrap">
                {(() => {
                  /* Sasti se mehngi ke kram me — pehla sabse sasta, aakhri sabse mehnga */
                  const priced = pricedCategories(entry.fields?.pricing)
                  /* Ek bhi category ka daam nahi bhara — khaali cheez khaali dikhe (D-30) */
                  if (!priced.length) return <span className="muted">—</span>

                  const low = priced[0].priceFrom
                  const high = priced[priced.length - 1].priceFrom

                  return (
                    <>
                      <b>
                        {formatPrice(low, currency)}
                        {/* Ek hi category pe range nahi — wo ek jhoothi range hoti */}
                        {high !== low && ` – ${formatPrice(high, currency)}`}
                      </b>
                      {/* Design ki chhoti line. Static hai — `priceBasis` D-57 me hat gaya tha */}
                      <div className="muted price-basis">per person</div>
                    </>
                  )
                })()}
              </td>
              <td className="muted">{labelFor(entry, 'packageTypes', packageTypes)}</td>
              <td>
                <span className={`badge ${STATUS_BADGE[entry.status] ?? 'b-draft'}`}>
                  {STATUS_LABEL[entry.status] ?? entry.status}
                </span>
              </td>
              <td className="muted nowrap">{timeAgo(entry.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
