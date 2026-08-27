"use client";

import AdminShell from "@/components/admin/AdminShell";
import { products } from "@/data/products";
import { mockOrders } from "@/data/admin";

export default function AdminDashboardPage() {
  const stats = [
    { label: "Sản phẩm", value: products.length },
    { label: "Đơn hàng", value: mockOrders.length },
    {
      label: "Đơn đang xử lý",
      value: mockOrders.filter((o) => o.status === "Đang xử lý").length,
    },
    {
      label: "Bộ sưu tập",
      value: new Set(products.flatMap((p) => p.collections)).size,
    },
  ];

  return (
    <AdminShell>
      <h1 className="font-serif-display text-2xl mb-6">Tổng quan</h1>
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
        <table className="w-full text-sm">
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
            {mockOrders.slice(0, 5).map((o) => (
              <tr key={o.id} className="border-b border-black/5">
                <td className="py-2">{o.id}</td>
                <td className="py-2">{o.customer}</td>
                <td className="py-2">{o.date}</td>
                <td className="py-2 text-right">{o.total}</td>
                <td className="py-2 text-right">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
