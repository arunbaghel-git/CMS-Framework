---
name: cache-invalidation
description: Jab koi aisa content change ho jo public site pe dikhta hai — publish, unpublish, menu edit, settings change, taxonomy change — to ye skill load karo. Isme cache tag taxonomy aur dependency map hai. Trigger — "publish kiya par site update nahi hui", naya public endpoint, revalidate logic, ya koi bhi mutation jo public page badalti hai.
---

# Cache Invalidation

## Rule 1 — Ek hi cache authority

**Next.js ISR hi authority hai.** Public API pe koi TTL cache nahi.

Do cache layer aur ek invalidation signal = _"publish kiya par site update nahi hui"_
wala support ticket. Ye is project ka sabse common predictable bug hai.

## Rule 2 — Invalidation ek graph hai, ek path nahi

`revalidatePath('/blog/x')` **kaafi nahi hai.** Ek post publish hone pe stale hote hain:

```
post ka page
post archive  +  uske SAARE pagination pages
har category archive jisme wo post hai
har tag archive jisme wo post hai
har page jisme "Post List" block hai
menu (agar wo post menu me linked hai)
sitemap.xml
RSS feed
```

Isliye **tag-based** invalidation, path-based nahi.

## Tag taxonomy

Har public fetch pe tags lagao:

| Tag               | Kab lagta hai     | Kab invalidate hota hai                                |
| ----------------- | ----------------- | ------------------------------------------------------ |
| `entry:{id}`      | Ek entry fetch    | Wo entry change/publish/trash ho                       |
| `path:{path}`     | `/public/resolve` | Wo entry change ho — **aur uska PURANA path bhi** jab slug badle (D-52 §2). Iske bina public page kabhi saaf hi nahi hota: fetch se pehle entry ki id pata hi nahi hoti, aur 404 wale raaste pe to hoti hi nahi |
| `type:{type}`     | Kisi type ki list | Us type ki koi bhi entry publish/unpublish ho          |
| `tax:{id}`        | Taxonomy archive  | Wo taxonomy change ho, ya koi entry usme add/remove ho |
| `menu:{location}` | Menu fetch        | Wo menu ya uska assignment badle                       |
| `settings`        | Settings fetch    | Settings update ho — **aur footer ka koi bhi menu**    |
| `template:{id}`   | Template fetch    | Template ya uske parts badlein                         |
| `sitemap`         | sitemap.xml       | Koi bhi entry publish/unpublish/trash ho               |
| `feed`            | RSS               | Koi post publish/unpublish ho                          |

## Dependency map

Publish service ise explicitly follow karti hai:

```js
// concept — service.js me
const INVALIDATION_MAP = {
  'entry.publish': (entry) =>
    [
      `entry:${entry._id}`,
      `type:${entry.type}`,
      ...entry.taxonomies.categories.map((id) => `tax:${id}`),
      ...entry.taxonomies.tags.map((id) => `tax:${id}`),
      'sitemap',
      entry.type === 'post' ? 'feed' : null,
    ].filter(Boolean),

  'entry.trash': (entry) => [
    /* same as publish */
  ],
  // Location menu pe NAHI hai — wo `menuLocations` ka assignment hai, aur ek menu KAI
  // locations pe ho sakta hai. Sirf ek tag saaf karne ka nateeja: footer badla, header
  // purana dikhta raha (D-43).
  //
  // ⚠️ **Footer ke columns ab locations nahi hain (D-44)** — wo `settings.footerColumns[]`
  // me hain aur unka data `/api/public/settings` se jaata hai. Isliye footer me use ho
  // rahe menu ka stale tag `menu:*` nahi, **`settings`** hai. Ye D-43 wali galti ka hi
  // agla roop hai: tag wahan se lo jahan assignment SACH ME rehti hai.
  'menu.update': (menu) => [
    ...locationsOf(menu.id).map((l) => `menu:${l}`),
    ...(usedInFooter(menu.id) ? ['settings'] : []),
  ],
  'menu.delete': (menu) => [
    ...locationsOf(menu.id).map((l) => `menu:${l}`),
    // Delete footer ka reference bhi saaf karti hai, to `settings` hamesha stale hoti hai
    ...(usedInFooter(menu.id) ? ['settings'] : []),
  ],
  // Assignment badle to PURANI aur NAYI dono stale hoti hain
  'location.update': (prev, next) => [`menu:${prev}`, `menu:${next}`],
  'settings.update': () => ['settings', 'sitemap', 'feed'],
  'taxonomy.update': (tax) => [`tax:${tax._id}`, `type:${tax.appliesTo}`],
  'template.update': (tpl) => [`template:${tpl._id}`, `type:${tpl.type}`],
}
```

Naya mutation add kar rahe ho? **Is map me entry add karo.** Bhool gaye to wo bug
weeks baad "kabhi kabhi update nahi hota" ke roop me aayega.

## Slug change ka special case

Slug badla to sirf invalidate karna kaafi nahi:

```
1. purana path → naya path  (301 redirect banao)
2. saare descendants ke path cascade update + har ek pe redirect
3. purana path bhi invalidate karo (warna 301 cache me nahi jaayega)
4. naya path invalidate karo
5. sitemap invalidate
6. redirect chain flatten + loop check
```

## Webhook security

Revalidate webhook pe **shared secret zaroori** (`REVALIDATE_SECRET`). Bina iske wo
ek public cache-purge endpoint hai — koi bhi tumhari site ka cache baar-baar uda sakta hai.

## Debug — "publish kiya par update nahi hua"

Isi order me check karo:

1. **Publish service ne `revalidateTag()` call kiya?** Log dekho
2. **Sahi tags the?** Dependency map me us action ki entry hai?
3. **Fetch pe tag laga tha?** Tag tabhi kaam karta hai jab fetch pe declare hua ho
4. **Public API pe koi TTL cache to nahi bach gaya?** Rule 1 tootа to nahi
5. **Webhook actually pahunchа?** Secret sahi tha? Network reachable tha?
6. **CDN cache?** Media aur static assets ka alag layer hai

## Checklist — naya public-facing feature

- [ ] Fetch pe tags declare kiye
- [ ] Dependency map me mutation ki entry
- [ ] Archive aur pagination pages consider kiye
- [ ] Sitemap aur feed consider kiye
- [ ] Slug/path change ka case handle kiya
- [ ] Test: publish karke verify kiya ki page actually update hua
- [ ] Doc: `.claude/docs/02-ARCHITECTURE.md` §7.2 me tag add kiya
