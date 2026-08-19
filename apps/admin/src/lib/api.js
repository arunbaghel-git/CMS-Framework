import axios from 'axios'

/**
 * Admin API client.
 *
 * TODO Phase 0 — single-flight refresh mutex (D-13):
 * ek screen 5 parallel request maarti hai, sab 401 aate hain, aur bina mutex ke
 * 5 refresh chal padte hain. Rotation + reuse detection ke saath 4 "token chori"
 * lagte hain aur user random logout ho jaata hai.
 */
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})
