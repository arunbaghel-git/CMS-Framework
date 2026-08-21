import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api, errorMessage } from '../../lib/api.js'
import './Users.css'

/**
 * Delete confirm — apna poora screen, modal nahi.
 *
 * WordPress bhi yahi karta hai, aur wajah achhi hai: delete permanent hai (D-34) aur
 * uske saath ek asli faisla juda hai ("content kise dein"). Modal me wo faisla jaldi
 * me liya jaata hai; poora screen ek thehraav deta hai.
 *
 * Design me ye screen nahi hai — bilkul waise hi jaise user form nahi hai.
 *
 * **`key` wahi wajah se hai jo `UserForm` me hai** — ek delete screen se doosri pe
 * jaane pe React purana instance dobara use kar leta, aur naya user load hone tak
 * **pichhle user ka naam** dikhta rehta. Delete permanent hai; is screen pe ek pal ke
 * liye bhi galat naam dikhna theek nahi.
 */
export default function DeleteUser() {
  const { id } = useParams()

  return <DeleteUserConfirm key={id} id={id} />
}

function DeleteUserConfirm({ id }) {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [others, setOthers] = useState([])
  const [reassignToId, setReassignToId] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api.get(`/users/${id}`), api.get('/users', { params: { limit: 100 } })])
      .then(([one, all]) => {
        setUser(one.data.data.user)
        // Jise delete kar rahe hain wo apna hi content nahi le sakta
        setOthers(all.data.data.filter((u) => u.id !== id))
      })
      .catch((err) => setError(errorMessage(err)))
  }, [id])

  async function handleDelete() {
    setError(null)
    setBusy(true)

    try {
      await api.delete(`/users/${id}`, {
        data: reassignToId ? { reassignToId } : {},
      })
      navigate('/users')
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (error && !user) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  if (!user) return <p className="subtitle">Loading…</p>

  return (
    <>
      <div className="page-head">
        <h1>Delete User</h1>
      </div>

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="notice warn">
        <span>
          This is <strong>permanent</strong>. The user does not go to Trash — there is no way to
          bring them back.
        </span>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>
            {user.name} <span className="muted">({user.username})</span>
          </h2>
        </div>

        <div className="panel-body">
          <p style={{ marginTop: 0 }}>
            <span className="muted">{user.email}</span>
          </p>

          <div className="field">
            <label htmlFor="reassign">Reassign their content to</label>
            <select
              id="reassign"
              className="sel"
              value={reassignToId}
              onChange={(e) => setReassignToId(e.target.value)}
            >
              <option value="">Nobody</option>
              {others.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.username})
                </option>
              ))}
            </select>
            {/*
              Content transfer ka asli kaam Phase 1 me judega — `entries` collection
              abhi bana hi nahi hai. Dropdown aur API contract aaj se maujood hain
              (D-30), isliye tab sirf ek service function bharna hoga.
            */}
            <p className="hint">
              There is no content on this site yet, so there is nothing to transfer. This option
              starts working once content exists.
            </p>
          </div>
        </div>

        <div className="panel-foot">
          <Link className="btn" to="/users">
            Cancel
          </Link>
          <button className="btn btn-danger" type="button" onClick={handleDelete} disabled={busy}>
            {busy ? 'Deleting…' : `Delete ${user.username}`}
          </button>
        </div>
      </div>
    </>
  )
}
