# AURA & CO — Deployment & Operations Notes

## Infrastructure

- **Proxmox host**: `pve1`, internal network, reachable at `10.5.100.10` (root SSH).
- **Container**: LXC `118` named `auraco`, storage backend `local-lvm` (see gotcha below on why not to use the `PVE1` dir storage).
  - **Staging**: nginx serves port `8080` from `/var/www/auraco-staging` — every change goes here first.
  - **Production**: nginx serves port `80` from `/var/www/auraco` — only touched after explicit user confirmation ("chốt").
  - Production is exposed publicly at **https://aura.maxmin.vn** via a Cloudflare Tunnel (`cloudflared` systemd service) pointed at container 118 port 80.
- **GitHub repo**: `trancongthangvn/auraco` (this replaced an earlier repo name; remote origin has no embedded token).
- **Reference architecture container**: LXC `114` (`vaithaihoa`, a different live business site) — used as a read-only architecture reference when adding a real backend to this project. Its stack: Express (raw `pg`, no ORM) + PostgreSQL + JWT auth (bcrypt + jsonwebtoken) + multer/sharp uploads, run under PM2 as 3 processes (web / preview / api), with Next.js `rewrites()` proxying `/api/*` and `/uploads/*` to the Express API. It has no PayPal/Cash App/Zelle code (only COD/bank-transfer) — those had to be designed from scratch for this project.

## Standing deploy rule

**Always deploy to staging first. Only promote to production after the user explicitly confirms ("chốt", "ổn rồi", "đẩy lên production luôn").** Never skip straight to production, even for small fixes.

## Deploy pipeline (static export, current state)

```bash
# 1. Build
cd /Users/Shared/CODE/aura-co-jewelry && npm run build   # outputs to ./out (output: "export")

# 2. Package
tar -czf /tmp/auraco-build.tar.gz -C out .

# 3. Ship to the Proxmox host, then into the container
scp /tmp/auraco-build.tar.gz root@10.5.100.10:/tmp/auraco-build.tar.gz
ssh root@10.5.100.10 "pct push 118 /tmp/auraco-build.tar.gz /tmp/auraco-build.tar.gz"

# 4. Extract into STAGING first
ssh root@10.5.100.10 "pct exec 118 -- bash -c 'rm -rf /var/www/auraco-staging/* && tar -xzf /tmp/auraco-build.tar.gz -C /var/www/auraco-staging'"

# 5. Verify staging (curl + browser), get user confirmation

# 6. Only then promote to production
ssh root@10.5.100.10 "pct exec 118 -- bash -c 'rm -rf /var/www/auraco/* && cp -a /var/www/auraco-staging/. /var/www/auraco/'"
```

## Gotchas learned the hard way

1. **Never author nginx (or any multi-line remote config) via nested SSH heredocs.** A command like `ssh root@... "pct exec 118 -- bash -c 'cat > file <<EOF ... $var ... EOF'"` gets `$var` stripped by the *local* shell before it ever reaches the remote heredoc — this silently corrupted a `try_files` directive into serving the homepage for every route. Always write the config to a local file first (Write tool), then `scp`/`pct push` it in verbatim.
2. **LXC storage backend matters.** The `PVE1` storage was a `dir` type backed by NTFS (`ntfs3` driver); `pct create --rootfs PVE1:20` hung forever inside `mkfs.ext4`. Use `local-lvm` (thin-pool) instead.
3. **Static export (`output: "export"`) has real limits**: no server actions, no API routes, no `next/image` optimization (set `images.unoptimized: true`), and `app/robots.ts`/`app/sitemap.ts` need `export const dynamic = "force-static"` to build at all. All "admin" CRUD in the current static build is fake/local-state-only (resets on refresh) — see the "real backend migration" section below.
4. Git commit author for this repo is configured **locally** (not globally) to `ALODEV <hello.alodev@gmail.com>` — do not commit as "Claude".

## Real backend migration (in progress)

The static-export admin is UI-only (no persistence). A migration to a real backend is underway, modeled on CT114's architecture:
- PostgreSQL database (schema covers: admin_users, products, product_attributes, collections, orders, order_items, discount_codes, inquiries, press_mentions, product_reviews, payment_method_settings, payment_transactions, homepage_content, site_settings, posts).
- Express API server under `server/` (raw `pg`, JWT auth via `jsonwebtoken`/`bcryptjs`, uploads via `multer`+`sharp`), separate PM2 process from the Next.js frontend.
- Payment methods: Cash App and Zelle as a **manual confirmation** flow (customer sees a QR + pays externally + uploads proof; admin marks paid) — same shape as CT114's bank-transfer flow. PayPal/Apple Pay require the user's own PayPal Business API credentials (Claude cannot create or hold financial credentials) and are deferred.
- Once the backend is live, `next.config.ts` will drop `output: "export"` and add `rewrites()` proxying `/api/*` and `/uploads/*` to the Express process, matching CT114's pattern.
