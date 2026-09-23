import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { forgotPasswordSchema } from '@cms/shared'

import { api, errorMessage } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import './Login.css'

/**
 * `Lost your password?` — D-110 (client, 23 Sep). Login ka hi dhaancha (`Login.css`).
 *
 * ⚠️ **Mail sirf administrator ko jaati hai**, par screen ye kabhi nahi batati ki daala hua email
 * admin ka tha ya nahi — server ka jawab har email pe ek jaisa hai, aur yahan wahi dikhta hai. Isliye
 * success ka message server ka apna text hai, yahan likha hua nahi: do jagah likha hota to ek din
 * alag ho jaata, aur farak khud ek ishaara ban jaata.
 */
export default function ForgotPassword() {
  const { user, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  /** Login hai to reset ka kya kaam — password Profile se badalta hai. */
  if (user) return <Navigate to="/profile" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/auth/forgot-password', parsed.data)
      setDone(res.data.data.message)
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">CMS</div>

      <form className="login-card" onSubmit={handleSubmit} noValidate>
        {done ? (
          <div className="login-ok" role="status">
            {done}
          </div>
        ) : (
          <>
            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <p className="login-intro">
              For administrators: enter your email and we will send you a link to choose a new
              password. Other users — ask your administrator to reset it.
            </p>

            <div className="field">
              <label htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                className="inp"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="login-actions login-actions--single">
              <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </div>
          </>
        )}

        <div className="login-links">
          <Link to="/login">← Back to log in</Link>
        </div>
      </form>

      <div className="login-foot">Admin panel</div>
    </div>
  )
}
