# AURA & CO — Deployment & Operations Notes

## Infrastructure

- **Proxmox host**: `pve1`, internal network, reachable at `10.5.100.10` (root SSH).
- **Container**: LXC `118` named `auraco`, storage backend `local-lvm`.
  - **Node.js 22**, **PostgreSQL 15** (database `auraco`, role `auraco_app` — owns all 17 tables), **PM2** (global) are installed on the container.
  - **Staging**: source at `/var/www/auraco-app-staging` — nginx port `8080` reverse-proxies to `aura-web-staging` (Next.js `next start`, port `3101`); its own Express API is `aura-api-staging` (port `4001`).
  - **Production**: source at `/var/www/auraco-app` — nginx port `80` reverse-proxies to `aura-web` (port `3100`); its Express API is `aura-api` (port `4000`). Publicly exposed at **https://aura.maxmin.vn** via a Cloudflare Tunnel pointed at container 118 port 80.
  - Staging and production currently **share one Postgres database** (`auraco`) — this is a demo/personal project, not yet worth splitting. Revisit if real customer data ever needs isolating from test data.
  - All 4 processes run under **PM2** via `/var/www/ecosystem.config.js` (also committed to the repo root as `ecosystem.config.js`), started with `pm2 start ecosystem.config.js --only <names>` and persisted with `pm2 save`.
- **GitHub repo**: `trancongthangvn/auraco` (remote origin has no embedded token; commit author configured **locally** as `ALODEV <hello.alodev@gmail.com>` — do not commit as "Claude").
- **Reference architecture container**: LXC `114` (`vaithaihoa`, a different live business site) — read-only architecture reference used when designing the real backend. Its stack: Express (raw `pg`, no ORM) + PostgreSQL + JWT auth (bcrypt + jsonwebtoken) + multer/sharp uploads, PM2, Next.js `rewrites()` proxying `/api/*`/`/uploads/*` to the Express API. No PayPal/Cash App/Zelle code there (only COD/bank-transfer) — those were designed from scratch for AURA & CO.

## Standing deploy rule

**Always deploy to staging first. Only promote to production after the user explicitly confirms ("chốt", "ổn rồi", "đẩy lên production luôn").** Never skip straight to production, even for small fixes — a critical bug (see gotcha #5 below) was only caught because staging was checked first.

## Architecture

Real backend, not static export. Two independent layers per environment:

1. **Express API** (`server/`) — raw `pg`, JWT auth (`jsonwebtoken` + `bcryptjs`), file uploads (`multer` + `sharp`), one route file per resource domain under `server/routes/`. Reads `server/.env` (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGINS`) via `dotenv`.
2. **Next.js app** (`app/`, `components/`, `lib/`) — `next start` (no `output: "export"` anymore). `next.config.ts` has a `rewrites()` that proxies `/api/*` and `/uploads/*` to the Express API's `API_URL` (read from `.env.local` at the Next.js project root, e.g. `API_URL=http://localhost:4000`). Browser code uses `lib/api.ts`'s `apiFetch()` (relative paths, relies on the rewrite). Server Components use `lib/server-api.ts`'s `serverApiFetch()` (calls `API_URL` directly, since SSR has no browser origin to be "same-origin" relative to).

## Deploy pipeline (real backend, current state)

```bash
# 1. Build & verify locally first
cd /Users/Shared/CODE/aura-co-jewelry
npx eslint . && npx tsc --noEmit && npm run build   # must all be clean

# 2. Ship source (NOT node_modules/.next/out/.env*) to the host, then into the container
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'out' --exclude '.git' \
  --exclude 'server/node_modules' --exclude 'server/uploads' --exclude '*.env' \
  -e "ssh root@10.5.100.10" . root@10.5.100.10:/tmp/auraco-src/
ssh root@10.5.100.10 "cd /tmp/auraco-src && tar -czf /tmp/auraco-src.tar.gz . && rm -rf /tmp/auraco-src"
ssh root@10.5.100.10 "pct push 118 /tmp/auraco-src.tar.gz /tmp/auraco-src.tar.gz && \
  pct exec 118 -- bash -c 'tar -xzf /tmp/auraco-src.tar.gz -C /var/www/auraco-app-staging && rm /tmp/auraco-src.tar.gz' && \
  rm /tmp/auraco-src.tar.gz"

# 3. Install deps + BUILD IN PLACE on the container (do not rebuild locally and copy .next — see gotcha #5)
ssh root@10.5.100.10 "pct exec 118 -- bash -c 'cd /var/www/auraco-app-staging && npm ci && npm run build'"
ssh root@10.5.100.10 "pct exec 118 -- bash -c 'cd /var/www/auraco-app-staging/server && npm ci'"

# 4. Restart the STAGING PM2 processes
ssh root@10.5.100.10 "pct exec 118 -- pm2 restart aura-web-staging aura-api-staging"

# 5. Verify staging (curl + browser incl. mobile viewport + console errors), get user confirmation

# 6. Only on explicit confirmation, promote to production:
#    copy the STAGING SOURCE (not the built .next) into production, preserving production's own
#    server/.env and .env.local (different ports!), then REBUILD IN PLACE for production too:
ssh root@10.5.100.10 "pct exec 118 -- bash -c '
  cp /var/www/auraco-app/server/.env /tmp/prod-server.env.bak &&
  cp /var/www/auraco-app/.env.local /tmp/prod-nextapp.env.local.bak &&
  rm -rf /var/www/auraco-app/* &&
  cp -a /var/www/auraco-app-staging/. /var/www/auraco-app/ &&
  cp /tmp/prod-server.env.bak /var/www/auraco-app/server/.env &&
  cp /tmp/prod-nextapp.env.local.bak /var/www/auraco-app/.env.local &&
  rm /tmp/prod-server.env.bak /tmp/prod-nextapp.env.local.bak &&
  cd /var/www/auraco-app && npm run build
'"
ssh root@10.5.100.10 "pct exec 118 -- pm2 restart aura-api aura-web"

# 7. Verify production (curl both LAN IP and https://aura.maxmin.vn, browser check, mobile viewport)
```

## Environment files (never committed — see `.gitignore`)

Each environment needs its own pair, written directly on the container (never via git):

- `server/.env`: `DATABASE_URL=postgres://auraco_app:<password>@localhost:5432/auraco`, `JWT_SECRET=<random>`, `PORT=4000` (prod) / `4001` (staging), `CORS_ORIGINS=http://10.5.100.118:8080,https://aura.maxmin.vn`.
- `.env.local` (Next.js project root): `API_URL=http://localhost:4000` (prod) / `http://localhost:4001` (staging).
- `server/.env.example` **is** committed (placeholder values only) — documents the required variable names.

## Hard-learned gotchas

1. **Never author nginx or any multi-line remote config file through a nested SSH heredoc** (`ssh ... "pct exec ... bash -c 'cat > f <<EOF ... EOF'"`) — the outer local shell strips `$variables` before the remote heredoc ever sees them. Always `Write` the config locally, then `scp`/`pct push` it in verbatim.
2. If creating a new LXC ever comes up again: use `local-lvm` storage, not any NTFS-backed `dir` storage (`mkfs.ext4` hangs forever on NTFS-backed images).
3. Fresh Debian containers may have **no UTF-8 locale generated**, which makes a freshly-`apt install`ed PostgreSQL default new databases to `SQL_ASCII` encoding — silently corrupts Vietnamese text. Always: `apt-get install locales`, uncomment `en_US.UTF-8 UTF-8` in `/etc/locale.gen`, `locale-gen`, then explicitly `CREATE DATABASE ... ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8'` — never rely on the cluster default.
4. **Postgres NUMERIC columns come back as JS strings** via `node-postgres` (`pg`), not numbers (SMALLINT/INTEGER columns are fine, they come back as real numbers). Any frontend code calling `.toFixed()` on a value straight from the API must `Number(...)` it first. This caused a full checkout-page crash in production (fixed in commit `275f90b`) — grep for `.toFixed(` after touching any price/money field and confirm the value was actually converted upstream (check `lib/catalog-mappers.ts`'s `toFullProduct` for the established pattern).
5. **Next.js bakes `rewrites()` destinations into the build output at `next build` time** — copying an already-built `.next` folder from one environment to another (e.g. staging → production) carries over the OLD environment's `API_URL`, even after you fix `.env.local` in the new location. Symptom: the app *looks* fine and serves 200s, but every `/api/*` call silently reaches the wrong backend process. Always `npm run build` **in place**, after `.env.local` is already correct for that environment — never just `cp -a` a prebuilt app between environments with different `API_URL`/`PORT` values. (Verify by comparing `curl` uptime from `/api/health` hit directly on the target port vs. hit through the Next.js rewrite — they should match.)
6. Git commit author for this repo is configured **locally** (not globally) to `ALODEV <hello.alodev@gmail.com>` — never commit as "Claude".
7. **A `curl` 200 does not mean the page renders.** The entire `/catalog` tree once shipped to production returning HTTP 200 with a full 51KB of correct HTML, while every visitor saw a blank page: `<main>` contained only `<!--$?--><template id="B:0"></template>` and the real markup sat unreachable in a `<div hidden id="S:0">`. Cause: `CatalogClient` called `useSearchParams()`, which forces the component behind a `<Suspense>` boundary, and that boundary never resolved client-side. Fix: read `?brand=`/`?q=` from the page's server-side `searchParams` prop and pass them down, so no boundary is needed. **Never introduce `useSearchParams()` in this codebase** — take the value as a prop from the server component instead. To detect this class of bug, check the rendered DOM (`document.querySelector('main').getBoundingClientRect().height` must be > 0, and count *visible* product links), not the HTTP status.
8. **The in-app Browser pane does not composite frames**, so it lies in both directions and must not be trusted for visual QA: screenshots time out, lazy-loaded images never load (`img.complete` stays false forever — looks like every image is broken), and `sizes`-based `srcset` resolves to the largest candidate (`w=3840`), which reads as a performance bug that isn't real. It also reported the catalog blanking correctly, but for the wrong reason, so it could not be told apart from its own false positives. **Verify anything visual in the user's real Chrome** via the `claude-in-chrome` MCP (`select_browser` → `tabs_context_mcp` → `navigate` → `javascript_tool`); set `img.loading='eager'` before measuring, because a background tab will not load lazy images either.
9. **`next start` silently keeps serving the old build if the port is taken.** `pkill -f "next start"` does not reliably kill node on Windows/Git Bash, so the previous server survives, the new one fails to bind and dies, and you end up verifying a stale build and drawing the wrong conclusion. Start each local verification run on a **fresh port** and confirm the new build is actually being served (grep the response for a string that only exists in the new code) before trusting any result.
10. **Seed data reaches customers.** `data/admin.ts` → `paymentMethodSettings[].label` is inserted verbatim by `server/seed.js` into `payment_method_settings.label`, which `/api/payment-methods` serves straight to the customer-facing checkout. A Vietnamese label there appears on the English storefront — the `card` method shipped as "Thẻ tín dụng / ghi nợ". The sibling `.detail` field *is* admin-only (CheckoutClient renders it only for cashapp/zelle). Treat anything in `data/admin.ts` that ends up in a `label` column as customer-facing English. Fixing the seed file only affects future seeds: an already-seeded database needs an `UPDATE` (or an edit via the admin UI), and because staging and production share one database that single `UPDATE` fixes both with no rebuild.
11. **`images.unoptimized` was a leftover from the old static export.** It is now off, so Next optimizes images (a 1.8MB source PNG serves as a 27KB AVIF). Two consequences: (a) any absolute *external* image URL in the database will throw at render and 500 that page unless its host is in `next.config.ts`'s `remotePatterns` — the admin's paste-URL field is therefore restricted to same-origin paths; (b) every `next/image` whose `src` may be empty (a product saved without images, a collection with no `image_url`) must be guarded with `{src && <Image .../>}`, otherwise it renders as a broken-image icon.

## Payment methods

Card/PayPal are structurally supported by the schema but not wired to a real gateway. Cash App and Zelle use a **manual confirmation** flow: customer sees a QR + admin-configured detail text, pays externally, uploads a proof-of-payment image (`POST /api/orders/:id/payment-proof`), and an admin reviews/marks the transaction paid in `/admin/payments`. Real PayPal/Apple Pay integration requires the user's own PayPal Business API credentials (Claude cannot create or hold financial credentials) and is deferred.

## Reference-site parity: decisions on record

The clone is measured against <https://auracojewelry.com>. These calls were made deliberately — don't re-litigate them without a reason.

- **Measure, don't eyeball.** All parity work was done by reading `getComputedStyle` / `getBoundingClientRect` on the live site, because screenshots were unavailable. Numbers below are measured, not guessed.
- **The logo is a text wordmark**, not an image: "AURA & CO" in Cormorant Garamond, 27px, weight 400, `#2b261f`. The clone previously used a square badge image.
- **The footer is light**: white background, ink text, two link columns (Shop, Policies) plus the newsletter. The clone previously had a dark three-column footer.
- **`.page-head__title` is one class with two different styles** depending on template. Regular pages (About/Contact): Cormorant Garamond 38px/400, not uppercase, `letter-spacing: 0.76px`, `text-align: start`. Auth pages (login/register): sans 19px/500, uppercase, `letter-spacing: 1.52px`. Hence the `compact` prop on `PageHero` — a single variant cannot serve both.
- **Auth form styling** is deliberately unlike the rest of the site: inputs are underline-only (`border-bottom: 1px solid #d4d4d4`, no box, no radius) with non-uppercase 14px labels, and the submit / Google buttons are full pills (`border-radius: 999px`, 10px/600 uppercase, `letter-spacing: 0.35px`, black background).
- **`Jost` is declared but never loaded.** The live site sets `font-family: Jost, sans-serif` on nav and auth headings, but its Google Fonts link only pulls Cormorant, Cormorant Garamond and Source Sans 3 — so it renders as the browser's default sans. That is their bug, not a design intent: match the metrics with our existing Source Sans 3, do **not** add a Jost webfont.
- **Their checkout is Shopify-hosted** and redirects off-domain once the cart has items, so it cannot and should not be pixel-cloned. Our custom checkout keeps its own Contact / Delivery / Shipping / Payment / Order-summary structure.
- **Legal copy is written from scratch, structure-matched only.** Their privacy/return/security/terms pages use "spiritual / consecration / blessing gemstone" marketing prose. Copying it verbatim is a copyright problem and clashes with our brand voice ("modern everyday jewelry"). We match section structure and headings, never the prose.
- **We did not replicate their bugs.** Their terms-of-service page is a verbatim duplicate of their return policy; ours has real, distinct ToS content.
- **We did not copy their support email.** `auraco.jewelry.us@gmail.com` is a live business inbox — putting it in the clone would misdirect real customer mail. The legal pages use a placeholder. **Open:** whoever owns this project's real contact address needs to supply it.

## Mobile (375px) — what has and has not been checked

Re-run against **production** after the final merge, at a 375×812 viewport.

**Verified — no horizontal overflow anywhere.** `document.documentElement.scrollWidth === 375` on all nine pages checked: `/`, `/catalog`, `/product/[slug]`, `/checkout`, `/login`, `/register` and all four legal pages. The catalog grid drops to two columns (151.5px each). This is pure layout arithmetic, which the Browser pane measures correctly even though it cannot composite.

Elements that *do* extend past the viewport are inside their own horizontal scrollers — the press-logo marquee track and the `w-[260px]` product-carousel cards — which is intended and does not scroll the page.

**Found — small tap targets.** Not blocking, but worth fixing when auth/checkout are next touched:

| Page | Element | Size |
|---|---|---|
| `/checkout` | consent checkbox | 13×13 |
| `/checkout` | payment-method radio | 13×13 |
| `/login` | "remember me" checkbox | 13×13 |
| `/login`, `/register` | email / password inputs | 28px tall |

13px controls on a checkout consent and payment selector are hard to hit on a phone (~44px is the usual target). The 20px text links and the 14px announcement-bar dismiss button are normal for their type.

**Still NOT verified — responsive image selection on mobile.** At 375px the pane reports `currentSrc` as `w=3840` for *every* image, including ones with correct `sizes` (`260px`, `(min-width: 640px) 33vw, 50vw`) rendering into 164–327px boxes. This is a pane artifact, not a real finding: in real Chrome at 2560px the same images correctly resolve to `w=1080`. But real Chrome could not be driven to a mobile viewport here (`resize_window` reports success while `outerWidth` stays 0 and `innerWidth` stays 2560), so **which candidate a real phone picks at 375px is genuinely unknown**. Check this on an actual device or with proper DevTools device emulation before claiming mobile image performance is fine.

**Also still not verified:** spacing and visual rendering on mobile, for the same reason — no environment here can both emulate a phone viewport and composite frames.

## Known open items

- Responsive image selection and visual spacing at mobile widths (above).
- The contact address placeholder — the project owner needs to supply the real address for the legal pages.
