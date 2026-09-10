import { updateSettingsSchema } from '@cms/shared'
import { useEffect, useState } from 'react'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useSidebars } from '../appearance/useSidebars.js'
import SettingsTabs from './SettingsTabs.jsx'
import './Settings.css'

/**
 * Settings → Blog settings — author, TOC aur post ki sidebar (spec 008, client 9 Sep).
 *
 * ## Yahan kyun, Posts ke submenu me kyun nahi
 *
 * Client ne saaf kaha: _"in settings there will be a post/blog settings"_. Yaani `Tour
 * settings` wala raasta yahan **nahi** liya gaya — wo 8 Sep ko `Settings` se `Tour` ke
 * submenu me chala gaya tha. Dono client ke faisle hain; UI ki jagah aur storage ki jagah ka
 * koi bandhan nahi (wahi baat `Appearance ▸ Footer` pe pehle se likhi hai).
 *
 * ## Teenon cheezein "sabke liye ek" hain, aur wahi is screen ka poora tark hai
 *
 * Blog ke saare post ek hi shakl ke hote hain. Author har post pe wahi, TOC ka niyam har post
 * pe wahi, sidebar har post pe wahi. Inhe post ke edit screen pe rakhne ka matlab hota ki
 * client har naye post pe teen khaane bhare — aur ek din bhool jaaye, jiske baad us post pe
 * sidebar chup-chaap gayab (D-42 §2).
 */

/** Khaali — naye instance pe `blogSettings` `{}` hota hai. */
const EMPTY = {
  author: { name: '', role: '', bio: '' },
  showToc: true,
  postSidebar: 'none',
  postSidebarId: '',
  postUrlMode: 'nested',
}

export default function BlogSettings() {
  const { can } = useAuth()
  const canEdit = can('settings.update')

  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  /**
   * ⚠️ Hook yahan hai, us `if (loading) return` ke **neeche nahi** — conditional hook React ka
   * rule tod deta hai. Aur list hamesha load hoti hai, chahe `postSidebar` `none` ho: use rokne
   * ka matlab hota ki client left chunte hi ek khaali dropdown dekhe aur phir wo bhar jaaye.
   */
  const { data: sidebars, loading: sidebarsLoading } = useSidebars({ limit: 200 })

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => {
        const saved = res.data.data.settings.blogSettings ?? {}
        setBlog({ ...EMPTY, ...saved, author: { ...EMPTY.author, ...(saved.author ?? {}) } })
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const set = (key, value) => setBlog((b) => ({ ...b, [key]: value }))
  const setAuthor = (key, value) =>
    setBlog((b) => ({ ...b, author: { ...b.author, [key]: value } }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    /** Wahi schema jo server use karta hai (R8) — galti yahin pakdi jaaye, 400 se pehle. */
    const parsed = updateSettingsSchema.safeParse({ blogSettings: blog })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setSaving(true)

    try {
      /**
       * ⚠️ **Iska test response nahi, DB padhta hai.** `updateSettings()` me
       * `updatePackageDefaults()` wala whitelist jaal nahi hai (wo input pe loop karta hai),
       * par gate do jagah khisak jaata hai: field `schemas/settings.js` me na ho to Zod use
       * chup-chaap gira degi, aur `settings/model.js` me na ho to **Mongoose `strict`** use
       * gira dega. Dono soorat me API `200` degi aur yahan `"Saved."` chhapega.
       */
      const res = await api.patch('/settings', { blogSettings: blog })
      const saved = res.data.data.settings.blogSettings ?? {}
      setBlog({ ...EMPTY, ...saved, author: { ...EMPTY.author, ...(saved.author ?? {}) } })
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>

  if (!blog) {
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
        The byline, the contents list and the sidebar — these are the same on every post.
      </p>

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice ok" role="status">
          <span>{notice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-head">
            <h3>Author</h3>
          </div>
          <div className="card-body">
            <div className="field">
              <label>Name</label>
              <input
                className="inp"
                value={blog.author.name}
                onChange={(e) => setAuthor('name', e.target.value)}
                disabled={!canEdit}
                placeholder="Andaman Tourism team"
              />
              {/*
               * ⚠️ Hint me ye likha hona zaroori hai. Bina iske client soch sakta hai ki
               * byline uske apne login ke naam se banti hai — aur khaali chhodne pe wo
               * "default" ki tarah aa jaayegi. Aisa hota nahi: khaali naam pe byline ka
               * author wala hissa **render hi nahi hota**, koi fallback hai hi nahi.
               */}
              <div className="hint">
                Shown on every post. Leave it empty and no author line is shown — the name of
                whoever wrote the post in the CMS is never published.
              </div>
            </div>

            <div className="field">
              <label>Role</label>
              <input
                className="inp"
                value={blog.author.role}
                onChange={(e) => setAuthor('role', e.target.value)}
                disabled={!canEdit}
                placeholder="Planners in Port Blair"
              />
              <div className="hint">The small line under the name.</div>
            </div>

            <div className="field">
              <label>Bio</label>
              <textarea
                className="inp"
                rows={3}
                value={blog.author.bio}
                onChange={(e) => setAuthor('bio', e.target.value)}
                disabled={!canEdit}
              />
              <div className="hint">The paragraph in the box at the end of each post.</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Post URLs</h3>
          </div>
          <div className="card-body">
            <div className="field">
              <label>Where posts live</label>
              <select
                className="sel"
                value={blog.postUrlMode}
                onChange={(e) => set('postUrlMode', e.target.value)}
                disabled={!canEdit}
              >
                <option value="nested">Under the blog page — /blog/post-name</option>
                <option value="root">At the root — /post-name</option>
              </select>

              {/*
               * ⚠️ **Ye hint zaroori hai, aur uska har hissa sach hai.**
               *
               * Ye dropdown ek saada setting nahi hai — save karte hi server **har post ka URL
               * badal deta hai** aur har purane URL se 301 banata hai. Client ko ye pata hona
               * chahiye **pehle**, save ke baad nahi: uske share kiye hue aur Google me index ho
               * chuke link is ek chunav pe tike hain.
               *
               * ⚠️ `/blog/` wala hissa blog page ke **apne slug** se aata hai — isliye hint me
               * "the blog page" likha hai, hardcoded `/blog` nahi. Us page ka slug badalne pe
               * post ke URL bhi uske saath chalte hain.
               */}
              <div className="hint">
                Changing this rewrites the link of <b>every post</b>. Old links keep working — each
                one gets a permanent redirect. The <code>/blog/</code> part comes from the blog
                page&rsquo;s own permalink, so renaming that page moves the posts with it.
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Post layout</h3>
          </div>
          <div className="card-body">
            <div className="field">
              <label className="check">
                <input
                  type="checkbox"
                  checked={blog.showToc}
                  onChange={(e) => set('showToc', e.target.checked)}
                  disabled={!canEdit}
                />
                <span>Show “On this post”</span>
              </label>
              {/*
               * ⚠️ Doosri shart hint me likhi hai, aur wo zaroori hai: checkbox on hone par
               * bhi teen se kam heading wale post pe TOC nahi aati. Bina is line ke wo "toggle
               * kaam nahi kar raha" jaisa dikhta — theek wahi shakl jo D-89/D-90 ke "bana hua
               * par juda nahi" wale bugs ki thi.
               */}
              <div className="hint">
                Built automatically from the <b>H2</b> headings in the post. A post with fewer than
                three headings does not show it.
              </div>
            </div>

            <div className="field">
              <label>Sidebar</label>
              <select
                className="sel"
                value={blog.postSidebar}
                onChange={(e) => set('postSidebar', e.target.value)}
                disabled={!canEdit}
              >
                <option value="none">No sidebar</option>
                <option value="left">Left — content on the right</option>
                <option value="right">Right — content on the left</option>
              </select>
              <div className="hint">Applies to every post.</div>
            </div>

            {/*
             * ⚠️ `none` par ye chhup jaata hai par uski **value mitti nahi** — client
             * left/right toggle karke wapas aayega aur uska chunav bacha rehna chahiye. Wahi
             * soch jo page ke `sidebarId` (D-88) aur rating (D-87 §3) pe hai.
             */}
            {blog.postSidebar !== 'none' && (
              <div className="field">
                <label>Which sidebar</label>
                <select
                  className="sel"
                  value={blog.postSidebarId}
                  onChange={(e) => set('postSidebarId', e.target.value)}
                  disabled={!canEdit || sidebarsLoading}
                >
                  <option value="">{sidebarsLoading ? 'Loading…' : '— choose a sidebar —'}</option>
                  {sidebars.map((sidebar) => (
                    <option key={sidebar.id} value={sidebar.id}>
                      {sidebar.name}
                    </option>
                  ))}
                </select>
                {!sidebarsLoading && sidebars.length === 0 && (
                  <div className="hint">
                    No sidebars yet — create one under <b>Appearance ▸ Sidebar</b>.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </form>
    </>
  )
}
