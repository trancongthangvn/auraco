"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { pressMentions as initialMentions } from "@/data/admin";

export default function AdminCertificatesPage() {
  const { session } = useAdminAuth();
  const [mentions, setMentions] = useState(initialMentions);
  const [creating, setCreating] = useState(false);

  const isAdmin = session?.role === "admin";

  const remove = (id: string) => {
    if (!isAdmin) return;
    setMentions((list) => list.filter((m) => m.id !== id));
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {mentions.length} logo báo chí
        </span>
        <button
          onClick={() => setCreating(true)}
          className="text-sm border border-[#2b261f] px-4 py-2 hover:bg-[#2b261f] hover:text-white transition-colors"
        >
          + Thêm logo
        </button>
      </PageHeader>

      <div className="bg-white border border-black/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4 font-normal">Tên báo chí</th>
              <th className="py-3 px-4 font-normal">Thứ tự</th>
              <th className="py-3 px-4 font-normal text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {mentions
              .slice()
              .sort((a, b) => a.sort - b.sort)
              .map((m) => (
                <tr key={m.id} className="border-b border-black/5">
                  <td className="py-2 px-4 font-medium tracking-wide">{m.name}</td>
                  <td className="py-2 px-4 text-black/50">{m.sort}</td>
                  <td className="py-2 px-4 text-right space-x-3">
                    <button className="text-xs underline">Sửa</button>
                    <button
                      onClick={() => remove(m.id)}
                      disabled={!isAdmin}
                      title={!isAdmin ? "Chỉ Quản trị viên được xóa" : ""}
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

      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Thêm logo báo chí</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tên báo chí / truyền thông
            </label>
            <input
              placeholder="VD: VOGUE"
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
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Danh sách logo hiển thị ở mục &quot;As Seen In&quot; trên trang chủ.
        Thêm/sửa/xóa ở đây chỉ minh họa giao diện.
      </p>
    </AdminShell>
  );
}
