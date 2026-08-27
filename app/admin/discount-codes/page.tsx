"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { discountCodes as initialCodes, type DiscountCode } from "@/data/admin";

export default function AdminDiscountCodesPage() {
  const { session } = useAdminAuth();
  const [codes, setCodes] = useState<DiscountCode[]>(initialCodes);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [creating, setCreating] = useState(false);

  const isAdmin = session?.role === "admin";

  const toggleActive = (id: string) => {
    setCodes((list) =>
      list.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  const remove = (id: string) => {
    if (!isAdmin) return;
    setCodes((list) => list.filter((c) => c.id !== id));
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {codes.length} mã khuyến mãi, thay đổi chỉ lưu tạm trong phiên demo
        </span>
        <button
          onClick={() => setCreating(true)}
          className="text-sm border border-[#2b261f] px-4 py-2 hover:bg-[#2b261f] hover:text-white transition-colors"
        >
          + Thêm mã
        </button>
      </PageHeader>

      <div className="bg-white border border-black/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4 font-normal">Mã</th>
              <th className="py-3 px-4 font-normal">Giá trị</th>
              <th className="py-3 px-4 font-normal">Đơn tối thiểu</th>
              <th className="py-3 px-4 font-normal">Lượt dùng</th>
              <th className="py-3 px-4 font-normal">Hiệu lực</th>
              <th className="py-3 px-4 font-normal text-center">Trạng thái</th>
              <th className="py-3 px-4 font-normal text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="py-2 px-4 font-medium">{c.code}</td>
                <td className="py-2 px-4">
                  {c.type === "percent" ? `${c.value}%` : `$${c.value}`}
                </td>
                <td className="py-2 px-4">
                  {c.minOrder > 0 ? `$${c.minOrder}` : "Không giới hạn"}
                </td>
                <td className="py-2 px-4 whitespace-nowrap">
                  {c.used}/{c.usageLimit}
                </td>
                <td className="py-2 px-4 whitespace-nowrap text-black/50">
                  {c.startDate} - {c.endDate}
                </td>
                <td className="py-2 px-4 text-center">
                  <button
                    onClick={() => toggleActive(c.id)}
                    className={`text-xs px-2 py-1 border ${
                      c.active
                        ? "border-green-700 text-green-700"
                        : "border-black/30 text-black/40"
                    }`}
                  >
                    {c.active ? "Đang bật" : "Đã tắt"}
                  </button>
                </td>
                <td className="py-2 px-4 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => setEditing(c)} className="text-xs underline">
                    Sửa
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    disabled={!isAdmin}
                    title={!isAdmin ? "Chỉ Quản trị viên được xóa mã" : ""}
                    className={`text-xs underline ${
                      isAdmin ? "text-red-700" : "text-black/20 cursor-not-allowed"
                    }`}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Sửa mã khuyến mãi</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">Mã</label>
            <input
              defaultValue={editing.code}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Giá trị giảm
            </label>
            <input
              defaultValue={editing.value}
              type="number"
              className="w-full border border-black/20 px-3 py-2 text-sm mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditing(null)}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={() => setEditing(null)}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Thêm mã khuyến mãi</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">Mã</label>
            <input
              placeholder="VD: AURA15"
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Giá trị giảm (%)
            </label>
            <input
              type="number"
              className="w-full border border-black/20 px-3 py-2 text-sm mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCreating(false)}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={() => setCreating(false)}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white"
              >
                Tạo mã
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Thêm/sửa/xóa và bật/tắt ở đây chỉ minh họa giao diện, chưa kết nối vào
        cơ chế áp mã thật ở trang thanh toán.
      </p>
    </AdminShell>
  );
}
