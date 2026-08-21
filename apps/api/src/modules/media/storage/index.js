import { env } from '../../../core/env.js'
import { createLocalStorageDriver } from './local.js'
import { createS3StorageDriver } from './s3.js'

/**
 * Storage driver factory — D-41.
 *
 * Upload/sharp processing is factory ka kaam nahi. Ye sirf object storage contract deta
 * hai: putObject, deleteObject, publicUrl.
 */
export function createStorageDriver(config = env) {
  if (config.STORAGE_DRIVER === 'local') {
    return createLocalStorageDriver({ uploadDir: config.UPLOAD_DIR })
  }

  if (config.STORAGE_DRIVER === 's3') {
    return createS3StorageDriver(config)
  }

  throw new Error(`Unknown media storage driver: ${config.STORAGE_DRIVER}`)
}

let storageDriver

export function getStorageDriver() {
  storageDriver ??= createStorageDriver()
  return storageDriver
}

export function resetStorageDriverForTest() {
  storageDriver = undefined
}
