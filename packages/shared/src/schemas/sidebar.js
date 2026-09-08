import { z } from 'zod'

import { DEFAULT_SITE_ID } from '../constants/index.js'
import { htmlSchema } from './rich-html.js'

/**
 * Sidebars — `Appearance ▸ Sidebar` (**D-88**, client 8 Sep).
 *
 * Client named sidebars banata hai; har page apne edit screen se chunta hai ki **kis taraf**
 * (`fields.sidebar`) aur **kaunsa** (`fields.sidebarId`). Dono field `page.js` me hain — yahan
 * sirf sidebar khud hai.
 *
 * ## Yahan kya NAHI hai
 *
 * - **`On this page` (TOC)** — client ne defer kiya. Wo `tour-v3.html` me hai hi nahi (sirf
 *   `page-template.html:1862` me), aur Pages ki screens bani nahi (A-9)
 * - **`packagesByDuration` ka derived widget** — client ne kaha wo `html` se banega
 * - **"Kis page pe kaunsa form" wali niyam ki table** — `admin-design-v3.html:700` me wo hai,
 *   par client ne uski jagah named sidebars chune (D-88 §1)
 * - **Position** — wo page ka field hai, sidebar ka nahi. Design me wo is screen pe tha
 *   (`#s-sidebar` ka "Sidebar ki jagah" panel); client ne 8 Sep ko use page pe bheja
 */

/**
 * Widget ka `type` — ye DB me **stored data** hai, kabhi rename mat karo (R4).
 *
 * ⚠️ Ye list `blockTypeSchema` ki tarah khuli **nahi** hai. Blocks ka type isliye khula hai ki
 * unki list Phase 5 me asli design se nikalegi; sidebar ki list client ne aaj **fix** kar di —
 * teen. Khuli chhodne ka matlab hota ki koi `packageList` yahan daal de, jo sidebar me bemaani
 * hai aur uska koi renderer hai hi nahi.
 */
export const SIDEBAR_WIDGET_TYPES = Object.freeze(['enquiryForm', 'talkToPlanner', 'html'])

/** Admin ke `＋ Add widget…` dropdown ke naam. UI ka text English me (R17). */
export const SIDEBAR_WIDGET_LABEL = Object.freeze({
  enquiryForm: 'Enquiry form',
  talkToPlanner: 'Talk to a planner',
  html: 'Custom HTML',
})

/**
 * ⚠️ **`id` input me optional hai — wahi jodi jo `blockSchema`, `faqSchema` aur
 * `itinerarySchema` pe pehle se hai** (D-87 §7).
 *
 * Client dropdown se widget jodta hai aur uske paas nayi id banane ki koi wajah nahi honi
 * chahiye. **Stored data me id hamesha hoti hai** — service write pe bhar deti hai.
 */
const widgetId = z.string().min(1).optional()

/**
 * Enquiry form — `forms` collection me se ek.
 *
 * ⚠️ Khaali `formId` **galti nahi hai**. Client widget jodta hai, phir form chunta hai; beech
 * me ek save ho jaana bilkul aam hai. Khaali pe widget page se **gayab** ho jaata hai —
 * khaali cheez khaali dikhe, tooti hui nahi (D-30).
 *
 * ⚠️ Ye `forms.placement` se **takraata nahi**: `placement` sirf package pages ko serve karta
 * hai (jo D-88 #7 ke baad hardcoded hi rahenge), aur ye sirf `page`/`tourPage` ko. Dono kabhi
 * milte hi nahi — isliye ye D-86 wali "ek hi cheez ke do naam" nahi hai.
 */
export const enquiryFormWidgetSchema = z.object({
  id: widgetId,
  type: z.literal('enquiryForm'),
  props: z
    .object({
      /**
       * ⚠️ **`heading` aur `description` D-88 §10 me jude** — wahi faisla jo usi din blocks pe
       * hua tha (§9).
       *
       * Reference ka tour wala widget (`tour-v3.html:1890`, `.wdg--cta`) package page wale
       * `.wdg--book` se alag hai: usme price header nahi hai, par uske upar ek `<h3>` aur ek
       * `<p>` hai — _"Not sure which package?"_ / _"Tell us your dates…"_.
       *
       * Wo do line kahin se to aani thi. Theme me likhne ka matlab hota Q-9 wala hi kaanta
       * dobara (dhaancha static, maal admin se), aur `form.name` use karna galat hota — wo
       * admin ka label hai ("Package Enquiry"), customer ko dikhane wali line nahi.
       *
       * Iske baad **teenon widget** ke paas apna heading hai — `enquiryForm` hi akela bacha tha.
       */
      heading: z.string().trim().max(200).default(''),
      description: htmlSchema.pipe(z.string().max(2000)).default(''),

      formId: z.string().trim().max(60).default(''),
    })
    .default({}),
})

/**
 * Talk to a planner.
 *
 * ⚠️ **Props me contact ka ek bhi field nahi, aur wo jaan-boojh kar hai.** Phone aur WhatsApp
 * `settings` se aate hain, email form ke `emailTo` se — `Planner.jsx` aaj yahi karta hai.
 * 2 Sep ko `settings.contactEmail` isi liye palta gaya tha: ek hi pata do jagah rakhne ka
 * matlab hota ki ek din wo alag ho jaate.
 *
 * Client ne ise "checkbox if needed" kaha. List me hona hi on hai, hata dena hi off — alag se
 * checkbox rakhna ek hi cheez ke do control banata (D-86 wali shakl).
 */
export const talkToPlannerWidgetSchema = z.object({
  id: widgetId,
  type: z.literal('talkToPlanner'),
  props: z
    .object({
      /** Khaali pe theme ka apna heading chalta hai — D-65 wala hi niyam. */
      heading: z.string().trim().max(120).default(''),
    })
    .default({}),
})

/**
 * Custom HTML — text, details, ya koi bhi list (client ne `Packages by duration` ka naam liya).
 *
 * ⚠️ **Iski HTML write pe sanitize honi chahiye** (R20) — `core/sanitize-html.js`, service
 * layer me. Bhool jaane par content girta **nahi**, wo **bina safai ke bach jaata hai**, aur
 * wahi zyada khatarnak hai.
 */
export const htmlWidgetSchema = z.object({
  id: widgetId,
  type: z.literal('html'),
  props: z
    .object({
      heading: z.string().trim().max(120).default(''),
      html: htmlSchema,
    })
    .default({}),
})

/**
 * Widget ka envelope — `{ id, type, props }`, wahi shape jo `content.blocks[]` ka hai
 * (D-87 §7 ka FROZEN envelope). Yaani Phase 5 ka builder yahi data uthayega.
 *
 * ⚠️ `blockSchema` **reuse nahi kiya** — uska `props` `z.record(z.unknown())` hai. Yahan
 * teenon type maloom hain, isliye `discriminatedUnion` se props sach me validate hote hain.
 * Wahi rasta jo `menuItemSchema` pe pehle se hai.
 */
export const sidebarWidgetSchema = z.discriminatedUnion('type', [
  enquiryFormWidgetSchema,
  talkToPlannerWidgetSchema,
  htmlWidgetSchema,
])

/**
 * Ek sidebar me kitne widget. Cap zaroori hai kyunki ye payload har page ke saath jaata hai —
 * wahi soch jo `itineraryImages` aur `reviews` ki limit pe hai.
 */
export const SIDEBAR_MAX_WIDGETS = 20

export const sidebarSchema = z.object({
  siteId: z.string().default(DEFAULT_SITE_ID),

  /**
   * Client ise **khud padhta** hai — page ke dropdown me yahi naam aata hai. Isliye ye
   * `menu.key` jaisa slug nahi hai, seedha naam hai: `Tour pages sidebar`, `Blog sidebar`.
   */
  name: z.string().trim().min(1, 'Give the sidebar a name').max(200),

  widgets: z.array(sidebarWidgetSchema).max(SIDEBAR_MAX_WIDGETS).default([]),
})

export const createSidebarSchema = sidebarSchema.partial({ siteId: true })

export const updateSidebarSchema = createSidebarSchema.partial()

export const sidebarListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})
