---
name: deploy-auraco
description: Build and deploy the AURA & CO jewelry site (Next.js + Express/PostgreSQL) to the Proxmox-hosted staging/production containers, following the project's staging-first rule and known infra gotchas.
---

# Deploy AURA & CO

Use this whenever asked to deploy, redeploy, push to staging, or "chốt" (finalize) the AURA & CO site.

Full infra details, environment file contents, and hard-learned gotchas live in `DEPLOYMENT.md` at the project root — read it first, it is the source of truth if anything here is stale.

## Standing rule (do not skip)

**Always deploy to staging first.** Only promote staging → production after the user explicitly confirms with something like "ổn rồi", "chốt", or "đẩy lên production luôn". Never go straight to production, even for a one-line fix.

## Infra quick reference

- Proxmox host `pve1`: `ssh root@10.5.100.10` (password known to the user, prompt if needed).
- Container `118` (`auraco`): Node 22 + PostgreSQL 15 (db `auraco`, role `auraco_app`) + PM2 installed.
  - Staging: `/var/www/auraco-app-staging`, nginx port 8080 → `aura-web-staging` (port 3101) → its own `aura-api-staging` (port 4001).
  - Production: `/var/www/auraco-app`, nginx port 80 → `aura-web` (port 3100) → its own `aura-api` (port 4000), publicly at `https://aura.maxmin.vn`.
  - Staging and production share one Postgres database.
- GitHub remote: `trancongthangvn/auraco`, commit author configured locally as `ALODEV <hello.alodev@gmail.com>` — never commit as "Claude".
- This is a REAL backend now (Express + PostgreSQL), not a static export. See `DEPLOYMENT.md`'s "Architecture" section.

## Steps

1. **Build & verify locally first**: `npx eslint .`, `npx tsc --noEmit`, `npm run build` — all must be clean before deploying anything.
2. **Ship source** (exclude `node_modules`, `.next`, `out`, `.git`, `server/node_modules`, `server/uploads`, `*.env`) to the container's staging directory via rsync → tar → `pct push` → extract (see `DEPLOYMENT.md` for the exact commands).
3. **Install deps + build IN PLACE on the container**: `npm ci && npm run build` at the app root, `cd server && npm ci` — never rebuild locally and copy `.next` over (see gotcha below).
4. **Restart staging PM2 processes**: `pm2 restart aura-web-staging aura-api-staging`.
5. **Verify staging**: curl key routes for 200, then a real browser check — homepage, one product page, catalog, checkout, admin login, **and at least one mobile-viewport pass with console-error checking** (a past bug crashed the checkout page only visible via console, not curl). Report the staging link and wait for confirmation.
6. **Only on explicit confirmation, promote to production**: copy staging's source into `/var/www/auraco-app` while PRESERVING production's own `server/.env` and `.env.local` (different ports — back them up first, `cp -a`, restore them), then **rebuild in place there too** (`npm run build`), then `pm2 restart aura-api aura-web`.
7. **Verify production**: curl + browser check against both the LAN IP and `https://aura.maxmin.vn`. Confirm `/api/health` uptime reached through the Next.js rewrite matches uptime hit directly on the API port — a mismatch means the rewrite is still pointing at the wrong environment's API (see gotcha below).

## Hard-learned gotchas

- **Never author nginx or any multi-line remote config file through a nested SSH heredoc** (`ssh ... "pct exec ... bash -c 'cat > f <<EOF ... EOF'"`) — the outer local shell strips `$variables` before the remote heredoc ever sees them. Always `Write` the config locally, then `scp`/`pct push` it in verbatim.
- If creating a new LXC ever comes up again: use `local-lvm` storage, not any NTFS-backed `dir` storage (`mkfs.ext4` hangs forever on NTFS-backed images). Also generate a UTF-8 locale (`locales` package + `locale-gen`) before creating the Postgres database, or it silently defaults to `SQL_ASCII` and corrupts Vietnamese text.
- **Postgres NUMERIC columns come back as strings** via `pg` — never call `.toFixed()` on a price/money value straight from an API response without `Number(...)` first. This crashed the entire checkout page in production once; grep `.toFixed(` after touching any money field.
- **Next.js bakes `rewrites()` destinations into the build at `next build` time.** Copying a prebuilt `.next` folder between environments (e.g. staging → production) silently carries over the OLD environment's `API_URL`, even after fixing `.env.local` in the new location — the app looks fine (200s everywhere) but every `/api/*` call reaches the wrong backend. Always rebuild in place after the environment's own `.env.local` is correct, never just `cp -a` a prebuilt app across environments.
- Git commit author for this repo is configured **locally** (not globally) to `ALODEV <hello.alodev@gmail.com>` — never commit as "Claude".
