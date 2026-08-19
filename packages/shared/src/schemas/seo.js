import { z } from 'zod'

/**
 * Per-entry SEO — spec 002, architecture §7.3.
 *
 * Khaali fields ka fallback chain:
 *   entry SEO → settings.titleTemplates[type] → settings.defaultSeo → title/excerpt
 *
 * Sab optional hai — SEO tab khaali chhodna normal case hai, exception nahi.
 */

export const SCHEMA_TYPES = Object.freeze([
  'WebPage',
  'Article',
  'BlogPosting',
  'Product',
  'Service',
  'Organization',
  'FAQPage',
])

export const TWITTER_CARDS = Object.freeze(['summary', 'summary_large_image'])

export const seoSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),

  /** Khaali = entry ka apna path canonical hai. */
  canonical: z.string().url().optional().or(z.literal('')),

  noindex: z.boolean().default(false),
  nofollow: z.boolean().default(false),

  ogTitle: z.string().max(200).optional(),
  ogDescription: z.string().max(500).optional(),
  ogImageId: z.string().optional(),

  twitterCard: z.enum(TWITTER_CARDS).default('summary_large_image'),
  schemaType: z.enum(SCHEMA_TYPES).default('WebPage'),

  /** SEO checklist score isi ke against calculate hota hai (Phase 4). */
  focusKeyword: z.string().max(100).optional(),
})

export function emptySeo() {
  return seoSchema.parse({})
}

/**
 * Title template resolve karta hai — `%title% | %sitename%` jaisa pattern.
 *
 * @param {string} template
 * @param {{ title?: string, sitename?: string, tagline?: string, excerpt?: string }} vars
 * @returns {string}
 */
export function applyTitleTemplate(template, vars = {}) {
  if (!template) return vars.title ?? ''

  return template
    .replace(/%title%/g, vars.title ?? '')
    .replace(/%sitename%/g, vars.sitename ?? '')
    .replace(/%tagline%/g, vars.tagline ?? '')
    .replace(/%excerpt%/g, vars.excerpt ?? '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s|·\-–—]+|[\s|·\-–—]+$/g, '')
    .trim()
}
