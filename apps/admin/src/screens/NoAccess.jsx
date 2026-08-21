import { Link } from 'react-router-dom'

/**
 * "Ye aapke liye nahi hai" — jab route pe permission na ho (D-37).
 *
 * Ye `NotBuiltYet` se alag cheez hai: wahan section bana hi nahi, yahan section bana
 * hai par is user ka nahi. Dono ko ek hi screen dikhana user ko galat baat batata hai.
 *
 * **Redirect jaan-boojh kar nahi kiya.** Chupchaap dashboard pe bhej dene se user ko
 * lagta hai link toota hua hai aur wo dobara-dobara click karta hai. Saaf jawab dena
 * behtar hai — khaas kar tab jab kisi ne use wo link bheja ho.
 */
export default function NoAccess() {
  return (
    <>
      <div className="page-head">
        <h1>You don't have access to this section</h1>
      </div>

      <p className="subtitle">Your role does not have permission to view this page.</p>

      <div className="panel">
        <div className="panel-body">
          <p style={{ margin: 0 }}>
            If you need to work here, ask your administrator — they can grant access.
          </p>
          <p className="hint" style={{ marginBottom: 0 }}>
            <Link to="/">Back to Dashboard</Link>
          </p>
        </div>
      </div>
    </>
  )
}
