# 02 — Architecture

System ka technical reference. "Aisa kyun hai" ke jawab
[`03-DECISIONS.md`](03-DECISIONS.md) me hain.

---

## 1. System shape

```
                 +--------------------------+
                 |   Admin Panel (React)    |   Vite SPA, /admin
                 |  editor + page builder   |
                 +------------+-------------+
                              | REST /api/admin/*  (JWT httpOnly cookie)
                              v
+--------------+   +--------------------------+   +--------------+
|  MongoDB     |<--|    API (Express + Node)  |-->|  Media store |
|  (Mongoose)  |   |  content | auth | media  |   | S3/R2 + CDN  |
+--------------+   +------------+-------------+   +--------------+
                              | REST /api/public/* (read-only)
                              v
                 +--------------------------+
                 |  Public Site (Next.js)   |   SSR/ISR = SEO
                 |  block renderer + theme  |
                 +--------------------------+
```

| Package           | Tech                  | Kaam                                                                   |
| ----------------- | --------------------- | ---------------------------------------------------------------------- |
| `apps/api`        | Express + Mongoose    | Saara business logic, auth, uploads — single source of truth           |
| `apps/admin`      | React 18 + Vite (JSX) | Admin UI, page builder, preview                                        |
| `apps/web`        | Next.js App Router    | Public website, SSR + ISR, SEO tags, sitemap                           |
| `packages/blocks` | React (JSX)           | Block registry, renderer, `styleToCss()` — **admin aur web dono**      |
| `packages/shared` | Zod                   | Validation schemas, constants, JSDoc typedefs — **admin aur api dono** |

**Deployment:** teen apps alag develop hote hain par **deploy ek hi unit ki tarah** —
ek container image / ek process group per client, ek version number ke saath. 15 client
ka matlab 15 instance, 45 alag deployment nahi.

**Database:** ek shared Mongo cluster, **per client alag database**. Logical isolation
poora, par 15 replica set chalane ki zaroorat nahi.

**Topology:** same-origin — admin `example.com/admin`, API `example.com/api`, dono ek
reverse proxy ke peeche. Dev me Vite proxy se wahi setup milta hai.

---

## 2. Folder structure

```
cms/                                    ← CORE REPO (ek, private)
├─ apps/
│  ├─ api/src/
│  │  ├─ modules/                       auth, entries, media, menus, seo, settings…
│  │  │   └─ entries/ { model.js, service.js, controller.js, routes.js, validation.js }
│  │  ├─ core/                          db, errors, logger, cache, events, migrations
│  │  ├─ middleware/                    auth, rbac, validate, upload, rateLimit, sanitize
│  │  └─ index.js
│  ├─ admin/src/
│  │  ├─ styles/                        tokens · base · layout · primitives (§11)
│  │  ├─ builder/                       canvas, layers, props-panel, toolbar, dnd, history
│  │  ├─ modules/                       entries, media, appearance, seo, settings, users, tools
│  │  ├─ components/admin/              AdminBar.jsx + AdminBar.css, Sidebar…
│  │  └─ lib/api.js                     single-flight refresh mutex yahin
│  └─ web/
│     ├─ app/[[...slug]]/page.jsx       ← routing ka EKMATRA entry point
│     ├─ app/sitemap.js | robots.js | feed.xml
│     └─ theme/                         client repo se inject hota hai
├─ packages/
│  ├─ blocks/                           registry + Render + styleToCss + override hook
│  └─ shared/                           zod schemas, constants, JSDoc typedefs
├─ migrations/
└─ docker-compose.yml
```

> `themes/<client>/` core repo me **nahi** hai. Client ka theme client ke repo me rehta
> hai — [`06-OPERATIONS.md`](06-OPERATIONS.md) dekho. Core me sirf `theme/` ka contract hai.

---

## 3. Data model

Core principle: **"Sab kuch content hai."** Pages aur posts alag collection nahi —
ek `entries` collection, `type` field se alag. Custom types (Services, Portfolio)
isse lagbhag free milte hain.

`*` wale collections pe `siteId` field hota hai (default `DEFAULT_SITE_ID`). Aaj koi
query usse filter nahi karti — ye sirf future multi-site ke liye reserve hai (§3.2).

```
users            _id, name, email, passwordHash, role, status, avatarId, lastLoginAt
roles            _id, key(admin|editor|author|contributor), permissions[]
refreshTokens    userId, jti, familyId, expiresAt, usedAt, revokedAt, ua, ip
passwordResets   userId, tokenHash, expiresAt, usedAt, ip      ← D-110, migration 028
                 SIRF ADMINISTRATOR ke liye. Token kabhi store nahi — sirf SHA-256.
                 30 minute (PASSWORD_RESET_TTL_MINUTES), ek baar (usedAt atomic),
                 naya maangte hi purane delete. Link = ADMIN_URL + /reset-password
                 #token=… (fragment — server log/Referer me nahi jaata)
migrations       name, appliedAt, checksum

settings       * siteId(unique), siteName, tagline, adminEmail, logoMediaId,
                 faviconMediaId, timezone, dateFormat, currency,
                 phone, whatsapp, address, social{facebook,instagram,youtube,x},
                 popupSettings{ enabled, formId, heading, formHeading,      ← D-103
                                description, imageIds[] max 3, delaySeconds,
                                frequency(session|once|days|always),
                                frequencyDays,
                                showOn{ homePage, package, tourPage,
                                        post, blogPage, page } }  ← .strict()
                 Screen `Enquiries ▸ Popup` hai, par data yahan — wahi
                 batwara jo tourSettings/blogSettings pe hai. Public payload
                 me `popup` RESOLVED jaata hai (form + images), aur
                 `getSettings()` use nikal deti hai (D-103 §7)
                 floatingContactSide(right|left, default right — D-102)
                 desktop ke do gol button (.float) kis kone me. ON/OFF ka koi
                 field NAHI — phone aur whatsapp dono khaali to button hi nahi
                 (wahi D-30 guard jo .mobar pe hai); 760px neeche .mobar leti hai
                 headerButtons[{ label, url, target, variant, icon,
                                 iconOnlyOnMobile, className, enabled,
                                 position(left|right, default right — D-94) }]   max 4
                 footerLogoMediaId, footerCopyright, footerNote, footerDisclaimer,
                 footerColumns[{ id, heading, type(menu|text|both),         max 6
                                 width(normal|wide), menuId,
                                 textBlocks[{ id, icon, label, text }] }]   max 6 blocks
                 tourSettings{ bannerMediaId, trustBadges[] max 6,          ← D-87 #10/#11
                               heroButton{ label, url } }                    ← D-89
                 hero ke DO button, do alag source (client, 8 Sep):
                 pehla `heroButton` se; WhatsApp `settings.whatsapp` se —
                 uske liye yahan koi field NAHI (ek number do jagah nahi)
                 dono khaane bhare hon tabhi pehla button dikhta hai (D-30)
                 screen ab `Tour ▸ Tour settings` hai, `Settings ▸` nahi (D-89 §8)
                 pageSettings{ bannerMediaId, showToc(default true) }       ← D-95 §12
                 `page` ka banner fallback + On this page — sab pages ke liye.
                 Screen `Pages ▸ Pages settings`. Model me bhi key (strict jaal)
                 ctaSection{ enabled, badge, heading, bullets[] max 6,       ← D-67
                             boxTitle, boxNote,
                             buttons[{label,url,target,variant,enabled}] max 2 }
                 poori tarah STATIC — box ka daam package se derive NAHI hota
                 settings me hai kyunki card doosre pages pe bhi jaayega (client)
                 button ka url khaali = wo button payload me hi nahi jaata (D-30);
                 enquiry form (Q-2) banne pe sirf wahi ek value bharni hai
                 frontPageType, homepageEntryId, postsPageEntryId, postsPerPage,
                 searchEngineVisible
                 customCss (D-96 §25) — client ki apni CSS, HAR page ke <head> me
                 mail{host,port,user,passwordEnc,fromName,fromEmail} (D-108,
                 22 Sep) — Settings ▸ Email / SMTP. Site ka mail account
                 ⚠️ YE FIELD Zod ke settingsSchema ME HAI HI NAHI — sirf Mongoose
                 model me. toPublicSettings() settingsSchema.parse() chalata hai
                 aur Zod anjaan keys STRIP kar deti hai, isliye mail kisi bhi aam
                 settings response me JA HI NAHI SAKTA. Ye structural rok hai,
                 yaad rakhne pe nirbhar nahi — aur uska apna test hai
                 ⚠️ settings.read EDITOR ke paas bhi hai (spec 001). Bina is rok
                 ke SMTP ka password har Settings kholne wale ko mil jaata
                 padhne ka raasta: getMailSettings() — password ki jagah sirf
                 hasPassword: true. Mailer ke liye alag: getMailConfig()
                 passwordEnc: AES-256-GCM (core/secrets.js), key
                 JWT_ACCESS_SECRET se HKDF-derive. Plaintext kabhi store nahi
                 config har bhejne pe DB se padhi jaati hai (boot pe cache nahi)
                 — client Save dabaye to agla mail naye account se, bina restart
                 DB khaali ho to env ke SMTP_* pe girta hai, KHAANA-DAR-KHAANA
                 integrations{header,body,footer} (D-106, 22 Sep) — teesre tools
                 ka code (GA, Pixel, GTM), HAR page pe. Teen jagah: </head> se
                 pehle · <body> khulte hi · </body> se pehle
                 ⚠️ POORE SYSTEM ME EKMATRA JAGAH JAHAN HTML SANITIZE NAHI HOTI
                 (R20 ka jaan-boojh kar apwaad — field ka kaam hi <script>
                 chalana hai). Suraksha safai se nahi, permission se:
                 settings.scripts.update (spec 001 se reserved, sirf admin) —
                 apna route PATCH /api/settings/integrations, aur
                 updateSettingsSchema me se ye field HATA hua hai (dono pehre
                 zaroori hain)
                 ⚠️ getSettings() ise NIKAAL deti hai, getIntegrations() alag —
                 warna MobileNav ke props se har page ke HTML me DO baar jaata
                 (A-36, D-103 §7 wala hi bug)
                 (Custom editor block ke liye; block me <style> likha hi nahi ja sakta)
                 ⚠️ `</style` Zod me hi reject — wahi value <style> ke andar jaati hai
                 PLANNED: defaultSeo, titleTemplates, privacyPolicyEntryId,
                          scripts{head,bodyOpen,bodyClose} — apne screen ke saath (D-40)
                 NOTE: `siteUrl` yahan **nahi** hai — wo env se aata hai (D-40)

contentTypes   * siteId, key(package|page|post|service…), label, labelPlural, icon,
                 fields[], hasBuilder, hierarchical, isBuiltIn, urlPattern,
                 archiveBase, hasArchive, supports[], taxonomyTypes[]
                 taxonomyTypes: kaunsi taxonomies is type pe chalti hain.
                 supports me taxonomies flag NAHI hai — ek hi baat do jagah
                 rakhne se wo ek din alag ho jaati (D-50 §4)
                 hierarchical: path parent chain se banega ya urlPattern se.
                 Iske bina resolvePath() ko type ka NAAM dekhna padta
                 (type === 'page') — wahi hardcoding jise D-09 ne mana kiya
                 tha. Client ka custom type bhi nested ho sakta hai.
                 locale yahan NAHI hai — type site ka structure hai, uska
                 content nahi. Translate label hoti hai, key nahi (D-46)
                 package | page | post | tourPage | blogPage | homePage
                 CODE-OWNED hain, seed sync
                 karta hai (D-46, wahi model jo built-in roles pe hai — D-36)
                 homePage (D-96, 15 Sep): urlPattern '/' — {slug} ke bina,
                 yaani TAY PATH (hasFixedPath). Ek hi entry; unique path index
                 DB me rokta hai, service 409 deti hai. Trash nahi hota (422).
                 settings.homepageEntryId ab koi nahi padhta
                 tourPage D-87 me juda — package LISTING page (tour-v3.html).
                 page se alag type isliye ki menu, list aur URL teenon alag
                 maange gaye the (client #1); FIELD SET DONO KA EK HI HAI
                 (PAGE_FIELDS). Ek type me isTour flag rakhne ka matlab hota
                 ki har list query aur har nav item us flag ko yaad rakhe
                 tourPage bhi /{slug} par hai, /tours/{slug} par nahi —
                 PackagePage.jsx ka ARCHIVE_CRUMB root pe link karta hai.
                 Do type ek URL space share karte hain: safe hai kyunki
                 {siteId, locale, path} unique hai (§3.1) — dusra write
                 duplicate key pe girta hai, chup-chaap overwrite nahi hota

entries        * siteId, locale, type, title, slug, path, status, publishAt,
                 type: package | page | post | tourPage — package pehla asli
                 type hai (D-46), uska maal fields{} me,
                 contentTypes.fields[] se declared
                 authorId, templateId, version, deletedAt,
                 content { version, blocks: [...] },     page builder tree
                         package/post: ek hi richText block (D-46 §3)
                         page/tourPage: BLOCKS KI LIST, aur KRAM YAHI HAI (D-87 §7)
                         types: richText(Text) twoColumn cards packageList faqs
                         twoColumn.style = plain | includedExcluded (D-89 §5)
                         packageList.linkLabel + .linkUrl = heading ke daayein
                         .viewall link (D-90 §9, 9 Sep). ⚠️ DONO chahiye — ek
                         bhi khaali ho to link render hi nahi hota (D-30).
                         Text bhi field hai, sirf URL nahi — client ka chunav
                         har block apna panel, dropdown se judta hai, grip se
                         reorder. blockSchema ka {id,type,props} FROZEN shape hi
                         hai — Phase 5 ka builder yahi data uthayega
                         blocks[].id ab INPUT me optional (normalizeContent bharta
                         hai) — shape nahi badla, sirf required-ness. Wahi jodi jo
                         faqs[] aur itinerary[] pe hai
                         props ki validation PAGE_BLOCK_PROP_SCHEMAS se; anjaan
                         type ke props CHHOOT jaate hain, girte nahi (Phase 5 hatch)
                         chaaron ki HTML sanitizeContent() me saaf hoti hai —
                         naya block type jodo to wahan bhi jodo (R20)
                         homePage: SECTIONS ki list (D-96) — aaj sirf heroForm:
                         { background (#rrggbb | ''), imageId, mobileImageId,
                         title (inline HTML), description, stats[{value,label}]≤4,
                         ribbon, formId, formHeading, formDescription }.
                         background PROPS me hai, envelope ke style me nahi.
                         Payload me ids nahi jaatin — data{image,mobileImage,form}
                         infoCards (D-96 §11): heading/description/headingAlign/link ·
                         look {columns, border none|full|top|left, accentColor,
                         iconPosition above|inline, iconBox, iconBg, iconColor, textAlign}
                         · items[{icon (ICONS), imageId, label, title, text inline, url}]≤12
                         imageCards (D-96 §14): heading/link · shape square|portrait|tall|
                         landscape|wide · columns 2–6 · mobileColumns 1–2 · textAlign ·
                         textPosition · items[{imageId, title, subtitle, tag, url}]≤24
                         videoReviews (§13): heading/link · reviewIds[]≤20
                         testimonials (§16): heading/link · iconColor · testimonialIds[]≤20
                         offerCards (§21): heading/link · cardStyle · shape · layout ·
                         columns · items[{imageId, badge, badgeColor, title, subtitle,
                         chips[]≤3, price(text), oldPrice, priceNote, rating, url}]≤24
                         textVideo (§22): heading · text(html) · items[{icon, imageId,
                         title, text(inline)}]≤6 · buttonLabel/Url · imageSide · imageId ·
                         videoUrl(''|https) · videoTitle · videoText
                         awardBadges (§23): heading/link · badgeColor ·
                         items[{imageId, title, label}]≤24
                         customHtml (§25): background · className · html
                         (client ka apna markup; home pe section, tour pe .blk)
                         packageGrid (§19): heading/link · showFilter — cards DB se
                         (saare published package, naye pehle), koi chunav store nahi
                         logoGrid (§17): heading/link · items[{imageId, title}]≤48 ·
                         closingTitle · closingText
                         (reviews collection ki ids — naam reviewIds se ALAG, cache query ke liye)
                         faqs pe home ke liye background + align
                 fields  { ...customFields },            contentType ke fields
                         package ka itinerary[] yahin hai — poora contract
                         packages/shared/schemas/itinerary.js me (D-51).
                         Aur pricing{} + hotels[] + faqs[] bhi — contract
                         packages/shared/schemas/pricing.js aur faq.js me
                         (D-56, D-59).
                         Write pe ye CHAARON VALIDATE hote hain, baaki fields
                         abhi nahi: inme references hain (destination, transfer,
                         hotel, add-on ids) aur public page ka aadha render
                         inhi se banta hai. pricing me SIRF categoryPricing[]
                         hai — currency settings.currency se (D-56 §2), aur
                         basis/GST/advance client ne hata diye (D-57 §3)
                         package pe notes{heading,content} bhi — D-104 (21 Sep).
                         Page pe "Popular add-ons" ke THEEK UPAR ka section.
                         ⚠️ Page ka EKMATRA section jiska heading bhi per-package
                         hai (baaki sab packageDefaults.sectionLabels se — D-65),
                         isliye PACKAGE_SECTIONS me hai hi nahi. DONO khaali =
                         section hai hi nahi; payload me tab null jaata hai.
                         content HTML hai (sanitizeEntryFields me), heading plain.
                         ⚠️ itinerary[].note 21 Sep ko HAT GAYA (D-104) — wo chip
                         200 akshar pe katti thi; migration 027 ne text MITA diya
                         (client ka faisla). Usi migration me meals enum se free
                         text hue (['breakfast'] → ['Breakfast']) — ab teen ki
                         hadd nahi, kyunki "Evening tea" bhi hota hai (A-38)
                         package pe rating{value,count} bhi — D-87 (D-70 palta).
                         KHAALI value par packageDefaults.rating chalti hai;
                         package ka apna number use OVERRIDE karta hai, mitata
                         nahi. Fallback PAYLOAD banate waqt lagta hai, write pe
                         nahi — store wahi jo client ne likha (D-65 wala tark)
                         ⚠️ page ka field set 14 Sep se ALAG hai (D-95):
                         subheading · statRail[] · heroButton{label,url} ·
                         sidebar · sidebarId. (showWhatsapp/showToc usi shaam
                         hate — TOC + banner fallback settings.pageSettings me)
                         heading aur eyebrow page pe NAHI (h1 = title).
                         heroButton ka shape heroButtonSchema — wahi constant jo
                         tourSettings.heroButton ka. Toggle asli boolean, parse
                         normalizeFields() me (Mixed pe "false" string truthy hota)
                         tourPage ke apne: heading (HTML), eyebrow,
                         subheading (HTML), statRail[] — contract
                         packages/shared/schemas/page.js me (D-87)
                         heading = page ka DIKHNE WALA <h1> (D-90 §2, 9 Sep).
                         Uske aane se title ka kaam CHHOTA ho gaya: ab wo slug,
                         breadcrumb, admin list, SEO aur schema ke liye hai.
                         ⚠️ inlineHtmlSchema pe hai, htmlSchema pe nahi — block
                         tags <h1> ke andar ghus hi nahi sakte. Pehra do jagah:
                         normalizeFields() parse + sanitizeInlineHtml (R20).
                         ⚠️ Khaali pe theme title pe girti hai — wo fallback THEME
                         me hai, payload me nahi (warna ek hi text do jagah).
                         statRail[i].highlight ka admin control 9 Sep me juda —
                         schema/payload/theme teenon 7 Sep se the (D-90 §4)
                         ⚠️ blocks yahan NAHI hain — 7 Sep ko wo content.blocks[]
                         me chale gaye (D-87 §7, §2 ka palat). Kuch ghante ke liye
                         yahan `blocks{}` tha: id se settings ka naksha, kram HTML
                         me. Client ne wo mana kiya — har block ab apna PANEL hai,
                         dropdown se judta hai. Us palat se orphan blocks aur
                         sanitizer ka data-* wala sawaal dono khatam ho gaye
                 seo     { ... },
                 taxonomies { categories[], tags[],
                              destinations[], packageTypes[] },
                              key har taxonomy type ki apni — TAXONOMY_REF_KEY se.
                              Pehle sirf categories/tags thin; D-49 me badla, taaki
                              tax:{id} cache tag, archive aur delete guard HAR type
                              pe ek jaise kaam karein
                 searchText,                             denormalized, index ke liye
                 featuredImageId, order, parentId, updatedAt

revisions        entryId, snapshot, createdBy, createdAt, label, kind(save|publish)
media          * siteId, filename, mime, size, width, height, folderId, deletedAt,
                 variants[{ key, url, w, h }], alt, title, caption, uploadedBy
                 filename `doc-image-<sha1 ke 16 akshar>` = Bulk Upload se utri image
                 (D-92) — dobara import pe usi naam se dhoondhi jaati hai, isliye ye
                 naming ek CONTRACT hai. Koi naya field nahi (client, D-79 wali soch).
                 Google image `data:` URI me bhejta hai, to naam asal me content ka
                 hash hai — wahi image kabhi dobara nahi utarti
mediaRefs      * siteId, mediaId, entityType(entry|settings|menu), entityId, field
mediaFolders   * siteId, name, parentId
menus          * siteId, locale, key, name, version, deletedAt,
                 items[{ id, label, link, className, menuType,
                         children[],                      menuType=dropdown, max depth 3
                         mega{ layout, columns, className,
                               columns[{ className, groups[{ heading, link,
                                                             className, links[] }] }],
                               cta{ text, buttonLabel, buttonUrl, variant, className } } }]
                 poora contract → specs/006-menu-contract.md (D-43)
menuLocations  * siteId, locale, location, menuId
                 location theme declare karta hai, core enum nahi (D-17).
                 Ab sirf `header`. `mobile` NAHI (D-43); footerColumn1..4 bhi
                 NAHI — wo `settings.footerColumns[]` me chale gaye (D-44),
                 kyunki column me text bhi ho sakta hai aur uski ginti
                 client chunta hai. Migration 008.
sidebars       * siteId, locale, name, widgets[], version, deletedAt
                 widgets[{ id, type(enquiryForm|talkToPlanner|html), props }]
                 enquiryForm  props{ heading, description, formId }   D-89
                 talkToPlanner props{ heading }  — baaki sab derive (D-88 §2)
                 html         props{ icon, heading, html }            D-89
                 icon shared ICONS se — trustBadge ki apni alag list hai,
                 wo isi jaal ka purana udaharan hai (D-89, constants/icons.js)
                 wahi FROZEN envelope jo content.blocks[] ka hai (D-87 §7), par
                 apna alag enum — teen type, aur wo list FIX hai (D-88 §2).
                 ⚠️ Position yahan NAHI hai — wo page pe hai (`fields.sidebar`),
                 aur "kaunsi sidebar" bhi (`fields.sidebarId`). Client ne 8 Sep ko
                 wo lakeer khud khinchi: layout page ka, content site ka.
                 ⚠️ Koi location table nahi — `menus` se yahi farak hai. Assignment
                 page pe hai, isliye `menuLocations` jaisi doosri collection ki
                 zaroorat hi nahi. Migration 023.
templates      * siteId, name, type(page|post|archive|single|404|search),
                 regions{header,footer}, layout, isDefault
patterns       * siteId, name, kind(pattern|synced), blocks[], category
taxonomies     * siteId, locale, type(category|tag|destination|packageType), name,
                 slug, parentId, isDefault, seo, description, bannerMediaId, order,
                 color (`#rrggbb` | '', sirf category ka badge — D-93; khaali = theme ka rang)
                 destination hierarchical (India → Kerala → Munnar), packageType flat
                 locale day 1 se — uniqueness {siteId, locale, type, slug} hai.
                 Menus pe ye chhoot gaya tha aur D-43 me theek karna pada
                 → specs/007-packages.md §1.1, §1.2

hotels         * siteId, destinationId, category(standard|deluxe|premium|luxury),
                 name, room
                 category ki ginti fix 4 hai — code me constant, master list nahi (§1.3)
addOns         * siteId, name, price, where
                 price FREE TEXT hai, number nahi — "₹3,500 – ₹4,500 pp" (§1.4)
transfers      * siteId, name, icon
                 icon free string hai, enum nahi — icon ka set theme ka faisla
                 hai, core ka nahi (D-17 jaisa)

                 hotels/addOns/transfers pe `locale` jaan-boojh kar NAHI hai:
                 inpe koi unique index nahi, isliye multi-language aane pe
                 field add karna ek saada backfill hai, uniqueness ka badalna
                 nahi (schema-change §1). Taxonomies pe wo test PASS hota hai,
                 isliye wahan locale day 1 se hai. — D-48
reviews        * siteId, rating(1-5), month("YYYY-MM"), text, name, lastLine
                 UNIVERSAL hain — package inme se kuch chunta NAHI (D-70). Isiliye
                 entries pe koi reviews[] field nahi bani; spec §7 me wo per-package
                 socha gaya tha aur client ne 1 Sep ko ulta chuna
                 month STRING hai, Date nahi — Date banate hi timezone 1 taareekh ki
                 raat ko pichhla mahina bana deta. Sort bhi isi pe (YYYY-MM ka
                 lexical aur chronological kram ek hi hai). Migration 016
                 ⚠️ rating (4.9 / 412 trips) YAHAN NAHI — wo ek global jodi hai aur
                 packageDefaults.rating me hai; reviews se gini NAHI jaati (§9 #8)

packageDefaults* siteId(unique), whatsIncluded{included[],excluded[]},
                 itineraryImages[], bookingSteps[{title,text}], cancellationText,
                 rating{value,count},                            ← D-70
                 sectionLabels{<section>:{heading,description}}  ← D-65 (Q-9)
                 breadcrumbPageId  ← D-97 §6 — Tour page ki id; payload me
                 archiveCrumb{label: title, url: path}, draft/trash pe null
                 sectionLabels ki keys PACKAGE_SECTIONS se aati hain aur schema
                 pe .strict() hai — anjaan key chup-chaap gir jaati (D-43 §3)
                 khaali {} = theme ke apne headings, isliye migration nahi lagi
                 ⚠️ add-ons ISME NAHI hain — wo D-61 me kuch der yahan the, par
                 D-64 (usi din) me wapas package ke apne chunav ban gaye
                 singleton — wahi pattern jo settings ka hai. Package ke domain ki
                 globals; settings me jaan-boojh kar NAHI (D-46, §1.8)
settings.themeColors   ← D-98 — {primary, accent, heading, body, page, dark, perHeading,
                 headings{h1..h6}, advanced{key: hex}}; advanced me key = Auto hataya
settings.themeLayout   ← D-98 — {wrap, pad, padMobile, corners, shadow, btnHeight, btnShape,
                 sticky, headerH(-Mobile), logoH(-Mobile), logoMaxW, footLogoH(-Mobile),
                 footLogoMaxW, footLogoCard, spaceSection(-Mobile), spaceBlock(-Mobile),
                 cardGapRow, cardGapCol}  ← spacing D-100
settings.themeFonts    ← D-98 — {heading|body: {source, google, family, files[], faces[]},
                 scale{h1..h6, body, small, xsmall: {size, sizeTablet, sizeMobile, weight, lh, ls}}}
                 faces SERVER bharta hai (Google download) — admin ka bheja nahi maana jaata
                 public settings me teeno ka ek `themeCss` — sirf badle hue token
redirects      * siteId, locale, from, to, statusCode(301|302), hits, isAuto
                 isAuto false = Settings ▸ 301 Redirects se (D-97); auto use kabhi
                 overwrite nahi karta. from lowercase + bina trailing slash; to =
                 site ka path ya https:// link. hits abhi koi nahi ginta
                 resolve: dikhne wala page PEHLE, redirect sirf uske na hone pe (D-97 §3)
                 locale day 1 se — uniqueness {siteId, locale, from} hai (D-48 §3)
                 auto-redirect entries service banati hai (slug/parent badalne pe,
                 D-49). Manager UI Phase 4 me. Migration 011
forms          * siteId, name, emailTo, afterSubmit{mode,value}, placement,
                 status(active|draft), fields[{key,label,type,show,required,
                 options[],source}]                              ← D-72, migration 017
                 field ki `key` STORED DATA hai — enquiries ke values usi naam se
                 baithte hain (R4). Label badalta hai, key nahi
                 `label` OPTIONAL hai (22 Sep, D-103 §9.7) — khaali = site pe
                 wo naam dikhta nahi, khaana chalta rehta hai. Theme wahan
                 `aria-label` lagati hai (placeholder → key), warna khaana
                 screen reader pe bina naam ka milta. Checkbox apwaad hai
                 (uske paas placeholder hota hi nahi)
                 placement ke aaj do hi vikalp hain (packages | none); design ke
                 baaki teen (Contact page · Popup · Sticky bar) ko page builder
                 chahiye (Phase 5)
                 footnote · submitLabel (D-96, 15 Sep — button ka text, khaali
                 pe theme ka "Get this itinerary")
                 notifyEmail{subject,body}  ← D-109, 23 Sep, koi migration nahi
                 nayi enquiry ki mail emailTo ke pate(on) pe — TEAM ko, bharne
                 wale ko nahi. emailTo khaali = mail nahi (alag toggle nahi).
                 subject/body khaali = default template, "mail band" nahi.
                 body HTML hai → write pe sanitize (R20). Variables {{fieldKey}}
                 + {{all_fields}} {{form_name}} {{page_url}} {{enquiry_id}};
                 render packages/shared ka renderEnquiryMail(). PUBLIC PAYLOAD
                 me kabhi nahi jaata (toPublicForm projection hai)
videoReviews   * siteId, imageId, videoUrl(https), name, packageName    ← D-96 §13, migration 025
                 reviews se ALAG collection (text reviews package page pe bina
                 filter jaati hain). Permission wahi review.*. Home ke
                 videoReviews section me reviewIds[] se chune jaate hain
enquiries      * siteId, formId, formName, sourcePath, values{}, status,
                 notes[], deletedAt, searchText                    ← D-75, 3 Sep
                 ⚠️ sourceUrl STORE nahi hota — controller use sourcePath +
                 env.SITE_URL se banata hai, sirf DETAIL ke response me
                 (D-90 §8, 9 Sep). Path akela admin ke apne origin (:5173) ka
                 pata lagta hai aur use koi khol hi nahi sakta. List me abhi
                 bhi sourcePath hai — wahan poora URL bemaani hota
                 formName COPY hota hai, sirf formId nahi — form rename ya delete
                 ho jaaye to bhi enquiry apna source jaanti hai
                 values me sirf string/number/boolean pahunchte hain — ye endpoint
                 BINA AUTH ke hai, isliye R9 yahan sabse zyada maayne rakhta hai
                 status ab ENUM hai (ENQUIRY_STATUSES) — new · contacted · quoted
                 · negotiating · converted · lost
                 notes[] internal hain, grahak ko kabhi nahi dikhte
                 notification{status(sent|failed|skipped),to[],at,error}|null
                 ← D-109: team ko mail gayi ya nahi, Detail pe dikhta hai. null =
                 us form pe emailTo khaali tha. Submit mail ka INTEZAAR nahi karta;
                 mail fail hone se enquiry kabhi nahi girti
                 deletedAt — delete = trash (R12), permanent delete ka raasta NAHI
                 searchText values ka text ek jagah; iske bina search ka matlab
                 hota Mixed `values` pe regex — wahi R9 wali khatarnaak jagah
                 ✅ Inbox 3 Sep ko ban gayi (D-75) — All Enquiries · Detail ·
                 Export CSV. Collection 1 Sep se bhar rahi thi (D-72): ek form jo
                 bhara jaata hai par store nahi hota, wo asli enquiries chup-chaap
                 kho deta hai — screen baad me banti hai, kho gaya data nahi

                 ⚠️ NAAM KA FARQ, jaan-boojh kar: is doc me pehle ye `submissions`
                 likhi thi (spec 001 ke saath), aur permissions aaj bhi
                 `submission.*` hain. Collection `enquiries` hai kyunki client ki
                 poori vocabulary wahi hai — design, nav aur screens sab "Enquiries"
                 kehte hain. Permission ke naam abhi NAHI badle gaye: wo spec 001 ke
                 frozen naam hain aur aaj koi route unpe khada nahi hai. Jis din
                 inbox banegi, dono me se ek naam chunna padega — us din tak ye farq
                 yahan likha hua hai taaki chup na rahe
importRuns     * siteId, sheetUrl, sheetId, mode(new|existing),       ← D-81, migration 021
                 target(package|post|page|seo),                       ← D-92, D-95, D-107
                 status(queued|running|done|failed), startedBy,
                 warnings[], error, finishedAt,
                 rows[{ docUrl, docId, status, action(created|updated), entryId,
                        title, path, issues[{ level, label, value, message }],
                        values, error, claimedAt, attempts }]          max 200
                 docUrl ab REQUIRED nahi (D-107) — `seo` wali row ka koi doc hota
                 hi nahi, uski pehchaan `path` hai. Widening hai: purane har row me
                 wo bhara hua hai, isliye na backfill na migration
                 values (Mixed, default null) sirf `seo` target pe — sheet ki row ka
                 kachcha maal. Sheet EK BAAR padhi jaati hai, isliye har row apni
                 value saath le kar chalti hai; row-dar-row dobara padhne ka matlab
                 hota ki beech me sheet badalne pe aadhi run purani aur aadhi nayi
                 sheet pe chale — bina kisi nishaan ke
                 ⚠️ `seo` target kisi ek type ka nahi hai (entryType null) — wo har
                 type ke maujooda page ka seo{title,description} badalta hai aur
                 KOI page banata nahi (D-107 §5)
                 rows SUBDOCUMENT hain, alag collection nahi — hamesha run ke
                 saath padhi jaati hain, akele kabhi query nahi hoti
                 sheet me kuch LIKHA nahi jaata — status ka ghar yahi hai (client)
                 sirf 20 run bachte hain — HAR TYPE ke 20 (D-92 §12, 11 Sep); naya
                 run banne pe usi type ke purane done/failed hat-te hain (chalta
                 hua kabhi nahi). Bina `target` wale purane run package me gine jaate
                 hain — `{ $in: ['package', null] }`
                 target ka default `package` — purane run pe wo SACH hai (us waqt
                 import package ka hi hota tha), isliye migration NAHI lagi
                 issues ka shape `packages/shared` ke issueSchema se (R8), model
                 me Mixed — do jagah likhne se ek din wo alag ho jaate
                 startedBy sirf hisaab nahi — worker ke paas request nahi hoti,
                 createEntry/publishEntry ka actor usi se banta hai
                 claimedAt/attempts sirf atki hui row wapas laane ke liye
                 ⚠️ Mongo me naam `importruns` hai (mongoose lowercase karta hai);
                 migration 021 ke index `importRuns` pe ho sakte hain — A-18
activityLog      userId, action, entityType, entityId, meta, createdAt   (DEFER — Q-4)
```

`users` / `roles` / `revisions` / `refreshTokens` / `activityLog` / `migrations` pe
`siteId` nahi — ye user ya parent entry se derive ho jaate hain.

### 3.1 Day 1 se reserve hone wale fields

Ye "insurance" hain — kaam baad me, par **field abhi**, kyunki live data pe baad me
daalna schema-wide change hai.

| Field        | Kyun day 1                                                              |
| ------------ | ----------------------------------------------------------------------- |
| `siteId`     | Multi-site kabhi karna pada to bade data pe index rebuild na karna pade |
| `path`       | Routing ka single source of truth — §4                                  |
| `deletedAt`  | Trash/soft-delete har list query aur har index ko chhoota hai           |
| `locale`     | Multi-language pe uniqueness `{siteId, locale, path}` ban jaati hai     |
| `version`    | Optimistic concurrency — autosave + 2 editors = silent lost update      |
| `searchText` | Mongo ek hi text index deta hai; block content isi se searchable banega |

### 3.2 Single-site by design, multi-site reserved

Ek deployment = ek client = ek website. Multiple websites ek admin se manage karna
scope me nahi hai.

**Multi-site ke liye tab jo banana padega (~2-3 hafte):** `sites` collection ·
admin site-switcher + current-site context · **har query me siteId scoping** (ek query
bhooli = cross-site data leak, ye security bug class hai) · per-site permissions ·
`Host` header se site resolve · cache keys me siteId · media shared vs per-site.

### 3.3 Indexes

Compound indexes me `siteId` **sabse pehle**.

`settings` pe `{ siteId: 1 }` **unique** — yahi "ek instance, ek settings document" ko
sach me enforce karta hai (D-40, migration 005).

```
entries:   { siteId: 1, locale: 1, path: 1 }               unique   ← routing
entries:   { siteId: 1, type: 1, slug: 1 }                 unique
entries:   { siteId: 1, type: 1, status: 1, publishAt: -1 }
entries:   { siteId: 1, deletedAt: 1, updatedAt: -1 }
entries:   { siteId: 1, parentId: 1, order: 1 }
entries:   { searchText: "text" }                          ← ek hi text index allowed
media:     { siteId: 1, folderId: 1, createdAt: -1 }
mediaRefs: { siteId: 1, mediaId: 1 }
redirects:     { siteId: 1, locale: 1, from: 1 }            unique   ← migration 011
redirects:     { siteId: 1, locale: 1, to: 1 }                      ← chain flatten
taxonomies:    { siteId: 1, locale: 1, type: 1, slug: 1 }  unique   ← migration 010
taxonomies:    { siteId: 1, type: 1, parentId: 1, order: 1 }        ← tree ki list
hotels:        { siteId: 1, destinationId: 1, category: 1 }         ← migration 010
addOns:        { siteId: 1, name: 1 }
transfers:     { siteId: 1, name: 1 }
reviews:       { siteId: 1, month: -1, createdAt: -1 }              ← migration 016
                 disha wahi jo query ki hai — Mongo compound index ulta tabhi
                 chalata hai jab POORI key ulti ho
packageDefaults: { siteId: 1 }                             unique   ← singleton
forms:         { siteId: 1, status: 1, updatedAt: -1 }              ← migration 017
forms:         { siteId: 1, placement: 1, status: 1, updatedAt: -1 }
                 ye HAR package page ke render pe chalti hai — bina index ke ek
                 collection scan har page pe lagta
enquiries:     { siteId: 1, formId: 1, createdAt: -1 }               ← migration 017
enquiries:     { siteId: 1, createdAt: -1 }
enquiries:     { siteId: 1, deletedAt: 1, createdAt: -1 }            ← migration 018
enquiries:     { siteId: 1, deletedAt: 1, status: 1, createdAt: -1 }
               ⚠️ 017 wale do ab kaafi nahi the — har inbox read `deletedAt: null`
               pe chhanti hai, aur wo key un indexes me hai hi nahi (D-75)
menus:         { siteId: 1, locale: 1, key: 1 }            unique   ← locale D-43 me juda
menus:         { siteId: 1, deletedAt: 1, updatedAt: -1 }
menuLocations: { siteId: 1, locale: 1, location: 1 }       unique
sidebars:      { siteId: 1, locale: 1, deletedAt: 1, updatedAt: -1 }  ← migration 023
contentTypes:  { siteId: 1, key: 1 }                       unique   ← migration 009
revisions: { entryId: 1, createdAt: -1 }                              ← migration 009
refreshTokens: { jti: 1 } unique · { userId: 1 } · { expiresAt: 1 } TTL
passwordResets: { tokenHash: 1 } unique · { userId: 1 } · { expiresAt: 1 } TTL  ← migration 028
```

> **Text index ka trap:** MongoDB ek collection pe sirf **ek** text index allow karta
> hai, aur `{title, seo.description}` block content cover nahi karta — matlab page ke
> body text pe search chup-chaap kuch nahi dhoondhta. Isliye save pe `searchText` me
> title + excerpt + blocks ka flattened text likho, index usi pe. Admin Cmd+K search
> aur list search dono isi pe chalenge.

---

## 4. URL & path model

**Problem:** `{siteId, type, slug}` unique hone ke baawajood ek `page` "about" aur ek
`service` "about" dono `/about` pe resolve kar sakte hain — unique index isko rok nahi
paata.

> **Rule:** har entry pe computed `path` field stored hai, `{siteId, locale, path}` > **unique** hai. Lookup ek single indexed equality query hai.

```
path likhne wala sirf EK function hai:  resolvePath(entry, contentType)

  page   →  parentId chain se        /about, /about/team
  post   →  contentType.urlPattern   /blog/{slug}
  custom →  contentType.urlPattern   /services/{slug}
```

**Routing:** `apps/web` me sirf **ek catch-all** `[[...slug]]`, jo stored `path` se
resolve karta hai. `app/blog/[slug]` jaisa hardcoded route banana `urlPattern` ke
configurable hone ka matlab hi khatam kar deta hai.

| Rule            | Behaviour                                                                          |
| --------------- | ---------------------------------------------------------------------------------- |
| Reserved slugs  | `/admin` `/api` `/_next` `/media` `/uploads` kabhi claim nahi ho sakte             |
| Slug collision  | auto-suffix `-2`, `-3`                                                             |
| Slug change     | **automatic** 301, aur **descendants ka path cascade update** + har ek pe redirect |
| Canonical       | trailing-slash policy fix, lowercase enforce, baaki variants 301                   |
| Redirect safety | chain flatten + loop detection                                                     |
| Homepage        | `homePage` type, `urlPattern: '/'` — ek hi entry, path hi `/` hai (**D-96**)             |
| Posts page      | `settings.postsPageEntryId` — archive kis URL pe hai                               |

**Archive routes (usi catch-all ke andar):**

```
/                        homepage (`homePage` entry, D-96)
/{postsPageSlug}         post archive
/{postsPageSlug}/page/2  pagination
/category/{slug}         taxonomy archive    (base editable)
/tag/{slug}              taxonomy archive    (base editable)
/{archiveBase}           custom type archive (contentType se)
/search?q=               search results
/feed                    RSS
```

Permalink options **jaan-boojh kar limited** hain — `?p=123`, numeric aur date-based
patterns nahi. Published content ke baad pattern badla to redirects automatic banenge.

---

## 5. Status lifecycle

```
draft ──> pending ──> published ──> (unpublish) ──> draft
             │            │
             │            └──> scheduled (publishAt future)
             │
private = published, par sirf logged-in user ko dikhta hai (client staging pages)
```

**Trash `status` nahi hai — wo `deletedAt` field hai** (D-25):

```
koi bhi status  +  deletedAt: null        →  normal
koi bhi status  +  deletedAt: <timestamp> →  Trash me hai

restore  →  deletedAt = null, status jaisa tha waisa wapas
purge    →  permanent delete (sirf `admin`, sirf Trash screen se)
```

`status` ko chhua nahi jaata, isliye published entry restore hone pe **published hi**
wapas aati hai. `status: 'trash'` karne pe ye info kho jaati.

> **Har query me `deletedAt: null` filter zaroori hai.** Ye service layer ka default
> hona chahiye, controller ka nahi — bhoolne pe trashed entries public site pe dikh
> jaayengi.

- **`pending` optional nahi hai** — `author`/`contributor` publish nahi kar sakte, to
  unke "kaam ho gaya, review karo" ka koi state hi nahi bachta.
- **`trash` optional nahi hai** — target user non-technical hai, delete galti se hoga.
  Delete hamesha trash me daale; permanent delete sirf Trash screen ke andar se.

**Scheduled publish DB-based hai, `setTimeout` se kabhi nahi:**
`status:'scheduled'` + indexed `publishAt`; cron har minute atomic `findOneAndUpdate`
se claim kare (multi-instance pe double-publish se bachne ko). Public read query khud
bhi `scheduled && publishAt <= now` ko published maane — cron band ho jaaye to bhi
site sahi rahe (**self-healing**).

---

## 6. Page builder

Page ka layout ek **JSON tree** hai, HTML string nahi.

```json
{
  "version": 1,
  "blocks": [
    {
      "id": "b1",
      "type": "section",
      "props": { "background": { "type": "color", "value": "#0f172a" } },
      "style": { "desktop": { "paddingY": 80 }, "mobile": { "paddingY": 40 } },
      "children": [
        {
          "id": "b2",
          "type": "container",
          "props": { "maxWidth": 1200 },
          "children": [
            { "id": "b3", "type": "heading", "props": { "text": "Hello", "level": 1 } },
            { "id": "b4", "type": "button", "props": { "label": "Contact", "href": "/contact" } }
          ]
        }
      ]
    }
  ]
}
```

### 6.1 Block definition — framework ka extension point

```
{
  type: 'heading',
  label: 'Heading',
  category: 'Basic',
  allowedChildren: null,          // ya ['column']
  schema: [                       // isse properties panel AUTO ban jaata hai
    { key: 'text',  type: 'text',   label: 'Text', default: 'Heading' },
    { key: 'level', type: 'select', options: [1,2,3,4], default: 2 },
    { key: 'align', type: 'align',  responsive: true }
  ],
  defaults: { ... },
  toolbar: ['align','duplicate','delete'],
  Render: (props) => JSX          // ek hi component: admin canvas + public site
}
```

Naya block = **sirf ek file**. Properties panel, drag list, defaults — sab schema se
generate hote hain. Core code touch nahi hota.

### 6.2 `style` se CSS kaise banta hai

**Inline styles se media queries likhi hi nahi ja sakti** — isliye responsive model
inline style se implement ho hi nahi sakta.

> **Decision: server-generated scoped CSS.** Har block ke `id` se class banti hai
> (`.blk-b1`), render ke waqt ek `<style>` emit hota hai jisme asli media queries hain.

```css
.blk-b1 {
  padding-block: 80px;
}
@media (max-width: 1023px) {
  .blk-b1 {
    padding-block: 60px;
  }
}
@media (max-width: 767px) {
  .blk-b1 {
    padding-block: 40px;
  }
}
```

Ye function `packages/blocks` me hai (`styleToCss(block)`), taaki admin canvas aur
public site bilkul same CSS banayein. Value space constrained hai (spacing scale, token
colors) — free-form CSS nahi. CSP ke liye is `<style>` pe nonce lagega.

### 6.3 Preview == live kaise guarantee hoti hai

Sirf component share karna **kaafi nahi** — host alag hai. Admin canvas Vite iframe hai,
live page Next.js. `next/image` aur `next/link` canvas me chalenge hi nahi.

> **Rule:** blocks framework-agnostic rahenge; host apne primitives inject karega.
>
> ```jsx
> <BlockRenderer blocks={...} components={{ Link, Image }} />
> ```
>
> `apps/web` Next ke `Link`/`Image` deta hai (image optimization milti rahegi),
> admin canvas plain `<a>` / `<img>` deta hai. Block ka code ek hi rehta hai.

Escape hatch agar Phase 5 me divergence dikhe: canvas iframe ko asli Next app pe
draft-mode me point kar do — tab preview _hai hi_ live.

### 6.4 Theming API — client customization ka contract

Sirf design tokens kaafi nahi hote. Blocks ko ek documented styling surface deni hogi:

1. Har block stable class names + `data-block-type` attribute emit kare
2. Block apni CSS variables expose kare (`--blk-heading-color`)
3. Registry me **override hook** — theme kisi block ka `Render` replace kar sake:
   `registry.override('heading', MyHeading)`

Iske bina har client "thoda alag hero" maangega, core block file badalni padegi, aur
framework 3 client baad forks ka dher ban jaayega.

### 6.5 Builder UI layout

Detail [`04-ADMIN-UX.md`](04-ADMIN-UX.md) me. Sankshep me:

1. **Left** — block library (categories + search) + layers/tree view
2. **Center** — canvas, **sandboxed iframe** me
3. **Right** — **do tabs: `Document` aur `Block`**
4. **Floating block toolbar** — selection pe align/link/duplicate/delete/move
5. **Top** — undo/redo, breakpoint switch, preview, save/publish

### 6.6 Responsive model

Har block pe `style.desktop | tablet | mobile`. Mobile khaali ho to desktop se inherit.
Sirf ye control: spacing, alignment, visibility, columns, font size. Free-form CSS mat
do — non-technical user usse site tod dega.

### 6.7 Do editors, ek content field

`hasBuilder` per content type decide karta hai kaunsa editor khulega:

- `hasBuilder: false` (Posts) → rich text editor; content ek single `richText` block
- `hasBuilder: true` (Pages) → full block builder

Dono **ek hi** `content.blocks` shape likhte hain, isliye type ko builder pe switch
karna non-destructive hai.

### 6.8 Patterns aur Synced Patterns

- **Pattern** — ready-made section (hero, features, CTA). Insert hote hi **copy** ban
  jaata hai; baad ka edit sirf usi page pe.
- **Synced Pattern** — ek jagah save, har use pe **reference**. Ek jagah badlo, poori
  site update.

---

## 7. Rendering, cache & SEO

```
User /about kholta hai
  → Next.js catch-all [[...slug]]
  → GET /api/public/resolve?path=/about        (indexed path lookup)
  → entry.templateId se template → header/footer regions
  → <BlockRenderer blocks={...} components={{Link,Image}} /> + scoped CSS
  → generateMetadata(): title template, description, canonical, OG, JSON-LD
  → ISR + cache tags; publish pe API se on-demand revalidate
```

### 7.1 Cache authority — ek hi, do nahi

> **Rule: Next.js ISR hi cache authority hai.** Public API pe koi TTL cache nahi
> (ya sirf explicitly-invalidated — time-based kabhi nahi).

Do cache layer aur ek invalidation signal = "publish kiya par site update nahi hui"
wala support ticket.

### 7.2 Invalidation ek graph hai, ek path nahi

`revalidatePath('/blog/x')` kaafi nahi. Ek post publish hone pe stale hote hain:

```
post ka page · post archive + uske saare pagination pages ·
har category/tag archive jisme wo hai · har page jisme "Post List" block hai ·
menu (agar link hua) · sitemap.xml · RSS feed
```

Isliye **tag-based invalidation**: har fetch pe tags (`entry:{id}`, `path:{path}`, `type:post`,
`tax:{id}`, `menu:{location}`, `settings`), aur publish service ek explicit dependency
map se `revalidateTag()` maare. Ye map Phase 3 me design hoga, Phase 8 me retrofit nahi.

Revalidate webhook **shared secret se protected** — warna wo ek public cache-purge
endpoint hai.

### 7.3 SEO

- Per-entry meta + **title templates** (`%title% | %sitename%`) per content type
- Fallback chain: entry SEO → `settings.titleTemplates[type]` → `settings.defaultSeo`
  → entry title/excerpt
- OG/Twitter cards, canonical, robots directives
- Auto `sitemap.xml`, `robots.txt`, **RSS feed**
- JSON-LD: Organization, WebSite, Article/WebPage, **BreadcrumbList**
- **Breadcrumbs** `parentId` se
- Redirect manager (301/302 + hit counter)
- Editor me SEO checklist score, publish se pehle pre-publish panel me dikhta hai

**Global kill-switch:** `settings.searchEngineVisible = false` → poori site `noindex` +
`robots.txt` disallow, aur admin me permanent warning banner. Staging site ka Google me
index ho jaana agency ka sabse mehnga routine accident hai.

**SEO object (har entry pe embedded):**

```json
{
  "title": "",
  "description": "",
  "canonical": "",
  "noindex": false,
  "nofollow": false,
  "ogTitle": "",
  "ogDescription": "",
  "ogImageId": "",
  "twitterCard": "summary_large_image",
  "schemaType": "WebPage|Article|Product",
  "focusKeyword": ""
}
```

---

## 8. Auth & roles

### 8.1 Cookie + CSRF policy

```
access token   15 min   httpOnly · Secure (prod) · SameSite=Lax · Path=/ · __Host- prefix
refresh token  24 ghante  wahi flags + rotation on use + reuse detection
               7 din      agar login pe "Remember me" tick hua ho (D-38)
CSRF           double-submit token; har non-GET request pe verify
CORS           strict origin allowlist + credentials:true  (wildcard kabhi nahi)
```

localStorage me token kabhi nahi — CMS me user rich text aur embed HTML daalta hai,
XSS surface bada hai; cookie hi safe hai.

| Setup                       | Cookie                                                             | CSRF ka bharosa        |
| --------------------------- | ------------------------------------------------------------------ | ---------------------- |
| **Same-origin (chuna hua)** | `SameSite=Lax` kaam karta hai                                      | Token defence-in-depth |
| Cross-origin                | `SameSite=None; Secure` majboori — **SameSite ka protection zero** | Token akela sahara     |

**Teen zaroori saathi:**

1. **`refreshTokens` collection** — reuse detection stateless JWT se ho hi nahi sakti.
   `jti` + `familyId` server pe. Purana token dobara use hua = poori family revoke.
2. **Single-flight refresh mutex** admin API client me — ek screen 5 parallel request
   maarti hai, sab 401 aate hain, 5 refresh chal padte hain; rotation ke saath 4 "token
   chori" lagte hain aur user random logout ho jaata hai.
3. **State-changing GET kabhi nahi** — `SameSite=Lax` top-level GET navigation pe cookie
   bhejta hai; koi bhi state-changing GET usi gap se CSRF-able hai.

`__Host-` prefix ko `Secure` chahiye, matlab plain HTTP dev me set nahi hoga — cookie
name env-conditional rakho ya local HTTPS chalao.

### 8.2 CSP

Helmet enable karna kaafi nahi, **policy likhni padegi**. Nonce-based: block ka
generated `<style>` aur theme scripts nonce carry karenge.

> `settings.scripts` (GTM etc.) sirf **`admin` role** ko editable. Ye ek privilege
> boundary hai, settings field nahi. Editor `<script>` inject kar sake to wo admin ke
> browser me chalega — matlab role escalation.

Canvas iframe **`sandbox` attribute ke saath**. Untrusted block content ka admin session
ke saath same-origin execute hona poore system ka sabse bada target hai.

### 8.3 Roles

| Role          | Kya kar sakta hai                                                             |
| ------------- | ----------------------------------------------------------------------------- |
| `admin`       | Sab kuch — settings, scripts, users, **permanent delete**                     |
| `editor`      | Saara content publish, media, menus. Trash me daal sakta hai, mita nahi sakta |
| `author`      | Apna content **publish kar sakta hai**                                        |
| `contributor` | Apna content likhta hai, publish nahi — `pending` pe bhejta hai               |
| `salesAgent`  | Enquiries handle karta hai, content nahi (D-29). Permissions Phase 7b me      |

**Paanch** roles hain — `subscriber` nahi banega (D-26), `salesAgent` add hua (D-29).

Permissions string-based: `entry.create`, `entry.publish`, `entry.publish.own`,
`media.delete`, `settings.update`, `settings.scripts.update`. Role → permissions[]
mapping **DB me** (`roles` collection) — `packages/shared` ka `ROLE_PERMISSIONS` sirf
seed ka default hai. Built-in roles ke **labels** bhi wahin hain (`ROLE_LABEL`): seed
unhe DB me likhta hai aur admin unhe seedha padhta hai, taaki dono kabhi alag na hon. Har admin route pe `requirePermission('...')`.

**Users pe `deletedAt` nahi hai** — na trash, na soft delete. Do alag raaste hain (D-34):

| | Kya hota hai | Kiske liye |
|---|---|---|
| **Deactivate** | Login band, sessions turant revoke, record aur content bache rehte hain | **UI me nahi hai** (D-35) — API aur `status` field reserve hain |
| **Delete** | Row DB se mit jaati hai. Pehle poochta hai "content kise dein" | Permanent. `user.delete` sirf admin ke paas |

**Paanch guard service me hain**, middleware me nahi — middleware ke paas document hota
hi nahi, aur ye sab "kis PE kar sakte ho" wale sawaal hain:

| Guard | Kyun |
| --- | --- |
| Administrator delete nahi hota | D-34 |
| Aakhri admin ka role nahi badalta | Site lock ho jaayegi |
| Koi apna account delete/deactivate nahi kar sakta | D-34 |
| **Koi apna role khud nahi badal sakta** | D-39 — UI me rok thi, server pe nahi |
| **Jo permission khud ke paas nahi, wo kisi ko de nahi sakte** | D-39 — Phase 7 ka escalation raasta |

**Password badalne ke do raaste hain** (D-37, jo D-35 §1 ko supersede karta hai):

| Raasta | Kaun | Kya chahiye |
| --- | --- | --- |
| **Profile** | har user, apne liye | **current password** + naya |
| **Edit User** ka reset field | sirf admin, kisi ke liye | kuch nahi — recovery ka ekmatra raasta |

Doosra raasta isliye zaroori hai ki abhi koi "forgot password" email flow nahi hai
(SMTP pending). Reset ya change hote hi us user ke **doosre sessions revoke** ho jaate
hain; jis session se badla wo zinda rehta hai.

`mustChangePassword` wala **forced** flow alag cheez hai aur waise hi rahega — wo seed
wale admin pe lagta hai (uska password `.env` me plain text me hota hai) aur poori screen
block karta hai jab tak password na badle.

Password badalne pe purane saare sessions marte hain **aur usi waqt ek naya issue hota
hai**. Dono zaroori hain: pehla isliye ki password aksar isiliye badla jaata hai ki
kisi aur ke paas access aa gaya tha, doosra isliye ki warna user apna hi password badal
kar khud logout ho jaata.

### 8.4 Kya ban chuka hai (Phase 0)

```
apps/api/src/core/tokens.js          JWT sign/verify + cookie flags + safeEqual
apps/api/src/middleware/auth.js      attachUser · requireAuth · requirePermission
apps/api/src/middleware/csrf.js      double-submit check
apps/api/src/modules/auth/           RefreshToken + PasswordReset · login/refresh/logout/password
                                     · forgot-password/reset-password (sirf admin, D-110)
apps/api/src/modules/users/          User model · /api/me · /api/users (CRUD + delete)
apps/api/src/modules/roles/          Role model · permissions cache · seed · GET /api/roles
migrations/002-auth-indexes.js       users · roles · refreshTokens (TTL ke saath)
migrations/003-user-username.js      users.username backfill + unique index

apps/admin/src/lib/nav.js            nav registry — sidebar AUR route guard dono isse (D-37)
apps/admin/src/screens/Profile.jsx   apni profile — naam + password
apps/admin/src/screens/NoAccess.jsx  permission na ho to yahi dikhta hai
```

**Admin me permission ke do layer hain, aur dono ek hi jagah se aate hain** (`lib/nav.js`):
sidebar item chhupana, aur route pe screen render hi na hone dena. Dono ko alag-alag
files me rakhne ka nateeja hamesha ek hi hota hai — item menu se gayab, par URL type
karne pe screen khul jaati hai. **Asli rok phir bhi server pe hi hai.**

`attachUser` **har request pe user DB se laata hai** (role cached hai, user nahi).
Ek query ki keemat pe ye guarantee milti hai ki deactivate kiya gaya user agli hi
request pe bahar ho jaaye — 15 minute baad nahi jab access token expire ho.

Har user ke liye **apni Profile screen** — ye "dusron ko manage karna" se alag cheez hai.
Editable sirf **naam** aur **password** (D-37); username (D-34 — immutable), email aur
role read-only hain. Avatar Phase 2 (Media) pe block hai.

---

## 9. API surface

```
POST   /api/auth/login | logout | refresh | forgot | reset
GET/PATCH /api/me                        apni profile + password change

GET    /api/entries?type=page&status=&q=&page=&trashed=      ✅ Slice 1
POST   /api/entries                                          ✅
GET    /api/entries/:id                                      ✅
PATCH  /api/entries/:id                  version bhejo → mismatch pe 409   ✅
POST   /api/entries/:id/publish | unpublish | duplicate | submit-review    ✅
                                         publish { publishAt?, visibility? } —
                                         visibility: 'private' = status 'private'
                                         (koi naya field nahi, spec 007 §2)
POST   /api/entries/:id/trash | restore                      ✅
DELETE /api/entries/:id                  permanent, sirf Trash ke andar se ✅
GET    /api/entries/counts?type=         tabs ke counts, ek hi call me  ✅ Slice 3
POST   /api/entries/bulk                 { ids[], action }             ✅ Slice 3
                                         trash · restore · feature · unfeature ·
                                         soldOut · open. **purge yahan nahi** —
                                         permanent delete ek-ek karke hi (R12)
GET    /api/entries/:id/revisions                            ✅
GET    /api/entries/:id/revisions/:rid/diff                  — Phase 1 baad me
POST   /api/entries/:id/revisions/:rid/restore               ✅
GET    /api/entries/:id/autosave         crash recovery      — Slice 3

CRUD   /api/content-types                                    ✅ Slice 1 (write sirf admin)

GET    /api/taxonomies?type=destination&q=&parentId=         ✅ Slice 2
CRUD   /api/taxonomies                   type QUERY me zaroori hai — ek collection
                                         ka matlab ek list hona nahi hai
                                         list har row pe usageCount deti hai (ek
                                         aggregate, N+1 nahi)
CRUD   /api/hotels | /api/add-ons | /api/transfers           ✅ Slice 2
                                         teenon ek hi module se, par alag routes
                                         aur alag permissions (D-48)
GET/PATCH /api/package-defaults          ek document, isliye koi :id nahi  ✅ Slice 2

GET    /api/redirects?q=&isAuto=true|false                   ✅ q = from ya to
POST   /api/redirects                    ✅ D-97 — {from, to}, hamesha 301
PATCH  /api/redirects/:id                ✅ D-97 — edit pe isAuto false
DELETE /api/redirects/:id                ✅

POST   /api/admin/media (multipart)   GET /api/admin/media
POST   /api/admin/media/:id/trash | restore
POST   /api/admin/media/:id/edit         crop / rotate / scale
POST   /api/admin/media/:id/replace      file swap, URL + refs same
GET    /api/admin/media/:id/usage        mediaRefs se

CRUD   /api/menus   ·   GET/PUT /api/menu-locations
GET/PATCH /api/settings                  ek document, isliye koi :id nahi (D-40)
                                         read: settings.read · write: settings.update
CRUD   /api/templates | patterns | users
GET    /api/admin/search?q=              Cmd+K, searchText pe
GET    /api/admin/activity
POST   /api/admin/tools/export | import

GET    /api/public/resolve?path=/about   ✅ Slice 7 ki shuruaat — entry | redirect | 404
                                         taxonomy aur archive abhi nahi (Phase 3)
                                         redirect pe 200 + payload jaata hai, HTTP 301
                                         nahi — wo apps/web ka kaam hai (D-52 §1)
GET    /api/public/package-defaults      ✅ alag endpoint, alag cache tag (type:package)
GET    /api/public/entries?type=post&page=1&limit=10&category=news
GET    /api/public/search?q=
GET    /api/public/menus/:location
GET    /api/public/settings
GET    /api/public/sitemap  ·  /api/public/feed

POST   /api/bulk-imports                 { sheetUrl, mode, target }             ✅ D-81
                                         sheet ABHI padhi jaati hai (galat link pe
                                         turant 422); docs baad me ek-ek karke, worker
                                         me. Run turant lautta hai. `target` D-92 me
                                         juda — package | post, default package
GET    /api/bulk-imports?page=&limit=    Past imports — rows NAHI, sirf failedReasons ✅
       &target=package|post              optional; khaali = dono type (D-92 §12)
GET    /api/bulk-imports/:id             ek run, rows ke saath — admin ise poll karta ✅
                                         hai. Teeno `tools.import` pe (sirf admin)
```

Admin aur public routes alag: public read-only, admin authed.

> **Prefix `/api/<resource>` hai, `/api/admin/<resource>` nahi.** Ye doc pehle
> `/api/admin/*` likhta tha, par code Phase 0 se hi `/api/users`, `/api/settings`,
> `/api/menus` pe chal raha hai. Alag prefix ka koi fayda nahi tha — auth cookie se aati
> hai, path se nahi — aur do naam rakhne se doc code se alag hota chala gaya. Slice 1 me
> doc ko code ke hisaab se theek kar diya gaya.

> `by-path` ki jagah `resolve` isliye ki ek hi endpoint entry, taxonomy archive, custom
> archive, redirect aur 404 — sabka jawab de. Next ka catch-all ek hi call me decide
> kar le ki render kya karna hai.

---

## 11. CSS structure

Poore project me **plain CSS** — Tailwind, CSS Modules aur CSS-in-JS teenon reject
hue hain (D-28). Teen alag CSS "duniya" hain, kyunki teenon ki constraint alag hai.

### 11.1 Admin (`apps/admin`)

```
src/
├─ index.css                  ← entry: sirf SHARED layer import karta hai
├─ styles/
│  ├─ tokens.css              23 CSS variables — design se copy
│  ├─ base.css                reset, body, a, h1-h4, input defaults
│  ├─ layout.css              .main, .page-head, .subtitle
│  └─ primitives.css          .btn .card .table .badge .form-* — reuse hone wale
├─ components/admin/
│  ├─ AdminBar.jsx  +  AdminBar.css     (.adminbar, .ab-*)
│  └─ Sidebar.jsx   +  Sidebar.css      (.sidebar, .menu-*, .submenu)
└─ modules/
   └─ <feature>/Feature.jsx  +  Feature.css
```

**Rule:** shared cheez `styles/` me, component ki apni cheez uske saath.
Component apni CSS **khud import** karta hai — `index.css` me nahi jaati.

Ye split hum ne banaya nahi — **frozen design me pehle se hai**. Uske CSS comments
literally kehte hain `/* SIDEBAR (components/admin/Sidebar.jsx) */`. Section →
file mapping:

| Design section | Kahan gaya |
|---|---|
| DESIGN TOKENS (`:root`) | `styles/tokens.css` |
| reset + element defaults | `styles/base.css` |
| LAYOUT | `styles/layout.css` |
| BUTTONS · CARDS/PANELS · TABLES · BADGES/PILLS · FORMS | `styles/primitives.css` |
| ADMIN BAR | `components/admin/AdminBar.css` |
| SIDEBAR | `components/admin/Sidebar.css` |
| DASHBOARD | `modules/dashboard/Dashboard.css` *(jab bane)* |
| MEDIA | `modules/media/Media.css` *(jab bane)* |
| ITINERARY BUILDER | client repo — travel-specific *(§11 of 11-REFERENCE-ADMIN)* |

### 11.2 Blocks (`packages/blocks`)

Blocks **admin canvas aur public site dono** me chalte hain, isliye admin ki CSS
import nahi kar sakte.

```
packages/blocks/src/
├─ styles/
│  ├─ tokens.css       spacing scale, breakpoints
│  └─ base.css         .blk-* resets
└─ blocks/heading/
   ├─ index.js         definition + Render
   └─ heading.css      .blk-heading ke base styles
```

Iske **upar** runtime CSS aati hai — `styleToCss()` se per-page generate hoti hai
aur `<style nonce>` me inject hoti hai (D-08). Wo file me nahi rehti.

> `blk-` prefix **mandatory** hai. Theming API (§6.4) isi pe khadi hai — client theme
> tabhi override kar sakta hai jab class names stable aur predictable hon.

### 11.3 Public site theme (client repo)

```
client-acme/theme/
├─ tokens.css              brand colours, fonts — DEFAULTS
├─ base.css
└─ components/Header.css, Footer.css
```

Yahan ek zaroori detail hai — **order**:

```html
<link href="/theme/tokens.css">          <!-- 1. defaults -->
<style nonce>:root{--brand:#0e7c7b}</style>  <!-- 2. settings se, RUNTIME -->
```

Settings wala **baad me** aana chahiye, warna admin se brand colour badalne pe kuch
nahi hoga.

### 11.4 Rules

| Rule | Kyun |
|---|---|
| Har component ka apna class prefix — `ab-`, `menu-`, `blk-` | Classes global hain; prefix hi collision rokta hai |
| Colours/spacing hamesha `var(--token)` se, hardcoded nahi | Client ka brand ek jagah se badle |
| Component delete → uski CSS bhi delete | Orphan CSS nahi bachegi |
| Naya shared style → `primitives.css`, component me nahi | `.btn` 10 jagah duplicate na ho |
| Frozen design ki value badalni ho → pehle poochho | Design spec hai (D-28, rule 8) |
