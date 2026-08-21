import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const API_ROOT = fileURLToPath(new URL('../../../../', import.meta.url))

/**
 * `UPLOAD_DIR` resolution D-41 ke hisaab se:
 *   - absolute path: wahi
 *   - relative path: `apps/api` root se, `process.cwd()` se nahi
 *
 * @param {string} uploadDir
 * @param {string} [apiRoot]
 */
export function resolveUploadDir(uploadDir, apiRoot = API_ROOT) {
  return path.isAbsolute(uploadDir) ? path.normalize(uploadDir) : path.resolve(apiRoot, uploadDir)
}

/**
 * Storage key trusted input nahi hai. D-41 ka scheme slash-separated relative key hai;
 * driver `..`, absolute path aur backslash reject karta hai taaki UPLOAD_DIR ke bahar
 * write/delete na ho.
 *
 * @param {string} key
 */
export function assertSafeStorageKey(key) {
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('Media storage key is required')
  }

  if (path.isAbsolute(key) || key.includes('\\')) {
    throw new Error(`Unsafe media storage key: ${key}`)
  }

  const parts = key.split('/')
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe media storage key: ${key}`)
  }

  return parts.join(path.sep)
}

/**
 * @param {{ uploadDir: string, publicBaseUrl?: string, apiRoot?: string }} options
 */
export function createLocalStorageDriver({ uploadDir, publicBaseUrl = '/uploads', apiRoot }) {
  const root = resolveUploadDir(uploadDir, apiRoot)
  const base = publicBaseUrl.replace(/\/+$/, '')

  return {
    kind: 'local',
    root,

    /**
     * @param {{ key: string, body: Buffer|Uint8Array|string, contentType?: string, cacheControl?: string }} input
     */
    async putObject({ key, body }) {
      const relative = assertSafeStorageKey(key)
      const target = path.join(root, relative)

      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, body)

      return { key, url: this.publicUrl(key) }
    },

    /** @param {{ key: string }} input */
    async deleteObject({ key }) {
      const relative = assertSafeStorageKey(key)
      await rm(path.join(root, relative), { force: true })
    },

    /** @param {string} key */
    publicUrl(key) {
      assertSafeStorageKey(key)
      return `${base}/${key}`
    },
  }
}
