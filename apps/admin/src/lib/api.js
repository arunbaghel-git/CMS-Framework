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

  /**
   * ⚠️ **File upload — JSON header hatao** (client, 15 Sep: Media me _"Upload file is required"_).
   *
   * Upar default `Content-Type: application/json` hai, aur axios 1.x usi header ko dekh kar `FormData`
   * ko **JSON bana deta hai** (`{"file":{}}`) — file server tak pahunchti hi nahi. Logo/footer/banner ki
   * screens `multipart/form-data` khud bhejti thin isliye chalti rahin; Media Library aur picker ka
   * `uploadMedia()` nahi bhejta tha. Ilaaj yahan, ek jagah: jo bhi screen `FormData` bheje, header sahi.
   * Boundary browser khud jodta hai (adapter header ko khaali karke).
   */
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data'
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
  if (!firstField?.message) return payload.message ?? fallback

  const where = fieldPathLabel(firstField.path)
  return where ? `${where}: ${firstField.message}` : firstField.message
}

/**
 * Zod ke field path ko padhne laayak jagah me badalta hai.
 *
 *   items.1.mega.columns.0.groups.2.links.3.link.url
 *   → "Item 2 → Column 1 → Group 3 → Link 4"
 *
 * **Sirf message dikhana kaafi nahi tha.** Menu ek bada tree hai; "Enter a path starting
 * with /" padh kar user ko ye pata hi nahi chalta ki **kaunsi** row me. 50 links me se ek
 * dhoondhna padta tha.
 *
 * Anjaan segments chhod diye jaate hain — ye ek madad hai, poora path dump nahi.
 *
 * @param {string} [path] dot-separated, jaisa API bhejti hai
 */
function fieldPathLabel(path) {
  if (!path) return ''

  const NAMES = { items: 'Item', columns: 'Column', groups: 'Group', links: 'Link' }
  const parts = path.split('.')
  const out = []

  for (let i = 0; i < parts.length - 1; i++) {
    const name = NAMES[parts[i]]
    const index = Number(parts[i + 1])
    // 1-based, kyunki user ko screen pe "Column 1" dikhta hai, "Column 0" nahi
    if (name && Number.isInteger(index)) out.push(`${name} ${index + 1}`)
  }

  return out.join(' → ')
}
