import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.test.{js,jsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],

    /**
     * Vitest ka default 5s/10s hai — hamare integration tests ke liye wo kam pad gaya.
     *
     * ⚠️ Pehle yahan likha tha ki wajah `bcryptjs` cost 12 hai. **Wo galat tha** —
     * `auth/service.js` test me pehle se cost **4** use karta hai. Asli wajah Mongo pe
     * contention hai: har `beforeEach` aath collections saaf karti hai, roles aur content
     * types seed karti hai, aur 3-4 users banati hai — aur vitest kai files parallel
     * chalata hai, sab ek hi local Mongo pe.
     *
     * Lakshan dhokha dene wala hai: pehla `beforeEach` timeout hota hai, uski cleanup
     * adhoori reh jaati hai, aur uske baad ke tests "A user with this email already
     * exists" pe girte hain — jaise koi asli bug ho. Har file **akele chalane pe pass**
     * hoti hai, aur yahi sabse bada surag hai.
     *
     * 30s ke baad bhi ye kabhi-kabhi phat-ti hai (`09-OPEN-ITEMS.md` **A-11**). Asli fix
     * `beforeEach` ke round trips ghatana hai, timeout aur badhana nahi.
     */
    hookTimeout: 30_000,
    testTimeout: 30_000,

    // Env validation boot pe chalti hai (spec 003) — test me valid values chahiye,
    // warna app import karte hi process.exit(1) ho jaayega.
    env: {
      NODE_ENV: 'test',
      SITE_URL: 'http://localhost:3000',
      ADMIN_URL: 'http://localhost:5173',
      MONGODB_URI: 'mongodb://localhost:27017',
      MONGODB_DB_NAME: 'merncms_test',
      JWT_ACCESS_SECRET: 'test-secret-at-least-32-characters-long',
      JWT_REFRESH_SECRET: 'test-secret-at-least-32-characters-long',
      REVALIDATE_SECRET: 'test-secret-at-least-32-characters-long',
      STORAGE_DRIVER: 'local',
      UPLOAD_DIR: './uploads',
      LOG_LEVEL: 'error',
    },
  },
})
