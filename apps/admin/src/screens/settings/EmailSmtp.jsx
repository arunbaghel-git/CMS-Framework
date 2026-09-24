import { toMailUpdate, updateMailSchema } from '@cms/shared'
import { useEffect, useState } from 'react'

import PasswordInput from '../../components/admin/PasswordInput.jsx'
import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * `Settings ▸ Email / SMTP` — site ka mail bhejne wala account (D-108).
 *
 * ⚠️ **Ye screen design me pehle din se thi aur aaj tak `NotBuiltYet` pe girti thi.** Sidebar
 * ki entry (`lib/nav.js`) aur tab bar dono pehle se maujood the; sirf route nahi tha. Ye
 * **paanchvi baar** hua hai (`.float` D-102, `.sidetab` A-34, `settings.scripts.update` D-106,
 * `tools.export` D-107) — isiliye yahan `nav.js` me kuch **joda nahi gaya**.
 *
 * Reference: `admin-design-v2.html:1436` — aur wahi panel v1/v3/v4 aur `travel-cms-admin_v2`
 * me hu-ba-hu same hai. Chhe khaane, `row2` grid, aur `panel-foot` me `Send Test Email` +
 * `Save Changes`.
 *
 * ⚠️ **Reference ka doosra panel (`Enquiry Notifications`) yahan jaan-boojh kar nahi hai** —
 * wo SMTP chalne ke baad ka alag kaam hai. Uske do checkbox (`Attach package PDF`, `daily
 * digest`) ke peeche to koi infra hi nahi hai (na PDF generator, na scheduler), aur dead
 * checkbox banana is repo ka sabse baar-baar aane wala bug hai (A-41). Ye R15 ka deviation
 * hai aur `04-ADMIN-UX.md` ke table me likha hai.
 */

/** Chhe khaane, bilkul reference ke kram me — do-do ki row me. */
const EMPTY = { host: '', port: 587, user: '', password: '', fromName: '', fromEmail: '' }

export default function EmailSmtp() {
  const { can, user } = useAuth()
  const canEdit = can('settings.update')

  /**
   * Form me server ka **poora** jawab rehta hai, `hasPassword` ke saath — wo do kaam karta hai:
   * placeholder `••••••••` dikhana, aur `Remove saved password` kab dikhe.
   *
   * ⚠️ **Save pe wo key `toMailUpdate()` girati hai.** Wo padhne ki cheez hai, likhne ki nahi;
   * bhejte hi `updateMailSchema` (`.strict()`) poora Save 400 kar deti hai. Poora tark us
   * function ke upar hai — aur wo galti 22 Sep ko live chalane pe hi pakdi gayi thi.
   */
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  /** ⚠️ `/settings` nahi — mail wahan jaata hi nahi (Zod use strip kar deti hai). Apna route. */
  const load = (mail) => setForm({ ...EMPTY, ...mail, password: '' })

  const hasPassword = Boolean(form?.hasPassword)

  useEffect(() => {
    api
      .get('/settings/mail')
      .then((res) => load(res.data.data.mail))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  async function save(payload, successNotice) {
    setError(null)
    setNotice(null)
    setSaving(true)

    try {
      const res = await api.patch('/settings/mail', payload)
      load(res.data.data.mail)
      setNotice(successNotice)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    /**
     * Wahi schema jo server chalata hai (R8) — port ki hadd aur email ki shakl yahin pakdi
     * jaati hai. `toMailUpdate()` pehle chalti hai: wo padhne-wali keys girati hai, warna
     * `.strict()` unhi pe 400 de deti hai.
     */
    const parsed = updateMailSchema.safeParse(toMailUpdate(form))
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      setNotice(null)
      return
    }

    await save(parsed.data, 'Saved.')
  }

  /**
   * Password mitane ka apna raasta.
   *
   * ⚠️ Khaali khaana Save karne se password **nahi** mit-ta — wo "purana rehne do" hai, kyunki
   * ye khaana hamesha khaali khulta hai (screen password padhti hi nahi). Do alag iraadon ke
   * do alag button hone chahiye; ek hi khaali value se dono matlab nikaalna wahi galti hai jo
   * D-105 pe pakdi gayi thi.
   */
  const clearPassword = () => save({ clearPassword: true }, 'Password removed.')

  async function sendTest() {
    setError(null)
    setNotice(null)
    setTesting(true)

    try {
      const res = await api.post('/settings/mail/test')
      setNotice(`Test email sent to ${res.data.data.to}. Check that inbox.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (form === null) {
    return (
      <div className="notice err" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <SettingsTabs />

      <p className="subtitle">
        The email account the site sends from. Your email provider gives you these six details —
        paste them in, then send yourself a test email to check they work.
      </p>

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
        </div>
      )}

      {!canEdit && (
        <div className="notice" role="status">
          <span>Only an administrator can change these.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="panel">
          <div className="panel-head">
            <h2>SMTP</h2>
          </div>

          <div className="panel-body row2">
            <div className="field">
              <label htmlFor="mail-host">Host</label>
              <input
                id="mail-host"
                className="inp"
                value={form.host}
                onChange={(e) => setField('host', e.target.value)}
                disabled={!canEdit}
                placeholder="smtp.gmail.com"
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label htmlFor="mail-port">Port</label>
              <input
                id="mail-port"
                className="inp"
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) => setField('port', e.target.value)}
                disabled={!canEdit}
              />
              {/*
                Reference me koi "Encryption" dropdown nahi hai (R15), aur uski zaroorat bhi
                nahi — `secure` port se derive hota hai. Ye hint isliye hai ki client ko wo
                niyam dikh jaaye, warna 465 aur 587 me se chunna andaaza ban jaata hai.
              */}
              <div className="hint">587 for most providers, 465 if yours asks for SSL.</div>
            </div>

            <div className="field">
              <label htmlFor="mail-user">Username</label>
              <input
                id="mail-user"
                className="inp"
                value={form.user}
                onChange={(e) => setField('user', e.target.value)}
                disabled={!canEdit}
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label htmlFor="mail-password">Password</label>
              <PasswordInput
                id="mail-password"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                disabled={!canEdit}
                placeholder={hasPassword ? '••••••••••••' : ''}
                /*
                  ⚠️ `new-password` taaki browser yahan **logged-in admin ka apna** password
                  na bhar de. `off` ko Chrome aksar nazarandaaz karta hai; `new-password` wo
                  ek value hai jise wo maanta hai.
                */
                autoComplete="new-password"
              />
              <div className="hint">
                {hasPassword
                  ? 'A password is saved. Leave this blank to keep it, or type a new one to replace it.'
                  : 'Gmail needs an App Password here, not your normal one.'}
              </div>
              {hasPassword && canEdit && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={clearPassword}
                  disabled={saving}
                >
                  Remove saved password
                </button>
              )}
            </div>

            <div className="field">
              <label htmlFor="mail-from-name">From Name</label>
              <input
                id="mail-from-name"
                className="inp"
                value={form.fromName}
                onChange={(e) => setField('fromName', e.target.value)}
                disabled={!canEdit}
                placeholder="Wanderly Travels"
              />
              <div className="hint">The name people see the email is from.</div>
            </div>

            <div className="field">
              <label htmlFor="mail-from-email">From Email</label>
              <input
                id="mail-from-email"
                className="inp"
                type="email"
                value={form.fromEmail}
                onChange={(e) => setField('fromEmail', e.target.value)}
                disabled={!canEdit}
                placeholder="hello@yoursite.com"
              />
              {/*
                Ye hint asli duniya ki sabse aam dikkat hai aur wo hamare code ki nahi hai —
                isliye use screen pe likha hai, code ke comment me nahi.
              */}
              <div className="hint">
                Some providers only allow addresses on a domain you have verified with them.
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="panel-foot">
              {/*
                ⚠️ `type="button"` zaroori hai — form ke andar bina iske ye Save chala deta.
                Test bhejne se pehle Save karna padta hai (server DB se padhta hai), isliye
                hint me wo saaf likha hai.
              */}
              <button className="btn btn-sm" type="button" onClick={sendTest} disabled={testing}>
                {testing ? 'Sending…' : 'Send Test Email'}
              </button>
              <span className="muted">
                {user?.email ? `Sends to you at ${user.email}. Save first.` : 'Save first.'}
              </span>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </form>
    </>
  )
}
