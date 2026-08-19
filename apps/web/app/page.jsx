/**
 * Placeholder. Phase 3 me ye ek hi catch-all route ban jaayega —
 * `app/[[...slug]]/page.jsx` — jo stored `entries.path` se resolve karega (D-09).
 * Koi per-type hardcoded route kabhi nahi.
 */
export default function Home() {
  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '5rem 1.5rem',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      <p
        style={{
          fontSize: 12,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#94a3b8',
        }}
      >
        Public site
      </p>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0.5rem 0 0.75rem' }}>
        Skeleton chal raha hai
      </h1>
      <p style={{ color: '#475569', lineHeight: 1.6 }}>
        Catch-all routing, BlockRenderer aur theme Phase 3 me aayenge. Slice 0 me pehle header aur
        footer banenge — asli API data se.
      </p>
    </main>
  )
}
