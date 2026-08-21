import { useState } from 'react'
import { PERMISSION, ROLE_LABEL, changePasswordSchema, updateMeSchema } from '@cms/shared'

import { api, errorMessage } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import './Profile.css'

/**
 * Apni profile — har logged-in user ke liye, role chahe kuch bhi ho (D-37).
 *
 * Ye "dusron ko manage karna" (`/users`) se alag cheez hai, isliye iske peeche koi
 * permission nahi hai — na route pe, na API pe (`/api/me` pe `requirePermission()`
 * jaan-boojh kar nahi hai).
 *
 * Editable sirf **naam** aur **password**. Username immutable hai (D-34), email badalna
 * verification flow maangta hai (SMTP pending), aur apna role khud badal lena RBAC ka
 * sabse seedha bypass hota.
 */
export default function Profile() {
  const { user, reload, can } = useAuth()

  if (!user) return null

  return (
    <>
      <div className="page-head">
        <h1>Profile</h1>
      </div>

      <p className="subtitle">Change your name and password here.</p>

      <DetailsPanel user={user} can={can} onSaved={reload} />
      <PasswordPanel onSaved={reload} />
    </>
  )
}

/** Naam + wo sab jo user khud nahi badal sakta. */
function DetailsPanel({ user, can, onSaved }) {
  /**
   * "Kya ye user hi wo insaan hai jiske paas dusre log poochhne jaate hain?"
   *
   * Role ka naam **nahi** dekha jaata (spec 001) — `user.role === 'admin'` likhne se
   * Phase 7 ke custom roles yahan kabhi fit nahi honge. Sawaal capability ka hai: jo
   * khud users manage karta hai, use "apne administrator se poochhein" likhna bemaani
   * hai — wo khud hi wo administrator hai.
   */
  const managesUsers = can(PERMISSION.USER_UPDATE)

  const [name, setName] = useState(user.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    // Wahi schema jo server use karta hai (R8) — do jagah alag rules nahi
    const parsed = updateMeSchema.safeParse({ name })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      await api.patch('/me', parsed.data)
      // Naam admin bar me bhi dikhta hai — session dobara padho warna purana naam rah jaayega
      await onSaved()
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="panel profile-form" onSubmit={handleSubmit} noValidate>
      <div className="panel-head">
        <h2>Your details</h2>
      </div>

      <div className="panel-body">
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

        <div className="field">
          <label htmlFor="p-name">Name</label>
          <input
            id="p-name"
            className="inp"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="hint">This is the name shown in the admin bar and on content you author.</p>
        </div>

        <ReadOnlyField label="Username" value={user.username}>
          Cannot be changed — it becomes part of your public URL.
        </ReadOnlyField>

        <ReadOnlyField label="Email" value={user.email}>
          {managesUsers
            ? "Email changes aren't supported yet — not from the Users screen either."
            : "Email changes aren't supported yet. Ask your administrator if you need one."}
        </ReadOnlyField>

        <ReadOnlyField label="Role" value={roleLabel(user.role)}>
          {managesUsers
            ? "You can't change your own role — another administrator has to do it."
            : "Your administrator sets this. You can't change your own role."}
        </ReadOnlyField>
      </div>

      <div className="panel-foot">
        <span className="hint" style={{ margin: 0 }} />
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

/**
 * Password badalna.
 *
 * Alag panel isliye hai ki ye alag endpoint hai aur alag nateeja deta hai — naam save
 * karne pe kuch nahi hota, password badalne pe **baaki saare devices logout** ho jaate
 * hain. Dono ko ek hi Save button ke peeche rakhna us baat ko chhupa deta.
 */
function PasswordPanel({ onSaved }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      await api.post('/auth/change-password', parsed.data)

      /**
       * Server ne purane sessions kaat kar **is** browser ko naya de diya hai (D-37) —
       * isliye yahan logout nahi karna. `reload()` isliye ki seed wale admin ka
       * `mustChangePassword` ab false ho chuka hai aur gate hatna chahiye.
       */
      await onSaved()

      setCurrentPassword('')
      setNewPassword('')
      setNotice('Password changed. Other devices have been signed out.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="panel profile-form" onSubmit={handleSubmit} noValidate>
      <div className="panel-head">
        <h2>Password</h2>
      </div>

      <div className="panel-body">
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

        <div className="field">
          <label htmlFor="p-current">Current password</label>
          <input
            id="p-current"
            className="inp"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <p className="hint">
            Asked so nobody can change your password from a laptop you left open.
          </p>
        </div>

        <div className="field">
          <label htmlFor="p-new">New password</label>
          <input
            id="p-new"
            className="inp"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="hint">At least 10 characters. A long phrase works best.</p>
        </div>
      </div>

      <div className="panel-foot">
        <span className="hint" style={{ margin: 0 }}>
          Other devices will be signed out — this browser stays signed in
        </span>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Changing…' : 'Change password'}
        </button>
      </div>
    </form>
  )
}

/**
 * Dikhta hai par badla nahi ja sakta — aur **kyun** nahi, wo bhi saath likha hai.
 *
 * Ye disabled `<input>` hai, plain text nahi: form ki har line ek jaisi dikhni chahiye,
 * warna aankh ko lagta hai ki do alag tarah ki cheezein hain. Wahi pattern jo Edit User
 * form me username/email pe hai.
 */
function ReadOnlyField({ label, value, children }) {
  // Ab ye asli input hai, isliye label ko usse jodna zaroori hai — screen reader ke liye
  const id = `p-ro-${label.toLowerCase()}`

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {/* `readOnly` bhi hai taaki React controlled-input ki warning na de */}
      <input id={id} className="inp" value={value ?? ''} readOnly disabled />
      <p className="hint">{children}</p>
    </div>
  )
}

/**
 * Role ka wo naam jo user ko dikhta hai — `admin` se `Administrator`.
 *
 * **`ROLE_LABEL` pehle dekha jaata hai; key se banana sirf fallback hai.** Built-in
 * roles code-owned hain (D-36), aur unka label wahi hona chahiye jo seed DB me likhta
 * hai. Pehle yahan sirf key se label banta tha, to `admin` "Admin" ban jaata tha —
 * jabki har doosri jagah "Administrator" likha hai.
 *
 * Fallback Phase 7 ke custom roles ke liye hai: unke labels sirf DB me honge, aur
 * `GET /api/roles` `role.read` maangta hai — jo har role ke paas nahi hai. Profile har
 * role ki screen hai, isliye wahan se label laane ka matlab hota har editor ke liye ek
 * 403 request. `salesAgent` se "Sales Agent" kaafi achha anumaan hai.
 */
function roleLabel(key = '') {
  if (ROLE_LABEL[key]) return ROLE_LABEL[key]

  const words = key.replace(/([A-Z])/g, ' $1').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
