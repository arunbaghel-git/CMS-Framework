import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useEntryCounts, useEntryList, useMediaById } from '../../lib/use-entries.js'
import { useTaxonomyList } from '../packages/usePackages.js'
import '../packages/Packages.css'

/**
 * Pages aur Tour Pages ki list — **ek hi component, do screens** (D-87 §1, Slice C).
 *
 * `admin-design-v3.html` ke `#s-pages` aur `#s-tour` byte-level pe ek hi table hain; sirf
 * teen cheezein alag hain: heading, "Add New" ka text, aur teesra column (Pages pe `Author`,
 * Tour pe `Packages`). Do file likhne ka matlab hota ki kal ek me bulk action jude aur doosri
 * me nahi — theek wahi shakl jo `usePackages.js` ke generic hisson pe thi.
 *
 * ⚠️ **Ye `PackagesList.jsx` se alag hai, aur wo jaan-boojh kar hai.** Us screen ke apne
 * filter (Destination, Package Type), apna `From price` column aur apne bulk actions
 * (Featured) hain — wo package ke domain ki cheezein hain. Unhe ek "generic list" me ghusa
 * kar props se on/off karna wahi component banata hai jise koi chhoona nahi chahta.
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

/**
 * `authorId` → naam ka naksha — Pages list ka `Author` column.
 *
 * ⚠️ Entry ke payload me sirf `authorId` hota hai, naam nahi. Per-row call karne ka matlab
 * hota 20 request ek list pe; isliye poori list **ek baar** aati hai (wahi `limit: 200` wali
 * soch jo `useTaxonomyList` pe likhi hai).
 *
 * ⚠️ `user.read` har role ke paas nahi hai (contributor ke paas nahi). Call fail hone pe
 * naksha khaali rehta hai aur column `—` dikhata hai — list author ke liye kabhi rukni nahi
 * chahiye. Wahi soch jo `useSiteCurrency()` pe hai.
 */
function useUserNames(enabled) {
  const [names, setNames] = useState({})

  useEffect(() => {
    if (!enabled) return

    api
      .get('/users', { params: { limit: 200 } })
      .then((res) =>
        setNames(Object.fromEntries(res.data.data.users.map((u) => [u.id, u.name || u.username]))),
      )
      .catch(() => setNames({}))
  }, [enabled])

  return names
}

/** Design me `07 Sep 2026` — list me relative time nahi hai (wo Packages pe hai). */
function shortDate(value) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * @param {object} props
 * @param {string} props.type          `page` ya `tourPage`
 * @param {string} props.title         Screen ka heading
 * @param {string} props.addLabel      "Add New Page" / "Add New Tour Page"
 * @param {string} props.basePath      `/pages` ya `/tour`
 * @param {string} props.searchLabel   Search box ka placeholder
 * @param {string} props.thirdColumn   `author` · `packages` · `category`
 * @param {boolean} [props.postFilters]  Category aur All dates ke dropdown (sirf Posts pe)
 */
/** Teesre column ka heading — `type` DB ka data hai, label sirf UI ka (R6 wala hi tark). */
const THIRD_LABEL = { author: 'Author', category: 'Category', packages: 'Packages' }

/** `2026-08` → `August 2026`. Dropdown me client mahine ka naam padhta hai, number nahi. */
const monthLabel = (value) => {
  const [year, month] = String(value).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function EntriesList({
  type,
  title,
  addLabel,
  basePath,
  searchLabel,
  thirdColumn,
  postFilters = false,
}) {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()

  const [selected, setSelected] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)
  /** Har write ke baad counts dobara maangne ke liye. */
  const [writes, setWrites] = useState(0)

  const tab = params.get('tab') ?? 'all'
  const page = Number(params.get('page') ?? 1)

  /**
   * Query me **URL wala** search jaata hai, input ka live text nahi — warna har keystroke pe
   * ek API call chali jaati (wahi pattern jo Packages aur Users pe hai).
   */
  const appliedSearch = params.get('q') ?? ''
  const [search, setSearch] = useState(appliedSearch)

  /**
   * Category aur All dates — **URL me** rehte hain, component ke state me nahi.
   *
   * Wahi tark jo `q` aur `tab` pe hai: filter laga kar link bhejna, back button, aur refresh
   * teenon kaam karte hain. State me rakhne ka matlab hota ki refresh pe filter chup-chaap
   * gir jaaye.
   */
  const appliedCategory = params.get('categories') ?? ''
  const appliedMonth = params.get('month') ?? ''

  const counts = useEntryCounts(type, writes)

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
      ...(appliedSearch ? { q: appliedSearch } : {}),
      /**
       * ⚠️ Param ka naam `categories` hai, `category` nahi — wahi jo storage key ka hai.
       * `entryListQuerySchema` me wo `TAXONOMY_REF_KEYS` se banta hai, aur uske comment me
       * likha hai ki do naam rakhne ka matlab ek mapping hota jise har naye type pe yaad
       * rakhna padta.
       */
      ...(appliedCategory ? { categories: appliedCategory } : {}),
      ...(appliedMonth ? { month: appliedMonth } : {}),
    }),
    /** ⚠️ Naye filter yahan bhi jodo — warna URL badalta hai aur list waisi ki waisi rehti hai. */
    [page, tabQuery, appliedSearch, appliedCategory, appliedMonth],
  )

  const { data, meta, loading, error, reload } = useEntryList(type, query)

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
       * Bulk fail-soft hai — kuch rows ruk sakti hain (jaise bachche wale page ka trash).
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
  const userNames = useUserNames(thirdColumn === 'author' && can('user.read'))

  /**
   * Row ka thumbnail — client, 10 Sep (_"title ke paas image nahi aa rahi jaise admin me
   * aati hai"_). `PackagesList` ye shuru se dikhati hai; Posts aur Tour dono pe wo chhoot
   * gaya tha.
   *
   * ⚠️ **`featuredImageId`, `fields.bannerImage` nahi** — wo package ka apna field hai.
   * Page/post/tour teenon standard `featuredImageId` use karte hain.
   */
  const media = useMediaById(data.map((entry) => entry.featuredImageId).filter(Boolean))

  /**
   * Category ke naam — teesre column aur filter dropdown dono ke liye.
   *
   * ⚠️ **Wahi hook jo Packages ke Destinations/Package Type bharta hai** — nayi list nahi
   * likhi (D-65/D-51/D-58 wala hi sabak).
   */
  const categories = useTaxonomyList(thirdColumn === 'category' || postFilters ? 'category' : null)
  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  )

  /**
   * Teesra column ki cell.
   *
   * ⚠️ Tour pe `Packages` ki ginti abhi **blocks ki ginti** hai, packages ki nahi — design me
   * wahan `11` jaisa number hai jo us page ke `Package list` block se aane wale packages ka
   * hai. Wo ginti server pe hi ban sakti hai (live packages pe depend karti hai), aur uske
   * liye list endpoint ko per-row query karni padti. Wo alag se hoga; tab tak yahan wahi
   * dikhta hai jo sach me pata hai.
   */
  function thirdCell(entry) {
    if (thirdColumn === 'author') return userNames[entry.authorId] ?? '—'

    /**
     * Post ki category (spec 008).
     *
     * ⚠️ **Pehle Posts ki list pe yahan `Packages` ki ginti dikhti thi** — `thirdColumn` pass
     * hi nahi hua tha, to wo default pe gir kar har post ke `content.blocks` me `packageList`
     * gin raha tha, jo hamesha 0 hota. Client ne pakda: _"ye Packages ka nav kyu hai?"_
     *
     * Ek hi category hoti hai (spec 008), par storage array hai (D-49) — isliye `[0]`.
     */
    if (thirdColumn === 'category') {
      const id = (entry.taxonomies?.categories ?? [])[0]
      return id ? (categoryNames[id] ?? '—') : '—'
    }

    const lists = (entry.content?.blocks ?? []).filter((b) => b.type === 'packageList').length
    return lists === 0 ? '—' : `${lists} list${lists > 1 ? 's' : ''}`
  }

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        {can('entry.create') && (
          <Link className="btn page-title-action" to={`${basePath}/new`}>
            {addLabel}
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
                <option value="trash">Move to Trash</option>
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

        {/*
         * Category aur All dates — sirf Posts pe (client, 10 Sep).
         *
         * ⚠️ **Filter server pe lagta hai, browser me nahi** (R14). `categories` param
         * `entryListQuerySchema` me pehle se tha; `month` uske saath 10 Sep ko juda.
         *
         * ⚠️ Khaali list wala dropdown **dikhta hi nahi** — ek dropdown jisme sirf "All"
         * ho, wo ek jhootha control hai (D-30).
         */}
        {postFilters && categories.length > 0 && (
          <select
            className="sel"
            style={{ width: 'auto' }}
            value={appliedCategory}
            onChange={(e) => setFilter({ categories: e.target.value })}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {postFilters && counts?.months?.length > 0 && (
          <select
            className="sel"
            style={{ width: 'auto' }}
            value={appliedMonth}
            onChange={(e) => setFilter({ month: e.target.value })}
            aria-label="Filter by date"
          >
            <option value="">All dates</option>
            {counts.months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        )}

        <div className="spacer" />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setFilter({ q: search })
          }}
        >
          <input
            className="inp"
            style={{ width: 210 }}
            placeholder={searchLabel}
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
            <th>Title</th>
            <th>{THIRD_LABEL[thirdColumn] ?? 'Packages'}</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={6}>Loading…</td>
            </tr>
          )}

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={6}>{tab === 'trash' ? 'Trash is empty.' : 'Nothing here yet.'}</td>
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
                 * Banner ka thumbnail — `PackagesList` wala hi pattern (client, 10 Sep).
                 *
                 * ⚠️ Media resolve na ho to khaali placeholder wapas aata hai, toota hua
                 * `<img>` kabhi nahi (D-42 §2): id set hone ke bawajood media delete ho sakti
                 * hai, aur tab `src` 404 deta.
                 */}
                {(() => {
                  const doc = media[entry.featuredImageId]
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
                {/*
                 * Nested pages design me `— Our Team — child of About Us` ki tarah dikhte
                 * hain. Sirf `page` hierarchical hai (D-87 §1), isliye ye Tour pe kabhi
                 * nahi lagta — wahan `parentId` breadcrumb ke liye hota hai, path ke liye
                 * nahi.
                 */}
                {entry.parentId && <span className="muted">— </span>}
                <Link className="row-title" to={`${basePath}/${entry.id}`}>
                  {entry.title || '(no title)'}
                </Link>
                <div className="row-actions">
                  <span>
                    <Link to={`${basePath}/${entry.id}`}>Edit</Link>
                  </span>
                  {/*
                   * ⚠️ **`entry.url`, `entry.path` NAHI** — aur ye bug 8 Sep ko client ne pakda:
                   * `View` `http://localhost:5173/andaman-tour-packages-…` pe le jaata tha.
                   *
                   * `path` relative hai, aur admin apne hi origin pe chalta hai (`:5173`) — to
                   * browser use **admin ka** pata samajh leta hai. Public site alag origin pe hai.
                   *
                   * `withUrl()` (entries controller) ye poora URL **4 Sep se bhej raha tha**,
                   * theek isi bug ke liye — uske comment me ye shabd likhe hain: _"Sirf `path`
                   * bhejna ek chup bug hai"_. `PackagesList` shuru se `entry.url` padhti hai;
                   * ye screen Slice C me likhi gayi aur usme purana `path` reh gaya.
                   *
                   * `status` ka check bhi hata diya — `withUrl()` khud `null` deta hai jab tak
                   * page published na ho. Do jagah ek hi shart rakhne ka matlab hota ki ek din
                   * wo alag ho jaayein.
                   */}
                  {entry.url && (
                    <span>
                      <a href={entry.url} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </span>
                  )}
                  {canEdit && (
                    <span>
                      <a
                        className="del"
                        href="#trash"
                        onClick={(e) => {
                          e.preventDefault()
                          rowAction(entry.id, tab === 'trash' ? 'restore' : 'trash')
                        }}
                      >
                        {tab === 'trash' ? 'Restore' : 'Trash'}
                      </a>
                    </span>
                  )}
                </div>
              </td>
              <td className="muted">{thirdCell(entry)}</td>
              <td>
                <span className={`badge ${STATUS_BADGE[entry.status] ?? 'b-draft'}`}>
                  {STATUS_LABEL[entry.status] ?? entry.status}
                </span>
              </td>
              <td className="muted nowrap">{shortDate(entry.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
