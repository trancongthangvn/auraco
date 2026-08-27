---
name: deploy-auraco
description: Build and deploy the AURA & CO jewelry site to the Proxmox-hosted staging/production containers, following the project's staging-first rule and known infra gotchas.
---

# Deploy AURA & CO

Use this whenever asked to deploy, redeploy, push to staging, or "chốt" (finalize) the AURA & CO site.

Full infra details, gotchas, and the real-backend migration plan live in `DEPLOYMENT.md` at the project root — read it first if anything here is unclear or out of date.

## Standing rule (do not skip)

**Always deploy to staging first.** Only copy staging → production after the user explicitly confirms with something like "ổn rồi", "chốt", or "đẩy lên production luôn". Never go straight to production, even for a one-line fix.

## Infra quick reference

- Proxmox host `pve1`: `ssh root@10.5.100.10` (password known to the user, prompt if needed).
- Container `118` (`auraco`): staging = port 8080, `/var/www/auraco-staging`; production = port 80, `/var/www/auraco`, publicly at `https://aura.maxmin.vn` via Cloudflare Tunnel.
- GitHub remote: `trancongthangvn/auraco`, commit author configured locally as `ALODEV <hello.alodev@gmail.com>` — never commit as "Claude".

## Steps

1. **Build & verify locally first**: `npx eslint .`, `npx tsc --noEmit`, `npm run build` — all must be clean before deploying anything.
2. **Package**: `tar -czf /tmp/auraco-build.tar.gz -C out .` (from the project root, after `npm run build` produces `./out`).
3. **Ship to host + container**:
   ```
   scp /tmp/auraco-build.tar.gz root@10.5.100.10:/tmp/auraco-build.tar.gz
   ssh root@10.5.100.10 "pct push 118 /tmp/auraco-build.tar.gz /tmp/auraco-build.tar.gz"
   ```
4. **Extract into STAGING**:
   ```
   ssh root@10.5.100.10 "pct exec 118 -- bash -c 'rm -rf /var/www/auraco-staging/* && tar -xzf /tmp/auraco-build.tar.gz -C /var/www/auraco-staging'"
   ```
5. **Verify staging**: `curl` a handful of key routes (`/`, `/admin/login.html`, any newly touched pages) for `200`, then check visually in the Browser pane. Report the staging LAN link (`http://10.5.100.118:8080/...`) to the user and wait for confirmation.
6. **Only on explicit confirmation, promote to production**:
   ```
   ssh root@10.5.100.10 "pct exec 118 -- bash -c 'rm -rf /var/www/auraco/* && cp -a /var/www/auraco-staging/. /var/www/auraco/'"
   ```
7. **Verify production**: curl the same routes against `https://aura.maxmin.vn`, then a quick Browser-pane visual check. Report back.

## Hard-learned gotchas

- **Never author nginx or any multi-line remote config file through a nested SSH heredoc** (`ssh ... "pct exec ... bash -c 'cat > f <<EOF ... EOF'"`) — the outer local shell strips `$variables` before the remote heredoc ever sees them. Always `Write` the config locally, then `scp`/`pct push` it in verbatim.
- If creating a new LXC ever comes up again: use `local-lvm` storage, not any NTFS-backed `dir` storage (`mkfs.ext4` hangs forever on NTFS-backed images).
- This site is currently a Next.js **static export** (`output: "export"`) — no server actions, no API routes, `images.unoptimized: true`, and `robots.ts`/`sitemap.ts` need `export const dynamic = "force-static"`. The admin panel is UI-only (no real persistence) until the real-backend migration (see `DEPLOYMENT.md`) lands.
