import { updateIntegrationsSchema } from '@cms/shared'
import { useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * `Settings ▸ Integrations` — teesre tools ka code, poori site pe (client, 22 Sep, D-106).
 *
 * Client ke shabd: _"view source me dikhega across the website, not on frontend"_ — yaani ye content
 * nahi hai. Google Analytics, Meta Pixel, GTM, Search Console ka verify — sab yahin jaate hain.
 *
 * ## ⚠️ Ye screen `settings.scripts.update` ke peeche hai, `settings.update` ke nahi
 *
 * `<script>` inject karne wala user admin ke browser me code chala sakta hai — spec 001 (19 Aug)
 * ne isiliye ise ek **privilege boundary** kaha tha, "settings field" nahi. Wo permission theek isi
 * din ke liye reserve ki gayi thi aur aaj tak kahin use nahi hui thi.
 *
 * ⚠️ **Aaj ye rok kuch nahi badalti** — `settings.update` bhi abhi sirf admin ke paas hai. Alag
 * rakhne ki wajah aage hai: Phase 7 ka custom-role builder kisi ko "settings sambhalo" dega, aur us
 * din script inject karna usme apne aap nahi aana chahiye.
 *
 * Isi wajah se ye apne route pe save hoti hai (`PATCH /api/settings/integrations`), aam settings
 * wale route pe nahi.
 */

/** Teen khaane — kram wahi jo page pe unki jagah ka hai (upar se neeche). */
const BOXES = [
  {
    key: 'header',
    label: 'Header',
    where: 'Just before </head>',
    hint: 'Analytics and verification tags. Anything that must run before the page is drawn — Google Analytics, Search Console, the Tag Manager head snippet.',
    placeholder: '<!-- Google tag (gtag.js) -->\n<script async src="https://…"></script>',
  },
  {
    key: 'body',
    label: 'Body',
    where: 'Right after <body> opens',
    hint: "Tag Manager's <noscript> block goes here — it only works in this position. Most tools do not need this box.",
    placeholder:
      '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=…"></iframe></noscript>',
  },
  {
    key: 'footer',
    label: 'Footer',
    where: 'Just before </body>',
    hint: 'Chat widgets, heatmaps, anything that is not needed straight away. Putting these here keeps the page opening fast.',
    placeholder: '<script src="https://…/widget.js" defer></script>',
  },
]

const EMPTY = { header: '', body: '', footer: '' }

export default function Integrations() {
  const { can } = useAuth()
  /** ⚠️ `settings.update` nahi — poora tark file ke sar pe hai. */
  const canEdit = can('settings.scripts.update')

  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setForm({ ...EMPTY, ...(res.data.data.settings.integrations ?? {}) }))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const setBox = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    /** Wahi schema jo server chalata hai (R8) — lambai ki hadd yahin dikh jaati hai, 400 se pehle. */
    const parsed = updateIntegrationsSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      /** ⚠️ Apna route — `/settings` nahi. Wahan ye field jaan-boojh kar li hi nahi jaati (D-106). */
      const res = await api.patch('/settings/integrations', form)
      setForm({ ...EMPTY, ...(res.data.data.settings.integrations ?? {}) })
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
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
        Code from other tools — analytics, ads and chat. It is added to every page of the site and
        is only visible in the page source, never on the page itself.
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

      {/*
        ⚠️ Ye chetavni jaan-boojh kar screen pe hai, sirf code ke comment me nahi. Baaki settings ki
        ek galti ek page bigaadti hai; yahan ki ek galti **poori site** ka HTML tod sakti hai, kyunki
        ye code bina kisi safai ke jaata hai.
      */}
      {!canEdit && (
        <div className="notice" role="status">
          <span>Only an administrator can change these.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {BOXES.map((box) => (
          <div className="panel" key={box.key}>
            <div className="panel-head">
              <h2>{box.label}</h2>
            </div>
            <div className="panel-body">
              <div className="field">
                <label htmlFor={`int-${box.key}`}>{box.where}</label>
                <textarea
                  id={`int-${box.key}`}
                  className="inp css-box"
                  rows={8}
                  spellCheck={false}
                  value={form[box.key]}
                  onChange={(e) => setBox(box.key, e.target.value)}
                  disabled={!canEdit}
                  placeholder={box.placeholder}
                />
                <div className="hint">{box.hint}</div>
              </div>
            </div>
          </div>
        ))}

        <div className="panel">
          <div className="panel-body">
            <div className="hint">
              Paste the code exactly as the tool gives it, including the <code>&lt;script&gt;</code>{' '}
              tags. It is added to every page as-is, so a broken tag here can break the whole site —
              open the site once after saving.
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="panel-foot">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </form>
    </>
  )
}
