import {
  contentTypeListQuerySchema,
  createContentTypeSchema,
  updateContentTypeSchema,
} from '@cms/shared'

/**
 * Content type ka shape `packages/shared` me hai (R8) — admin ka form aur API ek hi
 * schema pe. Query params bhi wahin se, taaki `req.query` kabhi seedha Mongoose tak na
 * pahunche (R9).
 */
export { contentTypeListQuerySchema, createContentTypeSchema, updateContentTypeSchema }
