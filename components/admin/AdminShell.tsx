"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminAuth } from "./AdminAuthContext";
import { MenuIcon, CloseIcon } from "@/components/icons";

const NAV = [
  { href: "/admin", label: "Tổng quan", roles: ["admin", "staff"] },
  { href: "/admin/products", label: "Sản phẩm", roles: ["admin", "staff"] },
  { href: "/admin/collections", label: "Collections", roles: ["admin", "staff"] },
  { href: "/admin/orders", label: "Đơn hàng", roles: ["admin", "staff"] },
  { href: "/admin/posts", label: "Bài viết", roles: ["admin", "staff"] },
  { href: "/admin/homepage", label: "Trang chủ", roles: ["admin", "staff"] },
  { href: "/admin/accounts", label: "Tài khoản", roles: ["admin"] },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, ready, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile nav drawer whenever the route changes. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass —
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileNavOpen(false);
  }

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

  const navContent = (
    <>
      <div className="px-6 py-5 font-serif-display text-xl border-b border-white/10 flex items-center justify-between">
        <div>
          AURA & CO
          <div className="text-[11px] tracking-wide text-white/50 font-sans mt-1">
            TRANG QUẢN TRỊ
          </div>
        </div>
        <button
          aria-label="Đóng menu"
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden text-white/70 hover:text-white"
        >
          <CloseIcon size={20} />
        </button>
      </div>
      <nav className="flex-1 py-4">
        {visibleNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-6 py-3 text-sm ${
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href + "/"))
                ? "bg-white/10 text-white"
                : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-white/10 text-xs text-white/50">
        Đăng nhập: {session.username}
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
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#f7f4f0]">
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between bg-[#2b261f] text-white px-4 py-3">
        <span className="font-serif-display text-lg">AURA & CO</span>
        <button
          aria-label="Mở menu"
          onClick={() => setMobileNavOpen(true)}
          className="text-white/80 hover:text-white"
        >
          <MenuIcon size={22} />
        </button>
      </header>

      <aside className="hidden lg:flex w-60 shrink-0 bg-[#2b261f] text-white flex-col">
        {navContent}
      </aside>

      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#2b261f] text-white flex flex-col">
            {navContent}
          </aside>
        </div>
      )}

      <main className="flex-1 p-5 pt-20 lg:p-8 lg:pt-8 min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
