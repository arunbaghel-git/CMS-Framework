/**
 * Field DSL — D-24 / spec 005.
 *
 * **EK** DSL, do nahi. Yahi registry `contentTypes.fields[]` (entry editor, Phase 6)
 * aur `blockDefinition.schema[]` (block properties panel, Phase 5c) dono ko serve
 * karta hai. Ek `<FieldRenderer field context />` dono jagah kaam karega.
 *
 * Do alag DSL rakhne ka matlab hota: field renderer do baar banta, naya type do jagah
 * add hota, aur waqt ke saath `select` dono jagah thoda alag behave karne lagta.
 */

export const FIELD_CONTEXT = Object.freeze({
  /** Entry editor ke custom fields (contentTypes se) */
  CONTENT: 'content',
  /** Block ka properties panel (block registry se) */
  BLOCK: 'block',
})

const CONTENT = FIELD_CONTEXT.CONTENT
const BLOCK = FIELD_CONTEXT.BLOCK

/**
 * @typedef {Object} FieldTypeDef
 * @property {string} component   admin me kaunsa renderer chalega
 * @property {string[]} contexts  kis context me ye type allowed hai
 * @property {boolean} [responsive] block context me per-breakpoint value le sakta hai
 */

/** @type {Record<string, FieldTypeDef>} */
export const FIELD_TYPES = Object.freeze({
  // Dono jagah
  text: { component: 'TextField', contexts: [CONTENT, BLOCK] },
  textarea: { component: 'TextAreaField', contexts: [CONTENT, BLOCK] },
  number: { component: 'NumberField', contexts: [CONTENT, BLOCK] },
  select: { component: 'SelectField', contexts: [CONTENT, BLOCK] },
  toggle: { component: 'ToggleField', contexts: [CONTENT, BLOCK] },
  media: { component: 'MediaPicker', contexts: [CONTENT, BLOCK] },
  link: { component: 'LinkField', contexts: [CONTENT, BLOCK] },

  // Sirf content — entry ke custom fields
  richText: { component: 'RichTextField', contexts: [CONTENT] },
  date: { component: 'DateField', contexts: [CONTENT] },
  relation: { component: 'RelationField', contexts: [CONTENT] },
  repeater: { component: 'RepeaterField', contexts: [CONTENT] },

  // Sirf block — style controls
  color: { component: 'ColorField', contexts: [BLOCK], responsive: false },
  slider: { component: 'SliderField', contexts: [BLOCK], responsive: true },
  align: { component: 'AlignField', contexts: [BLOCK], responsive: true },
  spacing: { component: 'SpacingField', contexts: [BLOCK], responsive: true },
})

export const FIELD_TYPE_KEYS = Object.freeze(Object.keys(FIELD_TYPES))

/**
 * Kya ye field type is context me allowed hai?
 * @param {string} type
 * @param {string} context
 */
export function isFieldTypeAllowed(type, context) {
  return Boolean(FIELD_TYPES[type]?.contexts.includes(context))
}

/**
 * Ek context ke saare allowed types.
 * @param {string} context
 * @returns {string[]}
 */
export function fieldTypesFor(context) {
  return FIELD_TYPE_KEYS.filter((type) => isFieldTypeAllowed(type, context))
}

/**
 * `responsive: true` sirf block context me matlab rakhta hai — entry ke custom fields
 * ke breakpoints nahi hote.
 * @param {{ type: string, responsive?: boolean }} field
 * @param {string} context
 */
export function isResponsive(field, context) {
  if (context !== BLOCK) return false
  return Boolean(field.responsive ?? FIELD_TYPES[field.type]?.responsive)
}
