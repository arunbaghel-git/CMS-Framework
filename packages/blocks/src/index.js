/**
 * Block registry + renderer. Admin canvas aur public site DONO yahi import karte hain.
 *
 * Abhi khaali hai — blocks Phase 3 (renderer) aur Phase 5 (builder) me aayenge.
 * Rules: 02-ARCHITECTURE.md §6
 *
 *  - Blocks framework-agnostic rahenge; host `components={{ Link, Image }}` inject karega
 *  - Responsive CSS `styleToCss()` se, inline style se kabhi nahi
 *  - Block ka `type` string kabhi rename mat karo — wo DB me stored data hai
 */
export {}
