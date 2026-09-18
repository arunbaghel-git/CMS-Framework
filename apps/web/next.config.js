/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cms/blocks', '@cms/shared'],

  /**
   * `X-Powered-By: Next.js` har response se hat gaya.
   *
   * Do wajah: wo har response me bytes jodta hai bina kuch kiye, aur wo bina maange ye bhi
   * bata deta hai ki server kis cheez pe chal raha hai. Dono me se koi bhi akela kaafi nahi
   * tha, par ise rakhne ki bhi koi wajah nahi hai.
   */
  poweredByHeader: false,

  /**
   * ⚠️ `experimental.inlineCss` **naapa gaya aur rad hua** (18 Sep). Render-blocking CSS (~466ms)
   * to gayi aur FCP ~0.3s sudhra, par CSS HTML ke saath RSC payload me bhi chali gayi — home ka HTML
   * 340 → 558 KB, TBT 129 → ~600ms, mobile score **89 → 74** (5 run ka median). Dobara mat jodna
   * jab tak Next ka ye duplication theek na ho.
   */

  async rewrites() {
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000'

    return [
      // Same-origin: /api API server pe jaata hai (D-12)
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },

      /**
       * Media bhi API server serve karta hai (local storage driver, D-41).
       *
       * **Ye chhoot gaya tha aur logo header me nahi aa raha tha.** `media.variants[].url`
       * jaan-boojh kar **relative** hoti hai (`/uploads/...`) — usme kabhi `localhost:4000`
       * store nahi hota, warna wo dev hostname DB me baith kar prod me toot-ta. Matlab
       * resolve karne ka kaam serve karne wale ka hai, aur `apps/web` wo kar hi nahi raha
       * tha: `/uploads/...` Next pe 404 deta tha.
       *
       * `apps/admin` me yahi kaam Vite ka dev proxy karta hai. Ye uska Next wala jodi-daar hai.
       *
       * ⚠️ Iske bina D-42 §2 ka invariant **delivery layer pe** toot-ta hai: payload me
       * logo sahi aata hai, par browser me `<img>` toota hua hota hai. Wo invariant sirf
       * data ka nahi hai.
       *
       * Prod me media CDN se aayegi (`CDN_BASE_URL`, 06-OPERATIONS §4) — tab ye rewrite
       * chalti to rahegi par use hogi nahi, kyunki URL absolute ho jaayegi.
       */
      {
        source: '/uploads/:path*',
        destination: `${apiUrl}/uploads/:path*`,
      },
    ]
  },
}

export default nextConfig
