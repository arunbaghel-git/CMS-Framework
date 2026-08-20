import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { loginSchema } from '@cms/shared'

import { errorMessage } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import './Login.css'

/**
 * Login — D-31.
 *
 * Client ke paas is screen ka design nahi tha, isliye layout WordPress-style hai.
 * Colours/spacing sab tokens se. Client design de de to **sirf ye file** badlegi.
 */
export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Login ke baad wahin wapas bhejo jahan user jaana chahta tha
  const from = location.state?.from ?? '/'

  if (loading) return null
  if (user) return <Navigate to={from} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    /**
     * Client-side validation **wahi schema** use karta hai jo server pe hai (R8).
     * Do jagah alag rules likhne se form "sahi" dikhta hai aur server 400 deta hai.
     */
    const parsed = loginSchema.safeParse({ email, password, rememberMe })

    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSubmitting(true)

    try {
      await login(parsed.data)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Login nahi ho paaya. Dobara koshish karein.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">CMS</div>

      <form className="login-card" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="inp"
            type="email"
            autoComplete="username"
            /* Screen khulte hi cursor yahan — har login pe ek click bachta hai */
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="inp"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="login-actions">
          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>

          <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
            {submitting ? 'Ho raha hai…' : 'Log In'}
          </button>
        </div>

        <div className="login-links">
          {/* SMTP Phase 2 me aayega — tab tak ye link jaan-boojh kar dead hai (D-30) */}
          <span className="disabled" title="Email setup Phase 2 me aayega">
            Password bhool gaye?
          </span>
        </div>
      </form>

      <div className="login-foot">Admin panel</div>
    </div>
  )
}
