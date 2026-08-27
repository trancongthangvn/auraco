"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { mockOrders, type OrderStatus } from "@/data/admin";

const STATUSES: OrderStatus[] = ["Đang xử lý", "Đã giao", "Đã hủy"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState(mockOrders);

  const updateStatus = (id: string, status: OrderStatus) => {
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  return (
    <AdminShell>
      <h1 className="font-serif-display text-2xl mb-6">Đơn hàng</h1>
      <div className="bg-white border border-black/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4 font-normal">Mã đơn</th>
              <th className="py-3 px-4 font-normal">Khách hàng</th>
              <th className="py-3 px-4 font-normal">Ngày đặt</th>
              <th className="py-3 px-4 font-normal text-right">Giá trị</th>
              <th className="py-3 px-4 font-normal text-right">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-black/5">
                <td className="py-2 px-4">{o.id}</td>
                <td className="py-2 px-4">{o.customer}</td>
                <td className="py-2 px-4">{o.date}</td>
                <td className="py-2 px-4 text-right">{o.total}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-black/40 mt-4">
        Dữ liệu đơn hàng minh họa, thay đổi trạng thái chỉ lưu tạm trong phiên demo.
      </p>
    </AdminShell>
  );
}
