"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAdminAuth } from "./AdminAuthContext";
import { apiFetch } from "@/lib/api";
import type { OrderStatus } from "@/data/admin";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  CreditCard,
  Star,
  Tag,
  Tags,
  MessageSquare,
  Award,
  Newspaper,
  FolderTree,
  Layout,
  Globe,
  Images,
  Users,
  KeyRound,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronLeft,
  Search,
  Bell,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: ("admin" | "staff")[];
};

// Staff is scoped to products + orders only (per contract §16) — every other
// section is admin-only, both here (nav visibility) and server-side
// (requireAdmin in server/routes/*.js) and per-page (useRequireAdmin, which
// closes the direct-URL bypass this nav filter alone doesn't cover).
//
// Labels and ordering follow the reference admin's own sidebar (Dashboard,
// Products, Categories, Brands, Certificates, News, Pages, Orders, Payments,
// Reviews, Contacts, System...) as closely as this app's actual page set
// allows. Two reference items were deliberately left out rather than faked:
// "Currency" (there's no FX-rate feature behind it here) and a System /
// Interface / Custom CSS / About us split (this app has one combined
// settings page, kept as-is and just relabeled "System") — both per explicit
// decision, not an oversight. Media, Discount Codes, and News Categories
// are real features here the reference doesn't have; they're kept, slotted
// in next to the closest matching reference item instead of hidden.
const NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, roles: ["admin", "staff"] },
  { href: "/admin/products", label: "Sản phẩm", icon: Package, roles: ["admin", "staff"] },
  { href: "/admin/media", label: "Thư viện ảnh", icon: Images, roles: ["admin", "staff"] },
  { href: "/admin/collections", label: "Bộ sưu tập", icon: Layers, roles: ["admin"] },
  { href: "/admin/brands", label: "Danh mục", icon: Tags, roles: ["admin"] },
  { href: "/admin/certificates", label: "Chứng nhận", icon: Award, roles: ["admin"] },
  { href: "/admin/posts", label: "Tin tức", icon: Newspaper, roles: ["admin"] },
  { href: "/admin/post-categories", label: "Chuyên mục tin", icon: FolderTree, roles: ["admin"] },
  { href: "/admin/homepage", label: "Trang", icon: Layout, roles: ["admin"] },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart, roles: ["admin", "staff"] },
  { href: "/admin/payments", label: "Thanh toán", icon: CreditCard, roles: ["admin"] },
  { href: "/admin/discount-codes", label: "Mã giảm giá", icon: Tag, roles: ["admin"] },
  { href: "/admin/reviews", label: "Đánh giá", icon: Star, roles: ["admin"] },
  { href: "/admin/inquiries", label: "Liên hệ", icon: MessageSquare, roles: ["admin"] },
  { href: "/admin/cai-dat-web", label: "Hệ thống", icon: Globe, roles: ["admin"] },
  { href: "/admin/accounts", label: "Tài khoản", icon: Users, roles: ["admin"] },
];

const COLLAPSE_KEY = "admin-sidebar-collapsed";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, ready, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Lazy initializer, not an effect — reading localStorage synchronously
  // during render (client-only, guarded) avoids a cascading re-render on
  // mount that a `useEffect(() => setCollapsed(...))` would trigger.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [query, setQuery] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Same as above — persistence is a nicety, not a requirement.
      }
      return next;
    });
  };

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

  // Real count, not decorative — the same "Đang xử lý" status Dashboard's
  // own stat card already tracks, just surfaced as the header bell's badge
  // like the reference does. A single page of orders is enough for an admin
  // panel this size; no dedicated count endpoint exists to do this cheaper.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    apiFetch<{ orders: { status: OrderStatus }[] }>("/api/admin/orders?limit=100")
      .then((res) => {
        if (cancelled) return;
        setPendingCount(res.orders.filter((o) => o.status === "Đang xử lý").length);
      })
      .catch(() => {
        // A failed badge count isn't worth surfacing an error for.
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [accountOpen]);

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

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/admin/products?q=${encodeURIComponent(q)}` : "/admin/products");
  };

  return (
    <div className="min-h-screen bg-[#f7f4f0] flex">
      {/* Sidebar — cream/gold, not the old dark near-black panel: matches
          the reference admin's own sidebar exactly (measured from a
          screenshot of its Dashboard). */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#f7f1e2] text-[#2b261f] border-r border-[#e8ddc7]
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:flex
          ${collapsed ? "w-[76px]" : "w-60"}`}
      >
        <div className="h-14 flex items-center px-4 border-b border-[#e8ddc7] shrink-0 gap-2">
          <Link
            href="/admin"
            aria-label="AURA & CO"
            className={`flex min-w-0 items-center gap-2 ${collapsed ? "justify-center flex-1" : ""}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-light text-[13px] font-bold text-white">
              A
            </span>
            {!collapsed && (
              <span className="truncate font-serif-display text-[17px] font-semibold">
                AURA & CO
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Thu gọn menu"
              className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e8ddc7] text-[#2b261f]/50 hover:bg-white hover:text-[#2b261f]"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Mở rộng menu"
            className="mx-auto mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e8ddc7] text-[#2b261f]/50 hover:bg-white hover:text-[#2b261f]"
          >
            <ChevronLeft size={14} className="rotate-180" />
          </button>
        )}

        <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-gold-light text-white font-semibold shadow-sm"
                    : "text-[#2b261f]/70 font-normal hover:bg-white/70 hover:text-[#2b261f]"
                }`}
              >
                <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#e8ddc7] shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? "Xem trang bán hàng" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[#2b261f]/60 hover:bg-white/70 hover:text-[#2b261f] ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <ExternalLink size={15} strokeWidth={1.5} className="shrink-0" />
            {!collapsed && "Xem trang bán hàng"}
          </a>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — search + notification bell + account menu, replacing
            the old plain page-label header. Matches the reference's own
            Dashboard header layout/colors exactly. */}
        <header className="h-16 bg-white border-b border-black/10 flex items-center px-4 gap-3 lg:px-6 shrink-0 sticky top-0 z-20">
          <button
            aria-label={open ? "Đóng menu" : "Mở menu"}
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden text-black/50 hover:text-black -ml-1 shrink-0"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>

          <form onSubmit={submitSearch} className="min-w-0 flex-1 max-w-md">
            <div className="flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f4f0] px-4 py-2.5">
              <Search size={15} className="shrink-0 text-black/35" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm sản phẩm, danh mục…"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[#2b261f] outline-none placeholder:text-black/35"
              />
            </div>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <button
              type="button"
              aria-label="Thông báo"
              onClick={() => router.push("/admin/orders")}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[#2b261f]/70 hover:bg-[#f7f4f0]"
            >
              <Bell size={16} />
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>

            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-[#f7f4f0]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2b261f] text-[13px] font-semibold text-white">
                  {session.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-[13px] font-semibold text-[#2b261f]">
                    {session.name}
                  </span>
                  <span className="block text-[11px] text-black/45">
                    {session.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                  </span>
                </span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-black/10 bg-white py-1.5 shadow-[0_14px_40px_rgba(32,27,22,0.12)]">
                  <Link
                    href="/admin/profile"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#2b261f]/80 hover:bg-[#f7f4f0]"
                  >
                    <KeyRound size={14} strokeWidth={1.5} />
                    Đổi mật khẩu
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      logout();
                      router.replace("/admin/login");
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={14} strokeWidth={1.5} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-7 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
