import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createUserSchema, suggestUsernameFromEmail, updateUserSchema } from '@cms/shared'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useRoles } from './useUsers.js'
import './Users.css'

/**
 * Add / Edit user.
 *
 * Ye screen design me **nahi** hai — sirf Users list hai (login screen jaisa hi case,
 * D-31). Layout WordPress-style hai, par har class design ke primitives se: `.panel`,
 * `.field`, `.inp`, `.sel`, `.btn`. Koi naya token nahi.
 *
 * **`key` yahan zaroori hai, cosmetic nahi.**
 *
 * `/users/:id` aur `/users/new` **ek hi component** render karte hain. React Router
 * route badalne pe naya element to deta hai, par uska type wahi rehta hai — isliye React
 * purana instance dobara use kar leta hai aur `useState` **zinda reh jaati hai**.
 * Nateeja: edit karke "Add User" dabao to naya form pichhle user ke data se bhara aata
 * tha.
 *
 * `key` badalte hi React poora component naye sire se mount karta hai. Ye har state ko
 * reset karta hai — aage koi naya `useState` jude to use alag se yaad rakhne ki zaroorat
 * nahi. Effect me manually reset karna bhi chalta, par wahan har naya field bhoolna
 * aasaan hai.
 */
export default function UserForm() {
  const { id } = useParams()

  return <UserFormFields key={id ?? 'new'} id={id} />
}

function UserFormFields({ id }) {
  const isNew = !id
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const roles = useRoles()

  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    role: 'author',
    password: '',
  })
  /** User ne username khud chhua? Chhua ho to email badalne pe overwrite mat karo. */
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (isNew) return

    api
      .get(`/users/${id}`)
      .then((res) => {
        const u = res.data.data.user
        setForm({ ...u, password: '' })
        setLoading(false)
      })
      .catch((err) => {
        setError(errorMessage(err))
        setLoading(false)
      })
  }, [id, isNew])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  /** Email likhte hi username bhar jaata hai — jab tak user ne use khud na chhua ho. */
  function onEmailChange(e) {
    const email = e.target.value
    setForm((f) => ({
      ...f,
      email,
      username: usernameTouched ? f.username : suggestUsernameFromEmail(email),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    // Wahi schema jo server use karta hai (R8) — do jagah alag rules nahi
    const schema = isNew ? createUserSchema : updateUserSchema
    const payload = isNew
      ? {
          username: form.username || undefined,
          name: form.name,
          email: form.email,
          role: form.role,
          password: form.password,
        }
      : {
          name: form.name,
          role: form.role,
          // Khaali chhoda to password chhua hi nahi jaata
          ...(form.password ? { password: form.password } : {}),
        }

    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      if (isNew) {
        const res = await api.post('/users', parsed.data)
        navigate(`/users/${res.data.data.user.id}`, {
          state: { created: res.data.data.user.username },
        })
      } else {
        await api.patch(`/users/${id}`, parsed.data)
        setNotice(
          form.password
            ? 'Saved. Share the new password with the user — their existing sessions have been signed out.'
            : 'Saved.',
        )
        setForm((f) => ({ ...f, password: '' }))
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  const isMe = !isNew && id === me?.id

  return (
    <>
      <div className="page-head">
        <h1>{isNew ? 'Add New User' : 'Edit User'}</h1>
        <Link className="btn page-title-action" to="/users">
          Back to Users
        </Link>
      </div>

      {notice && (
        <div className="notice ok">
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}

      <form className="panel user-form" onSubmit={handleSubmit} noValidate>
        <div className="panel-body">
          <div className="field">
            <label htmlFor="u-username">Username</label>
            <input
              id="u-username"
              className="inp"
              value={form.username}
              disabled={!isNew}
              onChange={(e) => {
                setUsernameTouched(true)
                set('username')(e)
              }}
            />
            <p className="hint">
              {isNew
                ? 'Filled in from the email. Once created it cannot be changed.'
                : 'Cannot be changed — it becomes part of the public URL.'}
            </p>
          </div>

          <div className="field">
            <label htmlFor="u-name">Name</label>
            <input id="u-name" className="inp" value={form.name} onChange={set('name')} />
          </div>

          <div className="field">
            <label htmlFor="u-email">Email</label>
            <input
              id="u-email"
              className="inp"
              type="email"
              value={form.email}
              disabled={!isNew}
              onChange={onEmailChange}
            />
            {!isNew && <p className="hint">Email changes are not supported yet.</p>}
          </div>

          <div className="field">
            <label htmlFor="u-role">Role</label>
            <select
              id="u-role"
              className="sel"
              value={form.role}
              onChange={set('role')}
              /* Apna hi role badal ke khud ko bahar kar lena aasaan galti hai */
              disabled={isMe}
            >
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
            {isMe && <p className="hint">You cannot change your own role.</p>}
          </div>

          <div className="field">
            <label htmlFor="u-password">{isNew ? 'Password' : 'New password'}</label>
            <div className="row">
              <input
                id="u-password"
                className="inp"
                type="text"
                value={form.password}
                onChange={set('password')}
                placeholder={isNew ? '' : 'Only fill in to change'}
              />
              <button
                className="btn"
                type="button"
                onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}
              >
                Generate
              </button>
            </div>
            <p className="hint">
              {isNew
                ? 'At least 10 characters. You will need to share this password with the user — they sign in with it.'
                : 'Leave blank to keep the current password. Changing it signs the user out everywhere.'}
            </p>
          </div>

          {/* SMTP Phase 2 me aayega — tab tak ye jaan-boojh kar disabled hai (D-30) */}
          <div className="field">
            <label className="inline-lbl" title="Sending email needs SMTP setup">
              <input type="checkbox" disabled />
              <span className="muted"> Send notification email — SMTP is not set up</span>
            </label>
          </div>
        </div>

        <div className="panel-foot">
          <span className="hint" style={{ margin: 0 }}>
            {isNew ? 'The user can sign in with this password right away.' : ''}
          </span>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Add User' : 'Save'}
          </button>
        </div>
      </form>
    </>
  )
}

/**
 * Padhne-likhne me aasaan password — teen shabd aur do digit.
 *
 * Random characters wala password admin ko phone pe bolna padta hai aur wahin galat
 * ho jaata hai. Ye ek baar ka password hai (user pehle login pe badalta hai), isliye
 * yaad rakhna nahi, **theek se pahunchana** zaroori hai.
 */
function generatePassword() {
  const words = ['tara', 'nadi', 'baadal', 'pahad', 'jungle', 'suraj', 'hawa', 'barish', 'raasta']
  const rand = (n) => Math.floor(Math.random() * n)
  const pick = () => words[rand(words.length)]

  return `${pick()}-${pick()}-${pick()}-${10 + rand(90)}`
}
