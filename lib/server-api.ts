/**
 * Server-side API fetch helper for use in Server Components / route handlers.
 * Unlike lib/api.ts's apiFetch (browser, relative paths via next.config.ts
 * rewrites), this runs during SSR/build where there is no browser origin to
 * be "same-origin" relative to — it must call the API's absolute URL
 * directly (same API_URL used by next.config.ts's rewrites).
 */
const API_URL = process.env.API_URL || "http://localhost:4000";

export class ServerApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function serverApiFetch<T = unknown>(
  path: string,
  options: RequestInit & { cache?: RequestCache } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ServerApiError(body?.error || `Request failed (${res.status})`, res.status);
  }
  return body.data as T;
}
