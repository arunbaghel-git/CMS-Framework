# 06 — Operations

Core code kaise distribute hota hai, client instance kaise khada hota hai, aur update
kaise pahunchta hai. **Project ka sabse zaroori structural hissa yahi hai** —
[`03-DECISIONS.md`](03-DECISIONS.md) D-15 dekho.

---

## 1. Do repo, do kaam

```
┌─────────────────────────────────────────────────────────────┐
│  CORE REPO (ek, private)                                    │
│  apps/ + packages/ + migrations/                            │
│                                                             │
│  publish karta hai:                                         │
│    @cms/api   @cms/admin   @cms/web   @cms/blocks  @cms/shared │
└────────────────────────┬────────────────────────────────────┘
                         │  npm registry (private)
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ client-acme  │ │ client-sharma│ │ client-mocha │
│ theme/       │ │ theme/       │ │ theme/       │
│ blocks/      │ │ blocks/      │ │ blocks/      │
│ .env         │ │ .env         │ │ .env         │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Client repo — bas itna

```
client-acme/
├─ package.json          # @cms/* ki PINNED versions
├─ .env                  # DB, domain, secrets
├─ theme/                # tokens, template components, CSS
│  ├─ tokens.css
│  ├─ locations.js       # theme kaunse menu locations declare karta hai
│  └─ overrides/         # registry.override() se block overrides
├─ blocks/               # sirf is client ke custom blocks
├─ migrations/           # sirf client-specific data fixes
└─ Dockerfile
```

Core code client repo me **kabhi nahi** aata. Agar aana pade, to wo ek signal hai ki
core me extension point missing hai — usse core me add karo, fork mat banao.

### Kyun ye zaroori hai

`themes/<client>/` core repo ke andar rakhne ka matlab hai **fork per client**. 12 client
= 12 fork = har security fix 12 baar cherry-pick. Agency frameworks isi tareeke se marte
hain.

---

## 2. Versioning

Core packages **semver** follow karte hain:

| Change                                              | Version               | Matlab                    |
| --------------------------------------------------- | --------------------- | ------------------------- |
| Bug fix, koi API change nahi                        | patch `2.4.1 → 2.4.2` | Bina soche upgrade karo   |
| Naya block, naya field type, naya endpoint          | minor `2.4.x → 2.5.0` | Safe, par changelog padho |
| Schema change, block `type` semantics, breaking API | major `2.x → 3.0.0`   | **Migration zaroori**     |

**Rule:** breaking change ke saath hamesha migration ship karo. "User khud fix kar lega"
ek option nahi hai — 15 instances hain.

Har instance ko ye pata hona chahiye ki wo kis version pe hai, aur ye ek query se
answerable ho: **kaunsa client kis core version pe hai.** Ye admin ke Dashboard →
Site Health card me bhi dikhta hai.

---

## 3. Migrations — do alag system

### 3.1 Schema / data migrations

```
migrations/
├─ 001-initial-seed.js
├─ 002-add-path-field.js
├─ 003-backfill-search-text.js
└─ 004-menus-to-locations.js
```

| Property        | Rule                                                      |
| --------------- | --------------------------------------------------------- |
| Kab chalti hain | Deploy step pe, app boot se **pehle**                     |
| Record kahan    | `migrations` collection — `name`, `appliedAt`, `checksum` |
| Order           | Numbered, strictly sequential                             |
| Idempotent      | Dobara chalne pe kuch na bigde                            |
| Rollback        | Har migration ke saath `down()` likho                     |

Command: `pnpm cms migrate` · status: `pnpm cms migrate:status`

> ⚠️ **Jo migration `settings` seedha badalti hai, uske baad web ka cache purana rehta hai** — migration
> revalidate webhook nahi chalati. **030** (D-120, `searchEngineVisible`) ke baad admin me **Settings ▸ SEO & Schema
> pe ek baar Save** dabao; bina uske `/robots.txt` aur pages ka `noindex` purani value pe atke rehte hain.
> 24 Sep se topbar ka **⟳ Cache** (D-121) yahi kaam seedha karta hai — migration ke baad ek click.

### 3.1a Admin bahar reh gaya — `pnpm cms reset-password <email>` (D-110, 23 Sep)

Login ka `Lost your password?` administrator ko mail bhejta hai. Wo kaam **nahi** karta jab SMTP
toota ho (App Password badla, account band) ya admin ka mailbox hi na rahe. Tab server pe:

```bash
pnpm cms reset-password admin@site.com
```

- Ek **temporary password** terminal pe chhapta hai; login karte hi admin panel naya password maangta
  hai (`mustChangePassword`)
- Us user ke saare session band, aur account `inactive` tha to `active`
- **Kisi bhi role** pe chalta hai — server ka access waise bhi sab kuch hai
- Koi route nahi hai, jaan-boojh kar — sirf wahi chala sakta hai jiske paas hosting ka access hai

⚠️ Terminal ki history me temporary password bachta hai — isliye wo pehle login pe hi badalna padta hai.

### 3.2 Block-tree migrations

Ye alag isliye hain ki **ek page ka `content.version` v1 pe ho sakta hai jab site v4 pe
hai** — page 2 saal se edit hi nahi hua.

| Property        | Rule                                                  |
| --------------- | ----------------------------------------------------- |
| Kab chalti hain | Read pe **lazily**, aur ek batch job se background me |
| Scope           | Per-document, per-version                             |
| Idempotent      | Zaroori — ek hi document pe kai baar chal sakti hai   |
| Registry        | `migrations/blocks/v1-to-v2.js` — `type` ke hisaab se |

```js
// concept
function migrateTree(content) {
  while (content.version < CURRENT_BLOCK_VERSION) {
    content = blockMigrations[content.version](content)
  }
  return content
}
```

**Rule:** block ka `type` string kabhi rename mat karo — wo DB me stored data hai.
Rename karna hai to migration likho (D-05).

### 3.3 contentType field delete

Admin jab kisi contentType se field hataye, to define karo ki kya hota hai —
orphan data rehta hai ya purge hota hai. Bina is rule ke admin **ek click me 400 entries
ka data uda dega**.

---

## 4. Environment schema

Ye core aur client repo ke beech ka **contract** hai. Boot pe Zod se validate ho —
missing var pe app start hi na ho, runtime pe fail na kare.

```
# Core
NODE_ENV                 development | production
PORT
SITE_URL                 https://acme-dental.com    (canonical, redirects ke liye)
ADMIN_URL                ORIGIN hai (path nahi) — CORS allowlist me jaata hai. Dev me
                         http://localhost:5173. Na ho to SITE_URL ka origin. Admin ka
                         path hamesha /admin (code me pakka — vite base + router
                         basename). Password reset ka link = origin + /admin (D-110)

EXTRA_CORS_ORIGINS       optional, comma se alag — CORS allowlist me aur origins

# Database
MONGODB_URI              per-client alag database
MONGODB_DB_NAME

# Auth
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
COOKIE_DOMAIN
COOKIE_SECURE            prod me true (__Host- prefix ke liye zaroori)

# Media
STORAGE_DRIVER           local | s3
S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY
CDN_BASE_URL

# Next.js
REVALIDATE_SECRET        webhook ke liye shared secret
NEXT_PUBLIC_SITE_URL

# Mail — ⚠️ ab ye sirf FALLBACK hain (D-108, 22 Sep)
# Asli jagah admin panel hai: Settings ▸ Email / SMTP (settings.mail).
# DB me value ho to wahi chalti hai; khaali khaane hi env se bharte hain,
# aur wo KHAANA-DAR-KHAANA hota hai (host DB se aur user env se aa sakta hai).
# Naye instance pe inhe set karna ZAROORI NAHI — client screen se bhar dega.
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
MAIL_FROM

# Observability
SENTRY_DSN
LOG_LEVEL
```

> Ye list abhi **draft** hai — Phase −1 me isse finalize karna hai
> ([`09-OPEN-ITEMS.md`](09-OPEN-ITEMS.md)). Authoritative schema
> [`specs/003-env-schema.md`](../specs/003-env-schema.md) hai.

### 4.0 `EXTRA_CORS_ORIGINS` — jab admin kisi teesre origin se khule (27 Aug)

CORS allowlist `SITE_URL` + `ADMIN_URL` se banti hai. Asli setup me site aksar aur bhi
origins se khulti hai — **tunnel** (demo/share), **LAN ka IP** (mobile pe test),
**staging ka preview domain**, ya CDN ke aage ka host. Unhe `EXTRA_CORS_ORIGINS` me daalo,
comma se alag.

```bash
# apps/api/.env
EXTRA_CORS_ORIGINS=https://abcd-1234.trycloudflare.com,http://192.168.1.7:5173
```

⚠️ **Lakshan pehchano:** origin allowlist me na ho to login **403** deta hai aur message me
**origin ka naam** hota hai — use seedha is var me copy-paste kar do. (27 Aug se pehle wahi
case **500** banta tha aur screen pe sirf "Something went wrong" dikhta tha — configuration
ki galti server crash jaisi lagti thi.)

Do cheezein jaan-boojh kar aisi hain:

- **`SITE_URL` ko list nahi banaya ja sakta** — wo revalidate webhook ka **target** bhi hai
  (`core/revalidate.js`), usme ek hi URL chahiye
- **`*` support nahi hai** — cookies `credentials: true` ke saath jaati hain, aur wildcard +
  credentials ka matlab hai kisi bhi site ka JS aapke admin ki taraf se request bhej sake
  (D-12)

Dev me admin ka Vite server `host: true` pe hai, isliye wo LAN aur tunnel dono se pahunchta
hai. Iske bina tunnel se site chalti hai par admin **502** deta hai.

### 4.1 ⚠️ `apps/web` ki apni `.env` chahiye (Slice 0 se)

Ab tak saari env `apps/api/.env` me thi. Slice 0 ke baad **`apps/web` ko bhi do vars
chahiye**, warna public site ka cache kabhi saaf nahi hoga:

```bash
# apps/web/.env
API_URL=http://localhost:4000     # server components isse SEEDHA call karte hain;
                                  # next.config.js ka /api rewrite sirf browser ke liye hai
REVALIDATE_SECRET=<same as api>   # min 32 chars
```

**`REVALIDATE_SECRET` dono jagah bilkul same hona chahiye.** Do alag failure modes hain
aur dono chup-chaap hote hain:

| Kya | Nateeja |
| --- | --- |
| `apps/web` me set hi nahi | `/api/revalidate` **503** (fail-closed). Cache kabhi saaf nahi hota |
| Dono me alag | API ko **401** milta hai. `revalidateTags()` fail-soft hai, isliye admin ka Save theek dikhta hai par site purani rehti hai |

Dono ka lakshan ek hi hai — _"publish kiya par site update nahi hui"_ — aur koi error
screen pe nahi aata. API ke logs me `Revalidate request rejected/failed` warning milegi;
wahi pehli jagah hai jahan dekhna chahiye.

### 4.2 Dev me mail — MailDev, koi asli account nahi (D-108, 22 Sep)

Mail ka kaam karte waqt **asli SMTP account ki zaroorat nahi hai**. `docker-compose.yml` me
Mongo ke saath **MailDev** hai:

```bash
docker compose up -d maildev     # SMTP :1025, web inbox :1080
```

Phir `Settings ▸ Email / SMTP` me: Host `localhost` · Port `1025` · Username/Password **khaali**
· From Email `cms@test.local` → **Save** → **Send Test Email**. Mail `http://localhost:1080` pe
dikhegi.

| Kyun MailDev, asli account nahi |
| --- |
| Koi signup nahi — Gmail ke App Password ya Brevo ke domain verify ka jhanjhat nahi |
| Internet ke bina chalta hai, aur **ISP ka port 587 block** wala sawaal hi nahi uthta |
| Galti se kisi **asli** address pe mail jaana namumkin hai |

⚠️ **MailDev sirf ye sabit karta hai ki hamara code sahi hai.** Wo ye **nahi** batata ki mail
Gmail ke inbox me jaayegi ya spam me — wo SPF/DKIM/domain reputation ka mamla hai aur sirf asli
provider + asli domain se pata chalta hai.

⚠️ **Test suite MailDev ka istemaal nahi karti** — wahan nodemailer ka `jsonTransport` chalta hai
(`isTest`, wahi rok jo `revalidateTags()` pe hai). Yaani asli SMTP ka raasta **tests se guzarta hi
nahi**; use alag se chala kar dekhna padta hai. D-92 §11 wala hi sabak.

---

## 5. Deployment topology

```
                    ┌──────────────────┐
   Internet ───────>│  Reverse proxy   │   (nginx / Caddy / Traefik)
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        /admin  →      /api  →         /*  →
        admin (static)  api (node)     web (Next.js)
                             │
                             ▼
              ┌──────────────────────────┐
              │  Mongo (shared cluster,  │
              │   per-client database)   │
              └──────────────────────────┘
                             │
                             ▼
                    S3 / R2 + CDN (media)
```

**Same-origin zaroori hai** (D-12): admin `example.com/admin`, API `example.com/api`.
Cross-origin karne pe `SameSite=None` majboori ban jaati hai aur SameSite ka protection
zero ho jaata hai.

**Ek client = ek deployable unit** — ek container image / ek process group, ek version
number. Teen alag services ki tarah deploy mat karo.

**Dev me:** Vite proxy se wahi same-origin setup, `docker compose up` se mongo + api +
admin + web.

---

## 6. Naya client instance khada karna

```bash
npx create-cms-site client-acme        # Phase 8 me banega

# generate hota hai:
#   client repo skeleton (theme/, blocks/, .env.example)
#   pinned @cms/* versions
#   Dockerfile

cd client-acme
cp .env.example .env                   # secrets bharo
pnpm install
pnpm cms migrate                       # schema + seed
pnpm cms seed:admin                    # pehla admin user
pnpm build && pnpm start
```

**Target:** naya client 1 din me spin up ho jaaye, aur baaki din sirf design ka kaam ho.

**Launch checklist** (har naye client pe):

- [ ] `.env` ke saare secrets set, aur **har client ke alag** (shared secret kabhi nahi)
- [ ] `searchEngineVisible = false` staging pe, aur **launch pe true karna yaad**
- [ ] Homepage aur posts page settings me set
- [ ] Default template + header/footer template parts bane
- [ ] Menu banaya aur locations pe assign kiya
- [ ] Media object storage pe ja raha hai (local disk pe nahi)
- [ ] Backup job central system me registered
- [ ] Sentry DSN set, health endpoint respond kar raha hai
- [ ] `robots.txt` aur `sitemap.xml` sahi output de rahe hain
- [ ] Lighthouse SEO ≥ 95 ek published page pe

---

## 7. Core upgrade runbook

```bash
# client repo me
1. Changelog padho — major hai to breaking changes note karo
2. package.json me @cms/* version bump
3. pnpm install
4. staging pe deploy
5. pnpm cms migrate           # schema migrations
6. smoke test (niche wali list)
7. prod pe deploy + migrate
8. block-tree batch migration background me chalne do
```

**Smoke test** (har upgrade ke baad, 5 minute):

- Login hota hai
- Ek page edit karke publish hota hai
- Live site pe wahi dikhta hai (preview vs live)
- Media upload chal raha hai
- Sitemap aur feed valid hain

**Rollback:** version pin wapas purani pe, `migrate:down`, redeploy. Isiliye har
migration ke saath `down()` likhna zaroori hai.

---

## 8. Fleet operations

15 instance ka matlab **15 alag cron job nahi hona chahiye** — wo 15 silent failure
modes hain.

| Concern          | Per-instance ❌                     | Central ✅                          |
| ---------------- | ----------------------------------- | ----------------------------------- |
| Backup           | Har instance pe `mongodump` cron    | Ek scheduler jo saare DBs dump kare |
| Monitoring       | Har instance pe alag Sentry project | Ek Sentry org, per-client tag       |
| Uptime           | Manual check                        | Ek uptime service, saare domains    |
| Version tracking | SSH karke pata karo                 | Ek dashboard: client → core version |
| Log aggregation  | Container logs                      | Central log sink                    |

**Backup rule:** untested backup = no backup. **Restore test** quarterly, ek asli
client DB pe (staging me restore karke).

**Retention:** DB dumps 30 din, media backup 90 din, submissions ka apna TTL
(PII — Phase 7).

---

## 9. Security operations

Poori policy [`02-ARCHITECTURE.md`](02-ARCHITECTURE.md) §8 me. Ops-side ke points:

- **Secrets har client ke alag.** Ek shared `JWT_SECRET` matlab ek client ka leak sab
  clients ka compromise
- **`settings.scripts` (GTM) sirf `admin` role** — ye privilege boundary hai, settings
  field nahi. Editor `<script>` inject kar sake to wo admin ke browser me chalega
- **Revalidate webhook pe shared secret** — warna wo public cache-purge endpoint hai
- **Upload validation** magic-byte level pe, sirf mime header pe bharosa nahi
- **SVG** ya to sanitize ya disallow — uske andar `<script>` chal jaata hai
- **CSP nonce-based**, aur canvas iframe `sandbox` ke saath
- Dependency audit CI me, har week
