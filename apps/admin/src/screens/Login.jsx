import { useState } from 'react'
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { loginSchema } from '@cms/shared'

import PasswordInput from '../components/admin/PasswordInput.jsx'
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
  /** Reset screen se aaye to — "Password changed. Sign in with your new password." (D-110) */
  const notice = location.state?.notice ?? null

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
      setError(errorMessage(err, 'Sign in failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">CMS</div>

      <form className="login-card" onSubmit={handleSubmit} noValidate>
        {notice && !error && (
          <div className="login-ok" role="status">
            {notice}
          </div>
        )}
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
          {/* Aankh ka button — likha password dekh sakein (client, 24 Sep) */}
          <PasswordInput
            id="login-password"
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
            {submitting ? 'Signing in…' : 'Log In'}
          </button>
        </div>

        {/*
         * 23 Sep se chalu (D-110) — 19 Aug se ye jaan-boojh kar band tha, kyunki SMTP nahi tha (D-30).
         * ⚠️ Mail **sirf administrator** ko jaati hai; baaki users ka password admin Users ▸ Edit User
         * se badalta hai. Link sabko dikhta hai, kyunki login screen ko ye pata hi nahi ki kaun aa raha
         * hai — aur agli screen ka jawab sabke liye ek jaisa hai.
         */}
        <div className="login-links">
          <Link to="/forgot-password">Lost your password?</Link>
        </div>
      </form>

      <div className="login-foot">Admin panel</div>
    </div>
  )
}
