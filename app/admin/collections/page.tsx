"use client";

import { useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { collections as initialCollections } from "@/data/site";

type Collection = (typeof initialCollections)[number];

export default function AdminCollectionsPage() {
  const { session } = useAdminAuth();
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [creating, setCreating] = useState(false);

  const isAdmin = session?.role === "admin";

  const remove = (name: string) => {
    if (!isAdmin) return;
    setCollections((list) => list.filter((c) => c.name !== name));
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="font-serif-display text-2xl">Collections</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-black/50">
            {collections.length} bộ sưu tập, hiển thị trên trang chủ và bộ lọc
            catalog
          </span>
          <button
            onClick={() => setCreating(true)}
            className="text-sm border border-[#2b261f] px-4 py-2 hover:bg-[#2b261f] hover:text-white transition-colors"
          >
            + Thêm collection
          </button>
        </div>
      </div>

      <div className="bg-white border border-black/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4 font-normal">Ảnh</th>
              <th className="py-3 px-4 font-normal">Tên</th>
              <th className="py-3 px-4 font-normal">Đường dẫn</th>
              <th className="py-3 px-4 font-normal text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((c) => (
              <tr key={c.name} className="border-b border-black/5">
                <td className="py-2 px-4">
                  <div className="relative h-10 w-10 bg-[#f5f2ee]">
                    <Image
                      src={c.img}
                      alt={c.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                </td>
                <td className="py-2 px-4">{c.name}</td>
                <td className="py-2 px-4 text-black/40">{c.href}</td>
                <td className="py-2 px-4 text-right space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => setEditing(c)}
                    className="text-xs underline"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => remove(c.name)}
                    disabled={!isAdmin}
                    title={!isAdmin ? "Chỉ Quản trị viên được xóa collection" : ""}
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
            <h2 className="text-lg font-medium mb-4">Sửa collection</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tên hiển thị
            </label>
            <input
              defaultValue={editing.name}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Đường dẫn (href)
            </label>
            <input
              defaultValue={editing.href}
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
            <h2 className="text-lg font-medium mb-4">Thêm collection mới</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tên hiển thị
            </label>
            <input className="w-full border border-black/20 px-3 py-2 text-sm mb-4" />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Đường dẫn (href)
            </label>
            <input className="w-full border border-black/20 px-3 py-2 text-sm mb-6" />
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
                Tạo collection
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Thêm/sửa/xóa ở đây chỉ minh họa giao diện, chưa ghi ngược lại vào nội
        dung thật của trang.
      </p>
    </AdminShell>
  );
}
