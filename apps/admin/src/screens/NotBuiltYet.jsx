import { useLocation } from 'react-router-dom'

/**
 * Un sections ke liye jo abhi bane nahi hain.
 *
 * D-30: connection point abhi banao, data baad me — **aur khaali cheez khaali dikhni
 * chahiye, tooti hui nahi.** Non-technical client ko pata chalna chahiye ki "abhi
 * kuch nahi hai", na ki "kuch toot gaya hai".
 *
 * Isliye 404 nahi, blank page nahi — saaf jawab.
 */
export default function NotBuiltYet({ title = 'Ye section', phase = null }) {
  const location = useLocation()

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
      </div>

      <p className="subtitle">Ye hissa abhi bana nahi hai.</p>

      <div className="panel">
        <div className="panel-body">
          <p style={{ margin: 0 }}>
            {phase ? `Ye ${phase} me aayega.` : 'Ye aage ke phase me aayega.'} Tab tak yahan kuch
            karne ko nahi hai.
          </p>
          <p className="hint" style={{ marginBottom: 0 }}>
            {location.pathname}
          </p>
        </div>
      </div>
    </>
  )
}
