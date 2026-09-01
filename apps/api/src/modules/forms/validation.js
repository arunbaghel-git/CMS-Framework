import {
  createFormSchema,
  formListQuerySchema,
  submitEnquirySchema,
  updateFormSchema,
} from '@cms/shared'

/**
 * Forms ka shape `packages/shared` me hai (R8) — admin ka builder aur API ek hi schema pe.
 * Query params bhi wahin se (R9).
 */
export { createFormSchema, formListQuerySchema, submitEnquirySchema, updateFormSchema }
