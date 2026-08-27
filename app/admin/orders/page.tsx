"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderStatus } from "@/data/admin";

const STATUSES: OrderStatus[] = ["Đang xử lý", "Đã giao", "Đã hủy"];

type AdminOrder = {
  id: number;
  order_code: string;
  customer_name: string;
  email: string;
  total: string;
  status: OrderStatus;
  created_at: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ orders: AdminOrder[]; total: number; page: number; limit: number }>(
      "/api/admin/orders?limit=100"
    )
      .then((data) => {
        if (!cancelled) setOrders(data.orders);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Đã có lỗi xảy ra");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStatus = async (id: number, status: OrderStatus) => {
    const previous = orders;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await apiFetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      setOrders(previous);
      setError(err instanceof ApiError ? err.message : "Không thể cập nhật trạng thái");
    }
  };

  return (
    <AdminShell>
      <PageHeader />
      {loading ? (
        <p className="text-sm text-black/50">Đang tải...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="bg-white border border-black/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-3 px-4 font-normal">Mã đơn</th>
                <th className="py-3 px-4 font-normal">Khách hàng</th>
                <th className="py-3 px-4 font-normal">Ngày đặt</th>
                <th className="py-3 px-4 font-normal text-right">Giá trị</th>
                <th className="py-3 px-4 font-normal text-right">Trạng thái</th>
                <th className="py-3 px-4 font-normal text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-black/5">
                  <td className="py-2 px-4">{o.order_code}</td>
                  <td className="py-2 px-4">{o.customer_name}</td>
                  <td className="py-2 px-4">
                    {new Date(o.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="py-2 px-4 text-right">
                    ${parseFloat(o.total).toFixed(2)}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <select
                      value={o.status}
                      onChange={(e) =>
                        updateStatus(o.id, e.target.value as OrderStatus)
                      }
                      className="text-xs border border-black/20 px-2 py-1"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-xs underline hover:text-gold"
                    >
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
