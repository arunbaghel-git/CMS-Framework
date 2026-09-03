import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

/**
 * `Export CSV` — sidebar ka wo item jo design ke nav me hai (`admin-design-v2.html`).
 *
 * Ek nav link jo **download** shuru kare, wo apne aap me ajeeb hai: baaki har item ek screen
 * kholta hai. Design me export list ke upar ek **button** bhi hai, aur wo jagah zyada sahi
 * lagti hai (wo abhi ke filter ke saath export karta hai).
 *
 * ⚠️ **Phir bhi nav item hataya nahi gaya.** D-43 me "bina poochhe UI hatana" ki galti ho
 * chuki hai (Appearance ka Header tab), isliye ye faisla client ka hai. Tab tak ye chhota
 * sa raasta wahi karta hai jo label kehta hai — download shuru, aur wapas list pe.
 *
 * Bina iske wo link `/enquiries/:id` pe gir jaata aur "Enquiry not found" dikhata.
 */
export default function EnquiryExport() {
  useEffect(() => {
    /**
     * `window.location` se — `fetch` se nahi.
     *
     * Download browser ko karna chahiye, taaki `Content-Disposition` ka `filename` chale aur
     * cookie apne aap jaaye. `fetch` se laane pe blob banana padta aur file ka naam hum
     * dobara likhte — do jagah ek hi naam ka niyam.
     */
    window.location.href = '/api/enquiries/export'
  }, [])

  return <Navigate to="/enquiries" replace />
}
