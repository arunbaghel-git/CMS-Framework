import { useState } from 'react'
import { changePasswordSchema } from '@cms/shared'

import PasswordInput from '../components/admin/PasswordInput.jsx'
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
 * Password badalne pe server purane **saare** sessions revoke karta hai par is browser
 * ko turant naya de deta hai (D-37) — isliye yahan logout nahi hota. Gate `reload()`
 * se hatta hai: `mustChangePassword` ab false hai, to `RequireAuth` aage jaane deta hai.
 *
 * Profile screen se password badalna isse alag raasta hai, par endpoint wahi hai.
 */
export default function ChangePassword({ forced = false }) {
  const { reload } = useAuth()

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
      // Naya session cookie me aa chuka hai — bas user dobara padho taaki gate hat jaaye
      await reload()
    } catch (err) {
      setError(errorMessage(err, 'Could not change the password.'))
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">CMS</div>

      <form className="login-card" onSubmit={handleSubmit} noValidate>
        {forced && (
          <div className="login-note">
            This password was created during setup and is stored in plain text in a config file. You
            must change it before continuing.
          </div>
        )}

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="cp-current">Current password</label>
          <PasswordInput
            id="cp-current"
            autoComplete="current-password"
            autoFocus
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="cp-new">New password</label>
          <PasswordInput
            id="cp-new"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="hint">At least 10 characters. A long phrase works best.</p>
        </div>

        <div className="login-actions">
          <span className="hint" style={{ margin: 0 }}>
            Other devices will be signed out — this browser stays signed in
          </span>
          <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
            {submitting ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  )
}
