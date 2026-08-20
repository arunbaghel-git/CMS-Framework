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
 */
export default function DeleteUser() {
  const { id } = useParams()
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

  if (!user) return <p className="subtitle">Load ho raha hai…</p>

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
          Ye <strong>permanent</strong> hai. User Trash me nahi jaata — wapas laane ka koi raasta
          nahi hai.
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
            <label htmlFor="reassign">Iska content kise dein?</label>
            <select
              id="reassign"
              className="sel"
              value={reassignToId}
              onChange={(e) => setReassignToId(e.target.value)}
            >
              <option value="">Kisi ko nahi</option>
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
              Abhi is site pe koi content hai hi nahi, isliye transfer karne ko kuch nahi hai. Ye
              option content aane ke baad kaam karega.
            </p>
          </div>
        </div>

        <div className="panel-foot">
          <Link className="btn" to="/users">
            Cancel
          </Link>
          <button className="btn btn-danger" type="button" onClick={handleDelete} disabled={busy}>
            {busy ? 'Ho raha hai…' : `${user.username} ko delete karo`}
          </button>
        </div>
      </div>
    </>
  )
}
