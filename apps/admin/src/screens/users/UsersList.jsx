import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '../../lib/auth.jsx'
import { useRoles, useUsers } from './useUsers.js'
import './Users.css'

/**
 * Users list — `admin-design.html` ke `#s-users` se.
 *
 * Row actions design ke hisaab se hi hain — **Edit | Delete**. Delete un rows pe
 * dikhta hi nahi jinpe wo chalega nahi: administrator aur apni row (D-34).
 *
 * Design se ek jaan-boojh kar liya gaya farq: **row ka checkbox column nahi hai.**
 * Bulk actions abhi bane nahi hain, aur aisa checkbox jo select to ho par kuch kar na
 * sake — wo "khaali" nahi, "toota hua" lagta hai (D-30 ka ulta). Bulk actions ke saath
 * column wapas aa jaayega.
 *
 * `Posts` aur `Enquiries` columns `—` dikhate hain — unka data Phase 1 aur 7b me
 * aayega. Design khud Enquiries me `—` dikhata hai.
 */
export default function UsersList() {
  const { user: me, can } = useAuth()
  const roles = useRoles()

  const [params, setParams] = useSearchParams()

  const page = Number(params.get('page') ?? 1)
  const role = params.get('role') ?? ''
  /**
   * Query me **URL wala** search jaata hai, input ka live text nahi.
   *
   * Input ki apni state alag hai (`search`) — warna har keystroke pe ek API call
   * chali jaati. Search tab lagta hai jab form submit hota hai, aur wo URL badalta hai.
   */
  const appliedSearch = params.get('search') ?? ''
  const [search, setSearch] = useState(appliedSearch)

  /**
   * Sort bhi URL me rehta hai, component state me nahi.
   *
   * Isse sorted list ka link share ho sakta hai, back button kaam karta hai, aur
   * reload pe list wahi rehti hai. Default `createdAt desc` — wahi jo API ka default
   * hai, taaki dono jagah alag na ho.
   */
  const sort = params.get('sort') ?? 'createdAt'
  const order = params.get('order') ?? 'desc'

  // Object har render pe naya banta hai; useUsers uspe depend karta hai, isliye memo
  const query = useMemo(
    () => ({
      page,
      limit: 20,
      sort,
      order,
      ...(role ? { role } : {}),
      ...(appliedSearch ? { search: appliedSearch } : {}),
    }),
    [page, role, appliedSearch, sort, order],
  )

  const { data, meta, loading, error, reload } = useUsers(query)

  const roleLabel = (key) => roles.find((r) => r.key === key)?.label ?? key

  /**
   * Usi column pe dobara click = direction palat do, naye column pe = uska default.
   *
   * Naam ke liye default `asc` hai (A se Z padhne me natural lagta hai), par date ke
   * liye `desc` — "sabse naya pehle" hi wo cheez hai jo koi dekhna chahta hai.
   */
  function toggleSort(column) {
    const sameColumn = sort === column
    const nextOrder = sameColumn
      ? order === 'asc'
        ? 'desc'
        : 'asc'
      : column === 'name'
        ? 'asc'
        : 'desc'

    setFilter({ sort: column, order: nextOrder })
  }

  function setFilter(next) {
    const merged = { ...Object.fromEntries(params), ...next }
    // Filter badalne pe page 1 pe wapas — warna page 5 pe khaali list dikhti hai
    if (!('page' in next)) delete merged.page
    for (const [k, v] of Object.entries(merged)) if (!v) delete merged[k]
    setParams(merged)
  }

  return (
    <>
      <div className="page-head">
        <h1>Users</h1>
        {can('user.invite') && (
          <Link className="btn page-title-action" to="/users/new">
            Add New User
          </Link>
        )}
      </div>

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
          <button className="btn btn-sm" type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      <ul className="subsubsub">
        <li>
          <a
            href="#all"
            className={role === '' ? 'current' : ''}
            onClick={(e) => {
              e.preventDefault()
              setFilter({ role: '' })
            }}
          >
            All <span className="cnt">({meta?.counts?.all ?? 0})</span>
          </a>
        </li>
        {roles.map((r) => (
          <li key={r.key}>
            <a
              href={`#${r.key}`}
              className={role === r.key ? 'current' : ''}
              onClick={(e) => {
                e.preventDefault()
                setFilter({ role: r.key })
              }}
            >
              {r.label} <span className="cnt">({meta?.counts?.[r.key] ?? 0})</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="tablenav">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setFilter({ search })
          }}
        >
          <input
            className="inp users-search"
            type="search"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <span className="spacer" />
        {meta && <span className="muted">{meta.total} users</span>}
      </div>

      <table className="list">
        <thead>
          <tr>
            <th>Username</th>
            {/*
              Sirf wahi columns sortable hain jinhe API sort kar sakti hai
              (`listUsersQuerySchema` ka enum): `name` aur `lastLoginAt`.
              Username/Email/Role ke liye pehle wo enum badalna padega — aur uske saath
              index ka sawaal aata hai, isliye wo alag kaam hai.

              Sortable header `<button>` hai, `<th onClick>` nahi — warna keyboard se
              sort karna mumkin hi nahi hota.
            */}
            <SortableTh column="name" sort={sort} order={order} onSort={toggleSort}>
              Name
            </SortableTh>
            <th>Email</th>
            <th>Role</th>
            <th>Posts</th>
            <th>Enquiries</th>
            <SortableTh column="lastLoginAt" sort={sort} order={order} onSort={toggleSort}>
              Last login
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7} className="muted">
                Loading…
              </td>
            </tr>
          )}

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                No users found.
              </td>
            </tr>
          )}

          {!loading &&
            data.map((u) => (
              <UserRow key={u.id} user={u} me={me} can={can} roleLabel={roleLabel} />
            ))}
        </tbody>
      </table>

      {meta && meta.pages > 1 && (
        <div className="tablenav">
          <span className="spacer" />
          <div className="pagination">
            {Array.from({ length: meta.pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`pg ${n === meta.page ? 'on' : ''}`}
                onClick={() => setFilter({ page: String(n) })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Sort ho sakne wala column header.
 *
 * `aria-sort` isliye hai ki screen reader ko pata chale ki list kis hisaab se lagi hai —
 * teer ka nishaan wo padh nahi sakta.
 */
function SortableTh({ column, sort, order, onSort, children }) {
  const active = sort === column

  return (
    <th aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className="col-sort" type="button" onClick={() => onSort(column)}>
        {children}
        <span className="col-sort-ico" aria-hidden>
          {active ? (order === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

function UserRow({ user, me, can, roleLabel }) {
  const isMe = user.id === me?.id
  const isAdmin = user.role === 'admin'

  /**
   * Delete un rows pe dikhta hi nahi jinpe wo chalega nahi — administrator aur apna
   * account (D-34).
   *
   * Server pe bhi yahi guards hain; ye sirf UI hai. Ek aisa button dikhana jo hamesha
   * error de, user ko ye sikhaata hai ki app kabhi-kabhi tootta hai.
   */
  const canDelete = can('user.delete') && !isAdmin && !isMe

  return (
    <tr>
      <td>
        <Link className="row-title" to={`/users/${user.id}`}>
          {user.username}
        </Link>
        <div className="row-actions">
          {can('user.update') && (
            <span>
              <Link to={`/users/${user.id}`}>Edit</Link>
            </span>
          )}
          {canDelete && (
            <span>
              <Link className="del" to={`/users/${user.id}/delete`}>
                Delete
              </Link>
            </span>
          )}
        </div>
      </td>
      <td>
        {user.name}
        {isMe && <span className="muted"> — you</span>}
      </td>
      <td className="muted">{user.email}</td>
      <td>{roleLabel(user.role)}</td>
      {/* Phase 1 · Phase 7b — abhi inke peeche koi data hai hi nahi (D-30) */}
      <td className="muted">—</td>
      <td className="muted">—</td>
      <td className="muted nowrap">
        {user.status === 'inactive' ? (
          <span className="badge b-close">Inactive</span>
        ) : (
          formatDate(user.lastLoginAt)
        )}
      </td>
    </tr>
  )
}

/** Kabhi login hi nahi kiya to `—`, warna chhoti readable date. */
function formatDate(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
