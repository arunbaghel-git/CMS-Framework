import axios from 'axios'

/**
 * Admin API client.
 *
 * Do cheezein yahan zaroori hain, dono architecture §8.1 se:
 *   1. har non-GET request pe CSRF header
 *   2. **single-flight refresh mutex** (D-13)
 */

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

const CSRF_COOKIE = 'cms_csrf'
const CSRF_HEADER = 'X-CSRF-Token'

/**
 * CSRF token **cookie se** padha jaata hai, memory se nahi.
 *
 * Page reload ke baad koi login response bacha hi nahi hota, par session zinda hota
 * hai. Isiliye ye cookie server pe `httpOnly` nahi hai — JS ko ise padhna hi hai.
 */
export function readCsrfToken() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toUpperCase()

  if (method !== 'GET' && method !== 'HEAD') {
    const token = readCsrfToken()
    if (token) config.headers[CSRF_HEADER] = token
  }

  return config
})

/**
 * Chalu refresh call. `null` matlab koi refresh nahi chal raha.
 *
 * **Ye mutex kyun zaroori hai:** ek screen load hote hi 5 parallel request maarti hai.
 * Access token expire ho chuka hai to paanchon 401 aate hain. Bina mutex ke paanch
 * refresh chal padte hain — pehla token rotate kar deta hai, aur baaki chaar ab
 * **purana** token bhej rahe hote hain. Server ke liye wo bilkul "token chori" jaisa
 * dikhta hai, reuse detection chal jaati hai, poori family revoke ho jaati hai, aur
 * user bina wajah logout ho jaata hai.
 *
 * Mutex ke saath paanchon ek hi refresh ka intezaar karte hain.
 *
 * @type {Promise<void>|null}
 */
let refreshInFlight = null

/** Session khatam hone pe app ko batane ka raasta (AuthProvider isse set karta hai). */
let onSessionExpired = () => {}

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler
}

function runRefresh() {
  refreshInFlight ??= api
    .post('/auth/refresh')
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null
    })

  return refreshInFlight
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    /**
     * Refresh sirf tab jab: 401 aaya ho, request pehle se retry na ho, aur wo request
     * khud auth endpoint na ho. Warna fail hue refresh pe dobara refresh chalta hai —
     * infinite loop.
     */
    const isAuthCall = original?.url?.startsWith('/auth/')

    if (status !== 401 || original?._retried || isAuthCall) {
      return Promise.reject(error)
    }

    original._retried = true

    try {
      await runRefresh()
      return api(original)
    } catch (refreshError) {
      onSessionExpired()
      return Promise.reject(refreshError)
    }
  },
)

/**
 * API error se wo message nikaalta hai jo user ko dikhaya ja sake.
 *
 * Server ka shape `{ error: { code, message, details } }` hai (07-CONVENTIONS §6).
 * Field-level Zod errors bhi yahin se aate hain.
 */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const payload = error?.response?.data?.error
  if (!payload) return error?.message ?? fallback

  const firstField = payload.details?.fields?.[0]
  return firstField?.message ?? payload.message ?? fallback
}
