import { Children, cloneElement } from 'react'

import { useListDrag } from '../../lib/drag-list.js'
import { usePanelOrder } from '../../lib/panel-order.js'

/**
 * Editor ke panels, jinka kram client badal sakta hai — D-64.
 *
 * ```jsx
 * <SortablePanels storageKey="package-edit-panels" disabled={readOnly}>
 *   <Panel key="info" title="Info">…</Panel>
 *   <ItineraryBuilder key="itinerary" … />
 * </SortablePanels>
 * ```
 *
 * **Id har child ki `key` se aati hai.** Ek alag `items` array lene ka matlab hota ki poora
 * JSX ek prop me chala jaaye — aur phir panel dhoondhne wale ko pehle array padhna padta.
 * Yahan panels wahin likhe rehte hain jahan wo hamesha the.
 *
 * ## DOM ka kram nahi badalta, CSS ka `order` badalta hai
 *
 * Dikhne ka kram `order` se aata hai. Iski ek keemat hai aur wo likhi honi chahiye:
 * **keyboard aur screen reader DOM ka kram padhte hain, CSS ka nahi** — yaani tab karte hue
 * panels apne asli kram me aayenge, dikhne wale kram me nahi. Ye `order` ka jaana-maana
 * trade-off hai.
 *
 * Isiliye grip pe **keyboard se bhi reorder** ho jaata hai (`useListDrag` ↑/↓ deta hai):
 * jise ye kram maayne rakhta hai wo bina maus ke bhi use badal sake.
 *
 * ## `cloneElement` kyun
 *
 * Grip panel ke **apne head** me baithna chahiye — uske upar ek alag patti banane ka matlab
 * hota har panel do sar ka dikhe. Isliye wrapper har child me `dragHandle` daal deta hai;
 * `Panel` aur `ItineraryBuilder` dono wo prop lete hain.
 *
 * @param {string} storageKey kis screen ka kram — localStorage me isi naam se
 * @param {boolean} [disabled] read-only user ke liye drag band
 */
export default function SortablePanels({ storageKey, disabled, children }) {
  /** `Children.toArray` keys ke aage `.$` lagata hai — id wahi rehni chahiye jo JSX me likhi hai. */
  const panels = Children.toArray(children).map((node) => ({
    id: String(node.key).replace(/^\.\$/, ''),
    node,
  }))

  const [order, move] = usePanelOrder(
    storageKey,
    panels.map((p) => p.id),
  )
  const drag = useListDrag(move, !disabled)

  const byId = new Map(panels.map((p) => [p.id, p.node]))

  return (
    <div className="sortable-panels">
      {order.map((id, index) => {
        const node = byId.get(id)
        if (!node) return null

        return (
          <div key={id} style={{ order: index }} {...drag.rowProps(index)}>
            {cloneElement(node, { dragHandle: disabled ? undefined : drag.handleProps(index) })}
          </div>
        )
      })}
    </div>
  )
}
