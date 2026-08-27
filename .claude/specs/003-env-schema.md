# 003 — Environment schema

**Status:** ✅ Implemented — 20 Aug 2026
**Phase:** 0
**Blocks:** App boot, aur D-15 ka client-repo contract
**Related:** D-15, `06-OPERATIONS.md` §4

---

## Problem

Env vars kahin define nahi hain. Ye core packages aur client repo ke **beech ka
interface** hai — bina define kiye `.env` 6 mahine me jo bhi accumulate ho gaya wahi
ban jaayega, aur har client thoda alag hoga.

## Scope me hai

- Saare env vars, unke types aur defaults
- Boot pe Zod validation — **missing var pe app start hi na ho**
- `.env.example` jo client repo generator use karega

## Scope me nahi

- Secret management tooling (Vault, etc.) — abhi `.env` files kaafi hain
- Per-environment config files — env vars hi single mechanism rahenge

---

## Proposed schema

### Core

| Var         | Type                            | Default             | Required |
| ----------- | ------------------------------- | ------------------- | -------- |
| `NODE_ENV`  | `development\|production\|test` | `development`       | ✅       |
| `PORT`      | number                          | `4000`              | —        |
| `SITE_URL`  | url                             | —                   | ✅       |
| `ADMIN_URL` | url                             | `${SITE_URL}/admin` | —        |
| `EXTRA_CORS_ORIGINS` | comma se alag origins | — | — |
| `LOG_LEVEL` | `debug\|info\|warn\|error`      | `info`              | —        |

`SITE_URL` canonical URL hai — redirects, sitemap, OG tags, aur CORS allowlist sab isi se.

**`EXTRA_CORS_ORIGINS`** (27 Aug) — CORS allowlist me aur origins jodne ke liye, comma se
alag. `SITE_URL` ko list nahi banaya ja sakta kyunki wo revalidate webhook ka **target**
bhi hai (`core/revalidate.js`). Asli setup me site kai origins se khulti hai: tunnel (demo),
LAN ka IP (mobile pe test), staging ka preview domain. Iske bina wo har case me login
**500** deta tha aur wajah kahin nahi dikhti thi.

`*` jaan-boojh kar support nahi hai — cookies `credentials: true` ke saath jaati hain, aur
wildcard + credentials ka matlab hai kisi bhi site ka JS aapke admin ki taraf se request
bhej sake (D-12).

### Database

| Var               | Type   | Required |
| ----------------- | ------ | -------- |
| `MONGODB_URI`     | string | ✅       |
| `MONGODB_DB_NAME` | string | ✅       |

Per-client alag DB name (D-01). Shared cluster, alag database.

### Auth

| Var                  | Type           | Required | Note                                       |
| -------------------- | -------------- | -------- | ------------------------------------------ |
| `JWT_ACCESS_SECRET`  | string, min 32 | ✅       | **har client ka alag**                     |
| `JWT_REFRESH_SECRET` | string, min 32 | ✅       | **har client ka alag**                     |
| `ACCESS_TOKEN_TTL`   | string         | —        | default `15m`                              |
| `REFRESH_TOKEN_TTL`  | string         | —        | default `24h` — bina "Remember me" (D-38)  |
| `REFRESH_TOKEN_TTL_REMEMBER` | string | —      | default `7d` — "Remember me" tick hone pe   |
| `COOKIE_SECURE`      | boolean        | —        | prod me `true` (`__Host-` ke liye zaroori) |
| `COOKIE_DOMAIN`      | string         | —        | same-origin me usually khaali              |

> **Shared secret kabhi nahi.** Ek client ka leak = sab clients ka compromise.

### Media

| Var              | Type        | Required      |
| ---------------- | ----------- | ------------- |
| `STORAGE_DRIVER` | `local\|s3` | ✅            |
| `UPLOAD_DIR`     | path        | `local` pe ✅ |
| `S3_ENDPOINT`    | url         | `s3` pe ✅    |
| `S3_BUCKET`      | string      | `s3` pe ✅    |
| `S3_REGION`      | string      | `s3` pe ✅    |
| `S3_ACCESS_KEY`  | string      | `s3` pe ✅    |
| `S3_SECRET_KEY`  | string      | `s3` pe ✅    |
| `CDN_BASE_URL`   | url         | —             |
| `MAX_UPLOAD_MB`  | number      | default `20`  |

Conditional validation: `STORAGE_DRIVER=s3` hone pe S3 wale saare required ho jaate hain.

### Next.js / revalidation

| Var                    | Type           | Required |
| ---------------------- | -------------- | -------- |
| `REVALIDATE_SECRET`    | string, min 32 | ✅       |
| `NEXT_PUBLIC_SITE_URL` | url            | ✅       |
| `NEXT_PUBLIC_API_URL`  | url            | ✅       |

`REVALIDATE_SECRET` ke bina webhook ek public cache-purge endpoint hai.

### Mail

| Var                                             | Required                    |
| ----------------------------------------------- | --------------------------- |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | ✅ (password reset ke liye) |
| `MAIL_FROM`                                     | ✅                          |

### Observability

| Var          | Required            |
| ------------ | ------------------- |
| `SENTRY_DSN` | — (prod me chahiye) |

---

## Implementation notes

- Schema `packages/shared/src/env.js` me — Zod se
- **Boot pe validate**, `index.js` ki pehli line pe. Missing var pe saaf error aur
  `process.exit(1)` — runtime pe fail hona nahi chahiye
- Error message me batao **kaunsa var missing hai aur kya expected tha**
- `.env.example` isi schema se generate ho, taaki drift na ho
- Secrets kabhi log mat karo — logger me redact list

---

## Acceptance criteria

- [x] Poora Zod schema, conditional rules ke saath — ⚠️ **`apps/api/src/core/env.js` me,
      `packages/shared` me nahi** (niche dekho)
- [x] Boot pe validation, missing var pe saaf error + exit
- [x] `.env.example` maujood hai — abhi haath se maintain hoti hai, generate nahi hoti
- [x] `STORAGE_DRIVER=s3` pe S3 vars conditionally required
- [x] Secrets logger me redacted (`REDACTED_KEYS`)
- [ ] Test: missing required var pe boot fail ho — **abhi nahi likha**
- [ ] Docs: `06-OPERATIONS.md` §4 sync

### Spec se do farq (jaan-boojh kar nahi, dhyan me rakho)

1. **Schema `apps/api` me hai, `packages/shared` me nahi.** `loadEnv()` boot pe
   `process.exit(1)` karta hai — wo server ka behaviour hai, shared package ka nahi
   (admin browser me chalta hai, wahan `process` hai hi nahi). Client repo ko env
   contract chahiye hoga (D-15) tab ise shift karna pad sakta hai.
2. **`.env.example` schema se generate nahi hoti** — dono haath se sync rehte hain,
   yaani drift ka raasta khula hai. Ek chhota generator script isse band kar dega.

### 20 Aug me kya juda

- `.env` file ab **load bhi hoti hai** — pehle koi loader tha hi nahi (D-33)
- `SEED_ADMIN_EMAIL` · `SEED_ADMIN_PASSWORD` · `SEED_ADMIN_NAME` (spec 004 ke liye)
- `SEED_ADMIN_PASSWORD` `REDACTED_KEYS` me hai

---

## Open questions

1. **`SITE_URL` aur `NEXT_PUBLIC_SITE_URL` alag rakhein ya ek?** Same-origin setup me
   dono same honge. **Recommendation:** ek rakho (`SITE_URL`), Next wala usse derive kare.
2. **Redis kab aayega?** Abhi cache Next ISR hai (D-14), Redis Phase 7+ me BullMQ ke
   saath. Tab `REDIS_URL` add hoga.
3. **Multi-instance me rate limiter shared store?** Ek instance per client hai, isliye
   in-memory chalega. Agar kabhi horizontal scale karein to Redis chahiye.
