# AURA & CO — Deployment & Operations Notes

## Infrastructure

- **Proxmox host**: `pve1`, internal network, reachable at `10.5.100.10` (root SSH).
- **Container**: LXC `118` named `auraco`, storage backend `local-lvm`.
  - **Node.js 22**, **PostgreSQL 15** (database `auraco`, role `auraco_app` — owns all 17 tables), **PM2** (global) are installed on the container.
  - **Staging**: source at `/var/www/auraco-app-staging` — nginx port `8080` reverse-proxies to `aura-web-staging` (Next.js `next start`, port `3101`); its own Express API is `aura-api-staging` (port `4001`).
  - **Production**: source at `/var/www/auraco-app` — nginx port `80` reverse-proxies to `aura-web` (port `3100`); its Express API is `aura-api` (port `4000`). Publicly exposed at **https://aura.maxmin.vn** via a Cloudflare Tunnel pointed at container 118 port 80.
  - Staging and production currently **share one Postgres database** (`auraco`) — this is a demo/personal project, not yet worth splitting. Revisit if real customer data ever needs isolating from test data.
  - All 4 processes run under **PM2** via `/var/www/ecosystem.config.js` (also committed to the repo root as `ecosystem.config.js`), started with `pm2 start ecosystem.config.js --only <names>` and persisted with `pm2 save`.
- **GitHub repo**: `trancongthangvn/auraco` (remote origin has no embedded token; commit author configured **locally** as `ALODEV <hello.alodev@gmail.com>` — do not commit as "Claude"). As of 2026-09-05, **all three of** the local dev machine, `/var/www/auraco-app-staging` and `/var/www/auraco-app` are independent git clones of this same repo (each has its own `.git`, `git remote -v` → `origin` → the GitHub URL). Deploying now means committing + pushing, then pulling on the target environment — see "Deploy pipeline" below. Before that date, the two server directories were plain rsync/tar copies with no version control at all; that gap is exactly what let a fixed bug's old code quietly resurface (nothing recorded which file changed when, so a later manual edit or partial deploy could silently undo an earlier fix with no way to tell).
- **Shared uploads store**: `server/uploads` on both staging and production is a **symlink** to `/var/www/auraco-uploads` (not a real per-environment directory). Staging and production already share one database, but until 2026-09-05 they each had their *own* uploads folder on disk — an admin uploading a product photo on staging wrote the file only to staging's disk while the shared DB row's `/uploads/<file>` path was readable from both, so production 404'd on any image uploaded while working on staging (and vice versa). Symlinking both to one real directory fixed it permanently; the pre-fix originals are kept at `server/uploads.bak-<date>` in each environment (not deleted, just superseded). `.gitignore`'s `server/uploads` entry (no trailing slash) is deliberately written to match a symlink as well as a real directory — a trailing slash only matches real directories and let the symlink show up as an untracked file.
- **Reference architecture container**: LXC `114` (`vaithaihoa`, a different live business site) — read-only architecture reference used when designing the real backend. Its stack: Express (raw `pg`, no ORM) + PostgreSQL + JWT auth (bcrypt + jsonwebtoken) + multer/sharp uploads, PM2, Next.js `rewrites()` proxying `/api/*`/`/uploads/*` to the Express API. No PayPal/Cash App/Zelle code there (only COD/bank-transfer) — those were designed from scratch for AURA & CO.

## Standing deploy rule

**Always deploy to staging first. Only promote to production after the user explicitly confirms ("chốt", "ổn rồi", "đẩy lên production luôn").** Never skip straight to production, even for small fixes — a critical bug (see gotcha #5 below) was only caught because staging was checked first.

## Architecture

Real backend, not static export. Two independent layers per environment:

1. **Express API** (`server/`) — raw `pg`, JWT auth (`jsonwebtoken` + `bcryptjs`), file uploads (`multer` + `sharp`), one route file per resource domain under `server/routes/`. Reads `server/.env` (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGINS`) via `dotenv`.
2. **Next.js app** (`app/`, `components/`, `lib/`) — `next start` (no `output: "export"` anymore). `next.config.ts` has a `rewrites()` that proxies `/api/*` and `/uploads/*` to the Express API's `API_URL` (read from `.env.local` at the Next.js project root, e.g. `API_URL=http://localhost:4000`). Browser code uses `lib/api.ts`'s `apiFetch()` (relative paths, relies on the rewrite). Server Components use `lib/server-api.ts`'s `serverApiFetch()` (calls `API_URL` directly, since SSR has no browser origin to be "same-origin" relative to).

## Deploy pipeline (git-based, current state as of 2026-09-05)

Source of truth is now GitHub (`trancongthangvn/auraco`, branch `main`), not the local
working directory. Every environment — local dev, staging, production — is its own
clone tracking that same `origin`. Deploying is: commit locally → push → pull on the
target environment → rebuild in place → restart. No more tar/rsync/scp of source.

```bash
# 1. Build & verify locally first
cd /path/to/aura-co-jewelry
npx eslint . && npx tsc --noEmit && npm run build   # must all be clean

# 2. Commit and push. NEVER commit as "Claude" — author is configured locally as
#    ALODEV <hello.alodev@gmail.com> (already set on this clone's .git/config).
git add -A
git commit -m "<describe the change>"
git push origin main

# 3. Pull onto staging and rebuild in place.
#    `git reset --hard origin/main` (not `git pull`) is deliberate: the staging/
#    production working trees are pure deploy targets, never hand-edited, so a hard
#    reset that forces the tree to exactly match the commit is safer than a merge —
#    it's also what fixed a real CRLF-vs-LF drift on 4 files the first time these
#    server clones were set up (git reset alone updates HEAD/index but leaves
#    working-tree files as they were, which read as "modified" until force-synced).
ssh root@10.5.100.10 "pct exec 118 -- bash -c '
  cd /var/www/auraco-app-staging &&
  git fetch origin main &&
  git reset --hard origin/main &&
  npm ci && npm run build &&
  cd server && npm ci
'"

# 4. Restart the STAGING PM2 processes
ssh root@10.5.100.10 "pct exec 118 -- pm2 restart aura-web-staging aura-api-staging"

# 5. Verify staging (curl + browser incl. mobile viewport + console errors), get user confirmation

# 6. Only on explicit confirmation, promote to production — same pull-and-rebuild,
#    against the SAME commit that was just verified on staging (no separate copy step,
#    no risk of drifting from what was actually checked). server/.env and .env.local
#    are gitignored, so they are untouched by the reset — production keeps its own
#    ports/secrets automatically.
ssh root@10.5.100.10 "pct exec 118 -- bash -c '
  cd /var/www/auraco-app &&
  git fetch origin main &&
  git reset --hard origin/main &&
  npm ci && npm run build &&
  cd server && npm ci
'"
ssh root@10.5.100.10 "pct exec 118 -- pm2 restart aura-api aura-web"

# 7. Verify production (curl both LAN IP and https://aura.maxmin.vn, browser check, mobile viewport)

# 8. Confirm all three environments landed on the same commit (cheap sanity check,
#    catches a failed fetch/reset before it's mistaken for a successful deploy):
git log --oneline -1                                                          # local
ssh root@10.5.100.10 "pct exec 118 -- bash -c '
  cd /var/www/auraco-app-staging && git log --oneline -1
  cd /var/www/auraco-app && git log --oneline -1
'"
```

**If a deploy step fails partway** (e.g. `npm run build` errors after `git reset --hard`
already moved the working tree): the environment is left on the new commit's *source*
with no successful *build*. Fix the error and re-run `npm run build` — do not re-run
`git reset` again unless the source itself needs to change, and do not fall back to
copying files by hand, which is exactly the untracked-drift problem this workflow
replaces. `ls .next/BUILD_ID` confirms a build actually completed (see gotcha #12).

## Environment files (never committed — see `.gitignore`)

Each environment needs its own pair, written directly on the container (never via git —
`server/.env` and `.env.local` are both gitignored, so `git reset --hard origin/main`
during a deploy never touches them):

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

12. **`pct exec` into 118 can hang indefinitely when the Proxmox host itself is overloaded** — seen at `load average: 55-58` (on a host with `free -h` showing ~21/39GB swap in use) while `ssh root@10.5.100.10 "echo ..."` (no `pct exec`) still returned instantly. Symptom: every `pct exec 118 -- ...` call times out even with a 3-minute budget, including trivial ones like `ps aux` — it is not the command that is slow, it is entering the container's namespace. Before assuming a deploy step itself is broken, run `ssh root@10.5.100.10 "uptime"` (bare SSH, no `pct exec`) — if load is 50+, wait and retry later rather than repeatedly hammering `pct exec`, which just stacks more queued exec attempts on an already-thrashing host. A build kicked off right before the host tips into this state can be left half-written (`.next/` containing only `build/`+`cache/` subfolders, no `BUILD_ID`) — check for `BUILD_ID` before trusting a build "probably finished in the background."
13. **No version control on the server was the root cause of "a fixed bug's old code comes back."** Before 2026-09-05, staging and production were plain tar/rsync copies with no git history on either — nothing recorded which file changed when, so there was no way to tell a stale/partial deploy from a real fix, and no way to diff or roll back. Separately (same underlying "no source of truth" problem, different symptom): each environment had its **own** `server/uploads` folder on disk even though they shared one database, so a product photo uploaded on staging 404'd on production and vice versa — this looked identical to "the fix didn't take" from the storefront but was actually a missing file, not a code regression. Both are fixed now: all three environments (local, staging, production) are git clones of `trancongthangvn/auraco` tracking `origin/main` (see "Deploy pipeline" above), and `server/uploads` is a symlink to one shared `/var/www/auraco-uploads` on both. If "a fix disappeared" ever comes up again, check `git log --oneline -1` on the environment in question **before** assuming the code regressed — it may just be behind `origin/main`.

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

## Admin features added post-launch (2026-08-30)

- **Product priority (`products.sort_order`, migration `004`)**: lower non-zero number shows first in catalog/homepage listings; `0` (every existing row's default) falls back to the old `created_at DESC` order, so nothing moves until an admin deliberately sets one. `ORDER BY (sort_order = 0), sort_order ASC, created_at DESC` in both public and admin product list queries.
- **"Frequently bought together" is now admin-curated, not auto-picked** (`product_bundles` table + `products.bundle_discount_percent`, migration `005`). Admin picks 1+ companion products per product and an optional bundle discount %; `GET /api/products/:slug/bundle` feeds the product page. **Falls back to the old auto-pick** (first 2 products from the same collection, no discount) whenever a product has no configured bundle — so the 44 uncurated products keep working, only curated ones get a real discount.
- **Admin product edit gained Category (single, `Necklaces`/`Bracelets`/`Earrings`/`Signature Sets`) and Type (`collections[]` multi-select) fields** — both already existed as API fields and DB columns, they just had no form control in `app/admin/products/page.tsx`.
- **Three admin forms had a DB `image_url`/`logo_url` column and a thumbnail in the list view, but no actual upload field in the edit/create modal** — a silent gap where the data model supported per-item images but the UI never let you set one: hero banner slides (`app/admin/homepage/page.tsx`), collections (`app/admin/collections/page.tsx`), and press/brand logos (`app/admin/certificates/page.tsx`, whose "Sửa" button was additionally a dead no-op with no handler at all). Fixed by wiring `ImageField` into each. **When adding a new admin CRUD screen for anything with an image column, check the edit modal actually has an `ImageField`** — it is easy to build the table+thumbnail and forget the write path.
- **Catalog filter panel rebuilt as an inline collapsible accordion** (`components/catalog/CatalogClient.tsx`) instead of a full-screen slide-in drawer — Category/Type/Material/Price/Sort each their own +/− section, uniform square checkboxes (even for the single-select facets — checkbox styling, radio-like one-at-a-time behavior). Selecting a Category now narrows Type/Material/Price to only the combinations that actually return products (`draftCollectionScope`/`draftBrandOptions`/`pruneToScope` — a drafted selection that scope no longer supports gets dropped automatically), so "no products found" from an incompatible filter combo can no longer happen.
- **Product page "Metal" row** (`components/product/AddToBag.tsx`) is deliberately display-only — parsed from the product's own free-text `material` field (Gold/Rose Gold/Silver keyword match), shown as swatch circles. There is **no real variant system** (no per-metal price/stock/image) — do not build a real swatch *switcher* without first adding a proper `product_variants` table; this was an explicit scope decision after asking the project owner, not an oversight.

## Known open items

- Responsive image selection and visual spacing at mobile widths (above).
- The contact address placeholder — the project owner needs to supply the real address for the legal pages.
