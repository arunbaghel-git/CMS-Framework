import {
  createAddOnSchema,
  createHotelSchema,
  createReviewSchema,
  createTransferSchema,
  createVideoReviewSchema,
  masterListQuerySchema,
  updateAddOnSchema,
  updateHotelSchema,
  updateReviewSchema,
  updateTransferSchema,
  updateVideoReviewSchema,
} from '@cms/shared'

/**
 * Master lists ka shape `packages/shared` me hai (R8) — admin ka form aur API ek hi
 * schema pe. Query params bhi wahin se (R9).
 */
export { masterListQuerySchema }

/**
 * List key → uska create/update schema.
 *
 * Controller isi map se schema uthata hai, `if/else` se nahi: nayi list jodne pe sirf
 * yahan aur service ke registry me ek-ek line judti hai, poore module me nahi.
 */
export const SCHEMAS = Object.freeze({
  hotel: { create: createHotelSchema, update: updateHotelSchema },
  addOn: { create: createAddOnSchema, update: updateAddOnSchema },
  transfer: { create: createTransferSchema, update: updateTransferSchema },
  review: { create: createReviewSchema, update: updateReviewSchema },
  videoReview: { create: createVideoReviewSchema, update: updateVideoReviewSchema },
})
