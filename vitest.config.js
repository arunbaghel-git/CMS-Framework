import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.test.{js,jsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],

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
