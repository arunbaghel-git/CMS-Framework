/**
 * Zod contract — spec 002.
 *
 * Admin aur API DONO yahan se import karte hain, taaki validation ek hi jagah rahe (R8).
 * Ye contract FROZEN hai — badalna sabse mehnga refactor hai.
 *
 * "Frozen" ka matlab "kabhi nahi" nahi hai; matlab hai **badalne ke liye ek decision
 * record chahiye, aur wo tabhi jab live data pe migration na lage**. Aaj tak ek hi baar
 * badla hai: `taxonomyRefsSchema` (A-7, **D-49**), jab `entries` me abhi koi asli data
 * tha hi nahi.
 */
export * from './block.js'
export * from './content.js'
export * from './seo.js'
export * from './entry.js'
export * from './user.js'
export * from './settings.js'
export * from './menu.js'
export * from './content-type.js'
export * from './taxonomy.js'
export * from './master-lists.js'
export * from './package-defaults.js'
export * from './redirect.js'
export * from './itinerary.js'
