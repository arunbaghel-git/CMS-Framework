'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Listing page ka filter — **ek hi state, do control** (spec 008, client 9 Sep).
 *
 * ## ⚠️ Ye provider isliye hai ki wo do jagah se chalta hai
 *
 * Reference me topic chunne ke **do** raaste hain aur dono ek hi cheez karte hain:
 *
 * | Kahan | Kya |
 * | --- | --- |
 * | `.bfilter` ki pills (`PostList`) | main column me, grid ke upar |
 * | Sidebar ka `Topics` (`TopicsWidget`) | doosri column me |
 *
 * Dono ke apne `useState` rakhne ka matlab hota ki client sidebar se `Ferries` chune aur pill
 * bar par abhi bhi `All` chamak raha ho — do control, do sach. Yahi wo shakl hai jo D-86 me
 * baar-baar pakdi gayi (`sourcePath`, `defaults.rating`, `entry.url`): ek hi cheez do jagah,
 * aur ek din wo alag ho jaati hai.
 *
 * ⚠️ **Client-side filter hone ka poora faayda yahi hai.** Server pe filter karne ka matlab
 * hota har pill pe ek round trip aur ek naya URL — aur us raaste pe ye sync **muft nahi
 * milti**, use `?topic=` se dono jagah padhna padta.
 *
 * ## `page` bhi yahin hai, aur wo zaroori hai
 *
 * ⚠️ Topic badle to page **1 pe wapas** aana chahiye. Page 5 pe hote hue ek aisa topic chunna
 * jiske 4 hi post hain — us haalat me grid khaali dikhti aur wo _"filter kaam nahi kar raha"_
 * jaisa lagta. `page` ko `PostList` me aur `topic` ko yahan rakhne se wo reset **do jagah**
 * baant jaata; isliye dono ek hi jagah hain.
 */

const BlogFilterContext = createContext(null)

export function BlogFilterProvider({ children }) {
  const [topic, setTopicState] = useState('all')
  const [page, setPage] = useState(1)

  /** Topic badla = page 1. Ye jodi kabhi tooti nahi honi chahiye, isliye ek hi function hai. */
  const setTopic = useCallback((next) => {
    setTopicState(next)
    setPage(1)
  }, [])

  const value = useMemo(() => ({ topic, page, setTopic, setPage }), [topic, page, setTopic])

  return <BlogFilterContext.Provider value={value}>{children}</BlogFilterContext.Provider>
}

/**
 * ⚠️ **Provider na ho to `null` — throw nahi.**
 *
 * `Topics` widget post ke detail page pe bhi lag sakta hai, jahan koi list hai hi nahi aur
 * filter karne ko kuch nahi. Wahan `null` milta hai aur widget apne aap saada list ban jaata
 * hai. Throw karne ka matlab hota ki client ek widget jodte hi poora page tod de.
 *
 * Yahi jodi `useOptionalCategory()` pe hai (D-87 §11) — wahan `useCategory()` ka throw bhi
 * bacha hua hai, kyunki package page pe wo ek sahi guard hai.
 */
export function useBlogFilter() {
  return useContext(BlogFilterContext)
}
