"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, ArrowRight } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { apiFetch, ApiError } from "@/lib/api";
import { type OrderStatus } from "@/data/admin";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";
import Badge from "@/components/admin/ui/Badge";

type AdminProduct = {
  id: number;
  collections?: string[];
};

type AdminOrder = {
  id: number;
  order_code: string;
  customer_name: string;
  total: string;
  status: OrderStatus;
  created_at: string;
};

/** Reference measured its own status pills off `PENDING`/`CANCELLED` text —
 *  this maps our own three statuses to the same warning/danger/success tone
 *  Badge already carries, so the pill colors match without inventing a
 *  fourth English-labeled status that doesn't exist in this data model. */
const STATUS_TONE: Record<OrderStatus, "success" | "danger" | "warning"> = {
  "Đã giao": "success",
  "Đã hủy": "danger",
  "Đang xử lý": "warning",
};

export default function AdminDashboardPage() {
  const [productCount, setProductCount] = useState(0);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch<AdminProduct[]>("/api/products/admin/products"),
      apiFetch<{ orders: AdminOrder[]; total: number }>("/api/admin/orders?limit=100"),
    ])
      .then(([products, ordersRes]) => {
        if (cancelled) return;
        setProductCount(products.length);
        setOrders(ordersRes.orders);
        setOrderTotal(ordersRes.total);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Không tải được dữ liệu tổng quan.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell>
      {/* Breadcrumb + heading + subtitle — replacing the old bordered
          "guide card" (icon box + helper text) on this page specifically,
          matching the reference Dashboard's own plain breadcrumb/H1/subtitle
          layout. Other admin pages keep PageHeader as-is; only this one had
          a screenshot to match precisely. */}
      <nav className="mb-3 flex items-center gap-1.5 text-[13px] text-black/45">
        <Home size={13} />
        <span>/</span>
        <span className="text-[#2b261f]">Tổng quan</span>
      </nav>
      <h1 className="font-serif-display text-[26px] font-bold text-[#2b261f]">Tổng quan</h1>
      <p className="mt-1 mb-6 text-[13px] text-black/45">
        Chào bạn trở lại. Xem nhanh tình hình cửa hàng.
      </p>

      {loading && <p className="text-sm text-black/40 py-8 text-center">Đang tải...</p>}
      {error && <p className="text-sm text-red-700 py-4">{error}</p>}

      {!loading && !error && (
        <>
          {/* One bordered panel holding 3 stat cards, each with its own pale
              tint + a gold "→" link — matches the reference exactly (its
              cards read Products/Orders/Currencies; ours uses the metrics
              this admin actually tracks instead of inventing an FX-rates
              feature that doesn't exist here). */}
          <div className="mb-6 rounded-2xl border border-black/10 bg-white p-5 lg:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-[#f7f1e2] p-5">
                <p className="text-[13px] text-black/55">Sản phẩm</p>
                <p className="mt-1 font-serif-display text-[32px] font-bold text-[#2b261f]">
                  {productCount}
                </p>
                <Link
                  href="/admin/products"
                  className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-gold hover:underline"
                >
                  Quản lý sản phẩm <ArrowRight size={13} />
                </Link>
              </div>
              <div className="rounded-xl bg-[#f7f1e2] p-5">
                <p className="text-[13px] text-black/55">Đơn hàng</p>
                <p className="mt-1 font-serif-display text-[32px] font-bold text-[#2b261f]">
                  {orderTotal}
                </p>
                <Link
                  href="/admin/orders"
                  className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-gold hover:underline"
                >
                  Xem đơn hàng <ArrowRight size={13} />
                </Link>
              </div>
              <div className="rounded-xl bg-[#f7f1e2] p-5">
                <p className="text-[13px] text-black/55">Chờ xử lý</p>
                <p className="mt-1 font-serif-display text-[32px] font-bold text-[#2b261f]">
                  {orders.filter((o) => o.status === "Đang xử lý").length}
                </p>
                <Link
                  href="/admin/orders"
                  className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-gold hover:underline"
                >
                  Xử lý ngay <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-5 lg:p-6">
            <h2 className="mb-4 text-[15px] font-semibold text-[#2b261f]">
              Đơn hàng gần đây
            </h2>
            {orders.length === 0 ? (
              <EmptyState>Chưa có đơn hàng nào.</EmptyState>
            ) : (
              <TableCard>
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="rounded-lg bg-[#f7f1e2] text-left">
                      <Th>Mã đơn</Th>
                      <Th>Khách hàng</Th>
                      <Th align="right">Tổng tiền</Th>
                      <Th align="right">Trạng thái</Th>
                      <Th align="right"></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 8).map((o) => (
                      <tr key={o.id} className={TR_HOVER}>
                        <Td>
                          <span className="font-semibold">{o.order_code}</span>
                        </Td>
                        <Td>{o.customer_name}</Td>
                        <Td align="right">${o.total}</Td>
                        <Td align="right">
                          <Badge tone={STATUS_TONE[o.status]}>
                            {o.status}
                          </Badge>
                        </Td>
                        <Td align="right">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="inline-flex items-center rounded-full border border-black/15 px-3.5 py-1.5 text-[12px] font-medium text-[#2b261f] hover:bg-[#f7f4f0]"
                          >
                            Xem
                          </Link>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
