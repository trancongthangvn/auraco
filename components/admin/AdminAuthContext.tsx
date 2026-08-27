"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { adminAccounts, type Role } from "@/data/admin";

type Session = { name: string; email: string; role: Role } | null;

const AdminAuthContext = createContext<{
  session: Session;
  ready: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}>({
  session: null,
  ready: false,
  login: () => false,
  logout: () => {},
});

const STORAGE_KEY = "auraco_admin_session";

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  const login = (email: string, password: string) => {
    const match = adminAccounts.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
    );
    if (!match) return false;
    const next = { name: match.name, email: match.email, role: match.role };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
    return true;
  };

  const logout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
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
