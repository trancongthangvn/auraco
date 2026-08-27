"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, getToken, setToken, clearToken, ApiError } from "@/lib/api";

export type Role = "admin" | "staff";

type Session = { name: string; username: string; role: Role } | null;

type AdminUser = {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  active: boolean;
};

const AdminAuthContext = createContext<{
  session: Session;
  ready: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}>({
  session: null,
  ready: false,
  login: async () => false,
  logout: () => {},
});

function toSession(user: AdminUser): Session {
  return { name: user.display_name, username: user.username, role: user.role };
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // One-time check on mount: validate any stored token against the API
    // (not just trust stale localStorage data). Must run in an effect, not a
    // lazy useState initializer, since `window`/network calls aren't
    // available during server rendering.
    const token = getToken();
    const check = token
      ? apiFetch<AdminUser>("/api/admin/me")
      : Promise.reject(new Error("no token"));
    check
      .then((user) => {
        setSession(toSession(user));
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const { token, user } = await apiFetch<{ token: string; user: AdminUser }>(
        "/api/admin/login",
        { method: "POST", body: JSON.stringify({ username, password }) }
      );
      setToken(token);
      setSession(toSession(user));
      return true;
    } catch (err) {
      if (err instanceof ApiError) return false;
      throw err;
    }
  };

  const logout = () => {
    clearToken();
    setSession(null);
  };

  return (
    <AdminAuthContext.Provider value={{ session, ready, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
