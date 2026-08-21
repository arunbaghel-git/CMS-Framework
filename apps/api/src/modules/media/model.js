import mongoose from 'mongoose'
import { DEFAULT_SITE_ID } from '@cms/shared'

export const MEDIA_MIME = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
export const MEDIA_VARIANT_KEY = Object.freeze(['thumb', 'medium', 'large'])

/**
 * `media` collection foundation (D-41).
 *
 * Upload/storage implementation abhi nahi hai. Ye model sirf metadata shape reserve
 * karta hai, taaki Logo/Favicon media IDs se wire ho sakein aur full Media phase me
 * folders/trash ke liye migration na chahiye.
 *
 * Indexes migration 006 me hain; production me Mongoose `autoIndex` off rahega.
 */
const variantSchema = new mongoose.Schema(
  {
    key: { type: String, enum: MEDIA_VARIANT_KEY, required: true },
    url: { type: String, required: true },
    w: { type: Number, required: true, min: 1 },
    h: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const mediaSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, default: DEFAULT_SITE_ID },

    /** Sanitized original filename. Storage identity D-41 key scheme se aati hai. */
    filename: { type: String, required: true, trim: true },
    mime: { type: String, enum: MEDIA_MIME, required: true },
    size: { type: Number, required: true, min: 1 },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },

    folderId: { type: String, default: null },
    deletedAt: { type: Date, default: null },
    variants: { type: [variantSchema], default: [] },

    alt: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    caption: { type: String, default: '', trim: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'media' },
)

export const Media = mongoose.model('Media', mediaSchema)
