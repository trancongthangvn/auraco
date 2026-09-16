import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// aura.maxmin.vn is retired in favor of aether.aetherpieces.com. Both
// domains still point at this same server (Cloudflare Tunnel routes both
// to localhost:80), but order-confirmation emails already sent to real
// customers, and anything a search engine indexed, still link to the old
// host — a hard cutover would 404 all of that. This redirects the whole
// domain instead, path and query string intact.
//
// 308 (not 301/302): preserves the request method, so the rare POST that
// still lands here from an already-open tab redirects correctly too,
// not just GET navigations.
//
// No `matcher` export: this must run for every request on the old host,
// including /api/* (this app's rewrites() send those to the Express
// backend, but Proxy runs before that — see node_modules/next/dist/docs's
// proxy.md "Execution order") and static assets, not just page routes —
// nothing should render on aura.maxmin.vn anymore.
const OLD_HOST = "aura.maxmin.vn";
const NEW_ORIGIN = "https://aether.aetherpieces.com";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  if (host === OLD_HOST || host === `www.${OLD_HOST}`) {
    const url = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      NEW_ORIGIN
    );
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}
