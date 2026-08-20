import mongoose from 'mongoose'

/**
 * `roles` — role se permissions ka mapping.
 *
 * Mapping **DB me** hai, code me hardcode nahi (spec 001) — taaki Phase 7 me custom
 * role banana sirf ek document insert ho, code change nahi.
 * `packages/shared` ka `ROLE_PERMISSIONS` sirf **seed ka default** hai, source of
 * truth ye collection hai.
 */
const roleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    permissions: { type: [String], default: [] },
    /** Built-in role delete nahi ho sakta aur uski `key` immutable hai. */
    isBuiltIn: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'roles' },
)

export const Role = mongoose.model('Role', roleSchema)
