import { useRef, useState } from 'react'

/**
 * Ek list ko drag-drop se reorder karne ka hook.
 *
 * Ye pehle `screens/appearance/` me tha, kyunki tab sirf menus ise use karte the. Slice 4
 * me Itinerary Builder ko bhi wahi chahiye tha (din drag se reorder hote hain, spec 007
 * §3) — aur do screens ka saanjha helper ek screen ke folder me rakhna wahi cheez hai jo
 * baad me copy-paste hoti hai. Isliye `lib/` me aa gaya.
 *
 * Pehle har level pe ↑↓ buttons the (spec 006 Q-C). Client ne 24 Aug ko drag-drop maanga,
 * aur wo **bina kisi migration ke** ho gaya kyunki order data me array ki position hai —
 * D-43 me yahi likha tha ki drag-drop jodna pure UI change hoga.
 *
 * **Koi library nahi** — native HTML5 drag-and-drop. Ek reorder list ke liye `@dnd-kit`
 * jaisa package laana bekaar ka bundle aur ek aur pinned version hai (R3).
 *
 * ## Draggable sirf handle hai, poori row nahi
 *
 * Row pe `draggable` lagane ka matlab hota ki uske andar wale `<input>` me text select
 * karna kai browsers me toot jaata — aur in rows me inputs hi inputs hain. Isliye
 * `draggable` sirf `.grip` pe hai, aur drag ka ghost `setDragImage()` se poori row ka
 * banaya jaata hai.
 *
 * ## Har list apna instance leti hai
 *
 * Isse cross-list drop apne aap ruk jaata hai: doosri list ke `dragIndex` `null` hoti hai,
 * to uska `onDragOver` shuru me hi laut jaata hai. Yaani group ko ek column se doosre
 * column me nahi le ja sakte — wo abhi scope me nahi hai.
 *
 * ## Keyboard
 *
 * Drag-drop akela keyboard se chalta hi nahi. Handle focusable hai aur uspe ↑/↓ se
 * reorder hota hai — UI me koi extra button dikhaye bina. Bina iske reorder sirf mouse
 * wale user ke liye reh jaata.
 *
 * @param {(from: number, to: number) => void} onReorder
 * @param {boolean} [enabled] `false` pe sab no-op — read-only user ke liye
 */
export function useListDrag(onReorder, enabled = true) {
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const rows = useRef(new Map())

  const clear = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  /** `.grip` pe lagane ke liye. */
  const handleProps = (index) =>
    !enabled
      ? {}
      : {
          draggable: true,
          tabIndex: 0,
          role: 'button',
          'aria-label': 'Reorder — drag, or use the arrow keys',
          title: 'Drag to reorder',

          onDragStart: (e) => {
            setDragIndex(index)
            e.dataTransfer.effectAllowed = 'move'
            // Firefox bina `setData` ke drag shuru hi nahi karta
            e.dataTransfer.setData('text/plain', String(index))

            const row = rows.current.get(index)
            if (row) e.dataTransfer.setDragImage(row, 12, 12)
          },

          onDragEnd: clear,

          /** `.day-head` ka click accordion toggle karta hai — drag usme nahi girna chahiye. */
          onClick: (e) => e.stopPropagation(),
          onMouseDown: (e) => e.stopPropagation(),

          onKeyDown: (e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
            e.preventDefault()
            e.stopPropagation()
            onReorder(index, index + (e.key === 'ArrowUp' ? -1 : 1))
          },
        }

  /** Row ke wrapper pe lagane ke liye — yahi drop target hai. */
  const rowProps = (index) =>
    !enabled
      ? {}
      : {
          ref: (el) => {
            if (el) rows.current.set(index, el)
            else rows.current.delete(index)
          },

          onDragOver: (e) => {
            if (dragIndex === null) return
            // `preventDefault` ke bina browser drop allow hi nahi karta
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (overIndex !== index) setOverIndex(index)
          },

          onDrop: (e) => {
            if (dragIndex === null) return
            e.preventDefault()
            e.stopPropagation()
            if (dragIndex !== index) onReorder(dragIndex, index)
            clear()
          },

          // `|| undefined` isliye ki React `data-x="false"` render kar deta hai
          'data-dragging': dragIndex === index || undefined,
          'data-dragover': (overIndex === index && dragIndex !== index) || undefined,
        }

  return { handleProps, rowProps }
}
