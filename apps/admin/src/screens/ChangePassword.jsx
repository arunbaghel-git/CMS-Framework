import { useState } from 'react'
import { changePasswordSchema } from '@cms/shared'

import { api, errorMessage } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import './Login.css'

/**
 * Password badalna.
 *
 * Seed se bana admin `mustChangePassword: true` ke saath aata hai — uska password
 * `.env` file me plain text me pada hai (spec 004), isliye pehle login pe ye screen
 * majboori hai, suggestion nahi.
 *
 * Password badalne pe server **saare** sessions revoke kar deta hai — is browser ka
 * bhi. Isliye ye screen ke baad seedha login pe wapas jaana padta hai.
 */
export default function ChangePassword({ forced = false }) {
  const { logout } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword })

    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSubmitting(true)

    try {
      await api.post('/auth/change-password', parsed.data)
      // Server ne saare sessions kaat diye — local state bhi saaf karo
      await logout()
    } catch (err) {
      setError(errorMessage(err, 'Password badal nahi paaya.'))
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">CMS</div>

      <form className="login-card" onSubmit={handleSubmit} noValidate>
        {forced && (
          <div className="login-note">
            Ye password setup ke waqt bana tha aur config file me plain text me pada hai. Aage
            badhne se pehle ise badalna zaroori hai.
          </div>
        )}

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="cp-current">Abhi ka password</label>
          <input
            id="cp-current"
            className="inp"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="cp-new">Naya password</label>
          <input
            id="cp-new"
            className="inp"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="hint">Kam se kam 10 characters. Ek lamba phrase sabse achha hai.</p>
        </div>

        <div className="login-actions">
          <span className="hint" style={{ margin: 0 }}>
            Baaki devices bhi logout honge
          </span>
          <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
            {submitting ? 'Ho raha hai…' : 'Password badlo'}
          </button>
        </div>
      </form>
    </div>
  )
}
