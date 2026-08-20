import './components/admin/AdminBar.css'
import './components/admin/Sidebar.css'

/**
 * Admin shell.
 *
 * Layout aur styling `.claude/docs/reference/admin-design.html` se aati hai —
 * wo design FROZEN hai (D-28). Yahan structure abhi placeholder hai; asli
 * AdminBar aur Sidebar components Phase 0 me banenge.
 */
export default function App() {
  return (
    <>
      <div className="adminbar">
        <span className="ab-item ab-brand">CMS</span>
        <span className="spacer" />
        <span className="ab-item">Skeleton chal raha hai</span>
      </div>

      <div className="main">
        <div className="page-head">
          <h1>Admin shell</h1>
        </div>
        <p className="subtitle">
          Login, sidebar aur protected routes Phase 0 me banenge — design ke hisaab se.
        </p>

        <div className="card">
          <div className="card-body">
            <p style={{ margin: 0 }}>
              CSS structure taiyaar hai: tokens → base → layout → primitives, aur har
              component apni CSS ke saath.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
