"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderStatus } from "@/data/admin";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";
import { Select } from "@/components/admin/ui/Field";
import Badge from "@/components/admin/ui/Badge";

const STATUSES: OrderStatus[] = ["Đang xử lý", "Đã giao", "Đã hủy"];

const STATUS_TONE: Record<OrderStatus, "success" | "warning" | "danger"> = {
  "Đang xử lý": "warning",
  "Đã giao": "success",
  "Đã hủy": "danger",
};

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
      ) : orders.length === 0 ? (
        <TableCard>
          <EmptyState>Chưa có đơn hàng nào.</EmptyState>
        </TableCard>
      ) : (
        <TableCard>
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-black/10">
                <Th>Mã đơn</Th>
                <Th>Khách hàng</Th>
                <Th>Ngày đặt</Th>
                <Th align="right">Giá trị</Th>
                <Th align="right">Trạng thái</Th>
                <Th align="right">Chi tiết</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className={TR_HOVER}>
                  <Td className="font-medium text-[#2b261f]">{o.order_code}</Td>
                  <Td>{o.customer_name}</Td>
                  <Td>{new Date(o.created_at).toLocaleDateString("vi-VN")}</Td>
                  <Td align="right">${parseFloat(o.total).toFixed(2)}</Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-2">
                      <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                      <Select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                        className="!w-auto !py-1.5 !px-2 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-xl border border-black/15 bg-white px-3 text-xs font-medium text-[#2b261f] transition-all duration-150 ease-out hover:border-black/30 hover:bg-black/[0.03] active:scale-[0.97]"
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
    </AdminShell>
  );
}
