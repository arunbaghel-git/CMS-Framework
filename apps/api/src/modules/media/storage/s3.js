/**
 * S3/R2 production default hai (D-22), par real implementation full Media phase me
 * aayegi. Tab tak selected `s3` clear failure hai, local fallback kabhi nahi (D-41).
 */
export function createS3StorageDriver() {
  throw new Error(
    'STORAGE_DRIVER=s3 selected hai, par S3/R2 media storage implementation abhi available nahi hai. ' +
      'Full Media phase me real S3 support aayega; tab tak local dev ke liye STORAGE_DRIVER=local use karo.',
  )
}
