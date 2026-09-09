/**
 * Previous / Next — reference ka `.pn` (spec 008, Slice D).
 *
 * ## Ek taraf khaali ho to wahan kuch render nahi hota
 *
 * Sabse naye post pe `next` `null` hota hai (uske aage kuch hai hi nahi) aur sabse purane pe
 * `prev`. Theme us taraf **khaali dabba nahi banati** — wo D-30 ka wahi niyam hai jo logo
 * (D-42 §2), khaali stat cards aur adhoore button pe lagta hai.
 *
 * ⚠️ Grid `1fr 1fr` hai, isliye akela bacha hua link **aadhi chaudai** me baayen rehta hai —
 * aur wo theek hai: `Next` daayen chipka hua akela card ye jhooth bolta ki uske baayen kuch
 * hai jo load nahi hua.
 *
 * ⚠️ Dono `null` hon (site pe ek hi post) to poora `<nav>` gayab.
 */

const Arrow = ({ back }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d={back ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'} />
  </svg>
)

export default function PostNav({ prev, next }) {
  if (!prev && !next) return null

  return (
    <nav className="pn" aria-label="More articles">
      {prev && (
        <a href={prev.path}>
          <span>
            <Arrow back />
            Previous
          </span>
          <b>{prev.title}</b>
        </a>
      )}

      {next && (
        <a className="nx" href={next.path}>
          <span>
            Next
            <Arrow />
          </span>
          <b>{next.title}</b>
        </a>
      )}
    </nav>
  )
}
