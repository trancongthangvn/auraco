"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminAuth } from "./AdminAuthContext";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Tag,
  MessageSquare,
  Newspaper,
  Layout,
  Globe,
  Users,
  KeyRound,
  LogOut,
  Menu,
  X,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: ("admin" | "staff")[];
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, roles: ["admin", "staff"] },
  { href: "/admin/products", label: "Sản phẩm", icon: Package, roles: ["admin", "staff"] },
  { href: "/admin/collections", label: "Collections", icon: Layers, roles: ["admin", "staff"] },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart, roles: ["admin", "staff"] },
  { href: "/admin/discount-codes", label: "Khuyến mãi", icon: Tag, roles: ["admin", "staff"] },
  { href: "/admin/inquiries", label: "Yêu cầu liên hệ", icon: MessageSquare, roles: ["admin", "staff"] },
  { href: "/admin/posts", label: "Bài viết", icon: Newspaper, roles: ["admin", "staff"] },
  { href: "/admin/homepage", label: "Trang chủ", icon: Layout, roles: ["admin", "staff"] },
  { href: "/admin/cai-dat-web", label: "Cài đặt web", icon: Globe, roles: ["admin"] },
  { href: "/admin/accounts", label: "Tài khoản", icon: Users, roles: ["admin"] },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, ready, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (ready && !session) {
      router.replace("/admin/login");
    }
  }, [ready, session, router]);

  if (!ready || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4f0]">
        <div className="flex items-center gap-2 text-sm text-black/40">
          <span className="w-4 h-4 border-2 border-black/20 border-t-[#2b261f] rounded-full animate-spin" />
          Đang tải...
        </div>
      </div>
    );
  }

  const visibleNav = NAV.filter((item) => item.roles.includes(session.role));
  const currentLabel =
    NAV.find(
      (n) => n.href === pathname || (n.href !== "/admin" && pathname.startsWith(n.href))
    )?.label || "Admin";

  return (
    <div className="min-h-screen bg-[#f7f4f0] flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 bg-[#2b261f] text-white flex flex-col
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:flex`}
      >
        <div className="h-14 flex items-center px-5 border-b border-white/10 shrink-0">
          <Link href="/admin" className="font-serif-display text-lg tracking-wide">
            AURA & CO
          </Link>
          <span className="ml-auto text-[10px] font-medium text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
            Admin
          </span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] ${
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-gold" />
                )}
                <Icon size={15} className={active ? "text-gold-light" : "text-white/40"} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-white/10 shrink-0">
          <div className="px-3 py-2 mb-0.5">
            <p className="text-[11px] text-white/40 leading-tight">
              {session.role === "admin" ? "Quản trị viên" : "Nhân viên"}
            </p>
            <p className="text-[13px] font-medium text-white truncate leading-tight">
              {session.username}
            </p>
          </div>
          <Link
            href="/admin/profile"
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <KeyRound size={14} className="text-white/40" />
            Đổi mật khẩu
          </Link>
          <button
            onClick={() => {
              logout();
              router.replace("/admin/login");
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-white/60 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
          >
            <LogOut size={14} className="text-white/40" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-13 bg-white/90 backdrop-blur border-b border-black/10 flex items-center px-4 gap-3 lg:px-6 shrink-0 sticky top-0 z-20">
          <button
            aria-label={open ? "Đóng menu" : "Mở menu"}
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden text-black/50 hover:text-black -ml-1"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="text-[13px] text-black/60 font-medium">
            {currentLabel}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] text-black/40 hover:text-black transition-colors"
            >
              <ExternalLink size={12} />
              Xem website
            </a>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-7 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
