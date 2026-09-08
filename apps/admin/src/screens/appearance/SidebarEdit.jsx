import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api, errorMessage } from '../../lib/api.js'
import { useAuth } from '../../lib/auth.jsx'
import { useForms } from '../forms/useForms.js'
import AppearanceTabs from './AppearanceTabs.jsx'
import SidebarWidgets from './SidebarWidgets.jsx'
import { useSidebar } from './useSidebars.js'
import './Appearance.css'

/**
 * Ek sidebar ka editor — D-88.
 *
 * Naam, aur widgets ki ordered list. Widgets ka editor `SidebarWidgets.jsx` me hai aur wo
 * `PageBlocks.jsx` ka hi saancha hai — ek hi admin me do jagah alag tareeke se drag karna hi
 * confusion hai (8 Sep ka sabak).
 */
export default function SidebarEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()
  const canEdit = can('sidebar.update')

  const { data, loading, error: loadError } = useSidebar(id)

  const [name, setName] = useState('')
  const [widgets, setWidgets] = useState([])
  const [version, setVersion] = useState(0)
  const [open, setOpen] = useState([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!data) return
    setName(data.name ?? '')
    setWidgets(data.widgets ?? [])
    setVersion(data.version ?? 0)
  }, [data])

  /**
   * Form ka dropdown sirf **active** forms dikhata hai.
   *
   * ⚠️ `useForms` ki dep `query` object hai — isliye wo `useMemo` me bandha hua hai. Bina uske
   * har render pe naya object banta aur request ka infinite loop chal padta: theek wahi bug jo
   * 8 Sep ko `PageEdit` pe pakda gaya tha, jahan client ko wo _"Bahut zyada requests"_ ki shakl
   * me dikha tha.
   */
  const formQuery = useMemo(() => ({ status: 'active', limit: 200 }), [])
  const { data: forms, loading: formsLoading } = useForms(formQuery)

  const toggle = (widgetId) =>
    setOpen((prev) =>
      prev.includes(widgetId) ? prev.filter((x) => x !== widgetId) : [...prev, widgetId],
    )

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const res = await api.patch(`/sidebars/${id}`, { name, widgets, version })

      /**
       * ⚠️ Naya `version` server ke jawab se liya jaata hai, khud se `+1` nahi.
       *
       * Client ka hisaab server ke hisaab se alag ho jaane ka matlab hota ki agla save bina
       * wajah `409` khaata — aur wo failure "kisi aur ne badla" jaisi dikhti, jabki koi doosra
       * hota hi nahi.
       */
      const saved = res.data.data.sidebar
      setVersion(saved.version ?? 0)
      setWidgets(saved.widgets ?? [])
      setNotice('Saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="subtitle">Loading…</p>
  if (!data) return <div className="notice err">{loadError ?? 'Sidebar not found'}</div>

  return (
    <>
      <div className="page-head">
        <h1>Edit Sidebar</h1>
        <Link className="btn page-title-action" to="/appearance/sidebars">
          Back to list
        </Link>
      </div>
      <AppearanceTabs />

      {error && (
        <div className="notice err" role="alert">
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="notice ok">
          <span>{notice}</span>
        </div>
      )}
      {!canEdit && (
        <div className="notice">
          <span>You can view this sidebar, but not change it.</span>
        </div>
      )}

      <form onSubmit={save}>
        <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="panel">
            <div className="panel-head">
              <h2>Sidebar</h2>
            </div>

            <div className="panel-body">
              <div className="field" style={{ maxWidth: 360 }}>
                <label>Name</label>
                <input
                  className="inp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                />
                <div className="hint">
                  This is the name you will pick on a page, so make it say where it is used — “Tour
                  pages sidebar”, “Blog sidebar”.
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>What shows in this sidebar</h2>
            </div>

            <div className="panel-body">
              <SidebarWidgets
                widgets={widgets}
                onChange={setWidgets}
                disabled={!canEdit}
                open={open}
                onToggle={toggle}
                forms={forms}
                formsLoading={formsLoading}
              />

              {widgets.length === 0 && (
                <p className="hint">
                  Nothing here yet. Add a widget — the order you set here is the order on the page.
                </p>
              )}
            </div>

            {canEdit && (
              <div className="panel-foot">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => navigate('/appearance/sidebars')}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </fieldset>
      </form>
    </>
  )
}
