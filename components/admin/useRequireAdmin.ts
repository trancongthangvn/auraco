"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AdminAuthContext";

/**
 * Guards a page that only role="admin" may use (staff is scoped to
 * products + orders only, per contract — see server/middleware/auth.js's
 * requireStaffOrAdmin vs requireAdmin split). Redirects a signed-in staff
 * session straight back to the dashboard, closing the direct-URL bypass the
 * nav-hiding alone doesn't cover. Call this at the top of the page component,
 * inside the AdminShell tree (after session is available).
 */
export function useRequireAdmin() {
  const { session, ready } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && session && session.role !== "admin") {
      router.replace("/admin");
    }
  }, [ready, session, router]);

  return { session, ready, isAdmin: session?.role === "admin" };
}
