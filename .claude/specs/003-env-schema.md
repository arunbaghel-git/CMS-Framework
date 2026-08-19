# 003 — Environment schema

**Status:** 🟡 Draft — approval chahiye
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
| Var | Type | Default | Required |
|---|---|---|---|
| `NODE_ENV` | `development\|production\|test` | `development` | ✅ |
| `PORT` | number | `4000` | — |
| `SITE_URL` | url | — | ✅ |
| `ADMIN_URL` | url | `${SITE_URL}/admin` | — |
| `LOG_LEVEL` | `debug\|info\|warn\|error` | `info` | — |

`SITE_URL` canonical URL hai — redirects, sitemap, OG tags, aur CORS allowlist sab isi se.

### Database
| Var | Type | Required |
|---|---|---|
| `MONGODB_URI` | string | ✅ |
| `MONGODB_DB_NAME` | string | ✅ |

Per-client alag DB name (D-01). Shared cluster, alag database.

### Auth
| Var | Type | Required | Note |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | string, min 32 | ✅ | **har client ka alag** |
| `JWT_REFRESH_SECRET` | string, min 32 | ✅ | **har client ka alag** |
| `ACCESS_TOKEN_TTL` | string | — | default `15m` |
| `REFRESH_TOKEN_TTL` | string | — | default `7d` |
| `COOKIE_SECURE` | boolean | — | prod me `true` (`__Host-` ke liye zaroori) |
| `COOKIE_DOMAIN` | string | — | same-origin me usually khaali |

> **Shared secret kabhi nahi.** Ek client ka leak = sab clients ka compromise.

### Media
| Var | Type | Required |
|---|---|---|
| `STORAGE_DRIVER` | `local\|s3` | ✅ |
| `UPLOAD_DIR` | path | `local` pe ✅ |
| `S3_ENDPOINT` | url | `s3` pe ✅ |
| `S3_BUCKET` | string | `s3` pe ✅ |
| `S3_REGION` | string | `s3` pe ✅ |
| `S3_ACCESS_KEY` | string | `s3` pe ✅ |
| `S3_SECRET_KEY` | string | `s3` pe ✅ |
| `CDN_BASE_URL` | url | — |
| `MAX_UPLOAD_MB` | number | default `20` |

Conditional validation: `STORAGE_DRIVER=s3` hone pe S3 wale saare required ho jaate hain.

### Next.js / revalidation
| Var | Type | Required |
|---|---|---|
| `REVALIDATE_SECRET` | string, min 32 | ✅ |
| `NEXT_PUBLIC_SITE_URL` | url | ✅ |
| `NEXT_PUBLIC_API_URL` | url | ✅ |

`REVALIDATE_SECRET` ke bina webhook ek public cache-purge endpoint hai.

### Mail
| Var | Required |
|---|---|
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | ✅ (password reset ke liye) |
| `MAIL_FROM` | ✅ |

### Observability
| Var | Required |
|---|---|
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

- [ ] `packages/shared/src/env.js` — poora Zod schema, conditional rules ke saath
- [ ] Boot pe validation, missing var pe saaf error + exit
- [ ] `.env.example` schema se generated
- [ ] `STORAGE_DRIVER=s3` pe S3 vars conditionally required
- [ ] Secrets logger me redacted
- [ ] Test: missing required var pe boot fail ho
- [ ] Docs: `06-OPERATIONS.md` §4 sync

---

## Open questions

1. **`SITE_URL` aur `NEXT_PUBLIC_SITE_URL` alag rakhein ya ek?** Same-origin setup me
   dono same honge. **Recommendation:** ek rakho (`SITE_URL`), Next wala usse derive kare.
2. **Redis kab aayega?** Abhi cache Next ISR hai (D-14), Redis Phase 7+ me BullMQ ke
   saath. Tab `REDIS_URL` add hoga.
3. **Multi-instance me rate limiter shared store?** Ek instance per client hai, isliye
   in-memory chalega. Agar kabhi horizontal scale karein to Redis chahiye.
