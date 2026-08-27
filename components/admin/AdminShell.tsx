"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdminAuth } from "./AdminAuthContext";

const NAV = [
  { href: "/admin", label: "Tổng quan", roles: ["admin", "staff"] },
  { href: "/admin/products", label: "Sản phẩm", roles: ["admin", "staff"] },
  { href: "/admin/orders", label: "Đơn hàng", roles: ["admin", "staff"] },
  { href: "/admin/accounts", label: "Tài khoản", roles: ["admin"] },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, ready, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) {
      router.replace("/admin/login");
    }
  }, [ready, session, router]);

  if (!ready || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-black/50">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  const visibleNav = NAV.filter((item) => item.roles.includes(session.role));

  return (
    <div className="min-h-screen flex bg-[#f7f4f0]">
      <aside className="w-60 shrink-0 bg-[#2b261f] text-white flex flex-col">
        <div className="px-6 py-5 font-serif-display text-xl border-b border-white/10">
          AURA & CO
          <div className="text-[11px] tracking-wide text-white/50 font-sans mt-1">
            TRANG QUẢN TRỊ
          </div>
        </div>
        <nav className="flex-1 py-4">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-6 py-3 text-sm ${
                pathname === item.href
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-white/10 text-xs text-white/50">
          Đăng nhập: {session.email}
          <div className="uppercase tracking-wide text-white/40 mt-0.5">
            {session.role === "admin" ? "Quản trị viên" : "Nhân viên"}
          </div>
          <button
            onClick={() => {
              logout();
              router.replace("/admin/login");
            }}
            className="mt-3 text-white/70 hover:text-white underline"
          >
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
