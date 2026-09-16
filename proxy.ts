import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The site lives at the apex aetherpieces.com. Every host it has previously
// answered on still points at this same server (Cloudflare Tunnel routes them
// to localhost:80), and order-confirmation emails already sent to real
// customers — plus anything a search engine indexed — still link to those
// older hosts, so a hard cutover would 404 all of it. Each retired host
// redirects to the apex instead, path and query string intact.
//
// aether.aetherpieces.com is listed here because it was the live host until
// the move to the apex, not because it was ever wrong; it has to keep working
// for exactly the same reason aura.maxmin.vn does.
//
// 308 (not 301/302): preserves the request method, so the rare POST that
// still lands here from an already-open tab redirects correctly too,
// not just GET navigations.
//
// No `matcher` export: this must run for every request on a retired host,
// including /api/* (this app's rewrites() send those to the Express
// backend, but Proxy runs before that — see node_modules/next/dist/docs's
// proxy.md "Execution order") and static assets, not just page routes —
// nothing should render on a retired host anymore.
const NEW_ORIGIN = "https://aetherpieces.com";
const RETIRED_HOSTS = new Set([
  "aura.maxmin.vn",
  "www.aura.maxmin.vn",
  "aether.aetherpieces.com",
  "www.aether.aetherpieces.com",
  "www.aetherpieces.com",
]);

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  if (host && RETIRED_HOSTS.has(host)) {
    const url = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      NEW_ORIGIN
    );
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}
