import { updatePackageDefaultsSchema } from '@cms/shared'

/**
 * Shape `packages/shared` me hai (R8). Koi `create` schema nahi — singleton hai (D-40 ka
 * hi pattern), aur `ensurePackageDefaults()` document bana deta hai.
 */
export { updatePackageDefaultsSchema }
