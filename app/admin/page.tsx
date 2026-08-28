"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderStatus } from "@/data/admin";
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

export default function AdminDashboardPage() {
  const [productCount, setProductCount] = useState(0);
  const [collectionCount, setCollectionCount] = useState(0);
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
        setCollectionCount(
          new Set(products.flatMap((p) => p.collections ?? [])).size
        );
        setOrders(ordersRes.orders);
        setOrderTotal(ordersRes.total);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Không thể tải dữ liệu tổng quan.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { label: "Sản phẩm", value: productCount },
    { label: "Đơn hàng", value: orderTotal },
    {
      label: "Đơn đang xử lý",
      value: orders.filter((o) => o.status === "Đang xử lý").length,
    },
    { label: "Bộ sưu tập", value: collectionCount },
  ];

  return (
    <AdminShell>
      <PageHeader />

      {loading && <p className="text-sm text-black/40 py-8 text-center">Đang tải...</p>}
      {error && <p className="text-sm text-red-700 py-4">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-black/10 shadow-sm p-5"
              >
                <p className="text-3xl font-serif-display mb-1">{s.value}</p>
                <p className="text-xs text-black/50 uppercase tracking-wide">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-5">
            <h2 className="text-sm font-medium mb-4 uppercase tracking-wide">
              Đơn hàng gần đây
            </h2>
            {orders.length === 0 ? (
              <EmptyState>Chưa có đơn hàng nào.</EmptyState>
            ) : (
              <TableCard>
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-black/10">
                      <Th>Mã đơn</Th>
                      <Th>Khách hàng</Th>
                      <Th>Ngày</Th>
                      <Th align="right">Giá trị</Th>
                      <Th align="right">Trạng thái</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id} className={TR_HOVER}>
                        <Td>{o.order_code}</Td>
                        <Td>{o.customer_name}</Td>
                        <Td>
                          {new Date(o.created_at).toLocaleDateString("vi-VN")}
                        </Td>
                        <Td align="right">${o.total}</Td>
                        <Td align="right">
                          <Badge
                            tone={
                              o.status === "Đã giao"
                                ? "success"
                                : o.status === "Đã hủy"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {o.status}
                          </Badge>
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
