// Storefront customer sign-in state. Kept separate from lib/api.ts, whose
// token belongs to the admin panel: a customer token must never be sent as
// the admin Authorization header, and signing out of one must not sign out
// of the other.

import { ApiError } from "@/lib/api";

const TOKEN_KEY = "auraco_customer_token";
const CHANGE_EVENT = "auraco-customer-auth";

export type Customer = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
};

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setCustomerToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked (private mode): the session just won't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearCustomerToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Subscribe to sign-in / sign-out, in this tab and in other tabs. */
export function subscribeCustomerToken(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Calls /api/account/* with the customer token. Same { data } / { error }
 * envelope as apiFetch. A 401 on a signed-in call means the token expired or
 * is invalid, so it is cleared.
 */
export async function accountFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getCustomerToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) clearCustomerToken();
    throw new ApiError(body?.error || `Request failed (${res.status})`, res.status);
  }
  return body.data as T;
}
