import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetPasswordSchema } from '@cms/shared'

import PasswordInput from '../components/admin/PasswordInput.jsx'
import { api, errorMessage } from '../lib/api.js'
import './Login.css'

/**
 * Mail ke link se naya password — D-110. Link: `<ADMIN_URL>/reset-password#token=…`
 *
 * ⚠️ **Token `#` ke baad aata hai, aur screen khulte hi address bar se hata diya jaata hai.**
 * Fragment server tak kabhi nahi jaata (na log, na `Referer`); aur `replaceState` ke baad wo browser
 * history me bhi nahi bachta — koi baad me Back dabaye ya history dekhe to token na mile.
 *
 * Save ke baad **login nahi hota** — login screen pe "Password changed" ke saath. Server ne saare
 * session pehle hi band kar diye hain (`resetPassword()` ka comment).
 */
export default function ResetPassword() {
  const navigate = useNavigate()

  /** Pehle render pe hi padh liya — `useEffect` ke `replaceState` ke baad `location.hash` khaali hota. */
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token'))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    /** Confirm sirf browser me — server ko ek hi password chahiye. Typo se khud ko bahar na kar lein. */
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }

    const parsed = resetPasswordSchema.safeParse({ token, newPassword: password })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSubmitting(true)
    try {
      await api.post('/auth/reset-password', parsed.data)
      navigate('/login', {
        replace: true,
        state: { notice: 'Password changed. Sign in with your new password.' },
      })
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">CMS</div>

      {!token ? (
        /* Link adhoora copy hua ya seedha URL khola — form dikhane ka koi matlab nahi (D-30). */
        <div className="login-card">
          <div className="login-error" role="alert">
            This reset link is not complete. Open the link from the email again, or ask for a new
            one.
          </div>
          <div className="login-links">
            <Link to="/forgot-password">Ask for a new link</Link>
          </div>
        </div>
      ) : (
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <p className="login-intro">Choose a new password — at least 10 characters.</p>

          <div className="field">
            <label htmlFor="reset-password">New password</label>
            <PasswordInput
              id="reset-password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="reset-confirm">Confirm new password</label>
            <PasswordInput
              id="reset-confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <div className="login-actions login-actions--single">
            <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save new password'}
            </button>
          </div>

          <div className="login-links">
            <Link to="/forgot-password">Link expired? Ask for a new one</Link>
          </div>
        </form>
      )}

      <div className="login-foot">Admin panel</div>
    </div>
  )
}
