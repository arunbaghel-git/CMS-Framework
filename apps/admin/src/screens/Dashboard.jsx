import { useAuth } from '../lib/auth.jsx'

/**
 * Dashboard — abhi sirf ye batata hai ki session chal raha hai aur is user ke paas
 * kya permissions hain.
 *
 * Design wale asli cards (At a Glance, Recent Enquiries, Site Health) Phase 1 aur 7b
 * ke data pe depend karte hain. Unhe abhi khaali/0 dikhana jhoot bolna hota — isliye
 * wo tab aayenge jab unke peeche asli data ho (D-30).
 */
export default function Dashboard() {
  const { user } = useAuth()

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>

      <p className="subtitle">Welcome back, {user?.name?.split(' ')[0]}.</p>

      <div className="panel">
        <div className="panel-head">
          <h2>Session</h2>
        </div>
        <div className="panel-body">
          <p style={{ marginTop: 0 }}>
            <strong>{user?.email}</strong> — role <code>{user?.role}</code>
          </p>
          <p className="hint" style={{ marginBottom: 0 }}>
            {user?.permissions?.length ?? 0} permissions come with this role.
          </p>
        </div>
      </div>
    </>
  )
}
