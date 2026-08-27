import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,

    /**
     * Sab interfaces pe suno, sirf localhost pe nahi.
     *
     * Vite default me `localhost` (aur Windows pe `[::1]`) pe bind hota hai — yaani
     * dev server sirf **isi machine** se khulta hai. Next (`apps/web`) default me hi
     * `0.0.0.0` pe bind hota hai, isliye dono me farq tha aur wo tab pakda gaya jab
     * cloudflared se admin share karne pe **502** aaya par site chal gayi.
     *
     * Iske bina teen cheezein nahi hoti: docker container se pahunch, LAN pe doosri
     * machine (mobile pe test), aur koi bhi tunnel.
     *
     * ⚠️ Iska matlab hai ki dev server **aapke network pe khula hai**. Wo sirf dev ka
     * server hai — prod me admin ek static build hai jo API ke saath serve hoti hai.
     */
    host: true,
    // Same-origin setup dev me isi proxy se milta hai (D-12) —
    // cookies aur CSRF isi par depend karte hain.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
