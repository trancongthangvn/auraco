"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderStatus } from "@/data/admin";

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
              <div key={s.label} className="bg-white border border-black/10 p-5">
                <p className="text-3xl font-serif-display mb-1">{s.value}</p>
                <p className="text-xs text-black/50 uppercase tracking-wide">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-black/10 p-5">
            <h2 className="text-sm font-medium mb-4 uppercase tracking-wide">
              Đơn hàng gần đây
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-black/50 border-b border-black/10">
                    <th className="py-2 font-normal">Mã đơn</th>
                    <th className="py-2 font-normal">Khách hàng</th>
                    <th className="py-2 font-normal">Ngày</th>
                    <th className="py-2 font-normal text-right">Giá trị</th>
                    <th className="py-2 font-normal text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((o) => (
                    <tr key={o.id} className="border-b border-black/5">
                      <td className="py-2">{o.order_code}</td>
                      <td className="py-2">{o.customer_name}</td>
                      <td className="py-2">
                        {new Date(o.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-2 text-right">${o.total}</td>
                      <td className="py-2 text-right">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
