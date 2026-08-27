"use client";

import { useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import {
  products as initialProducts,
  type FullProduct,
  type ProductAttribute,
} from "@/data/products";

export default function AdminProductsPage() {
  const { session } = useAdminAuth();
  const [products, setProducts] = useState<FullProduct[]>(initialProducts);
  const [editing, setEditing] = useState<FullProduct | null>(null);
  const [editAttributes, setEditAttributes] = useState<ProductAttribute[]>([]);

  const updateAttribute = (
    index: number,
    field: keyof ProductAttribute,
    value: string
  ) => {
    setEditAttributes((list) =>
      list.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const removeAttribute = (index: number) => {
    setEditAttributes((list) => list.filter((_, i) => i !== index));
  };

  const isAdmin = session?.role === "admin";

  const toggleVisible = (slug: string) => {
    setProducts((list) =>
      list.map((p) => (p.slug === slug ? { ...p, stock: p.stock > 0 ? 0 : 10 } : p))
    );
  };

  const remove = (slug: string) => {
    if (!isAdmin) return;
    setProducts((list) => list.filter((p) => p.slug !== slug));
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {products.length} sản phẩm, thay đổi chỉ lưu tạm trong phiên demo
        </span>
      </PageHeader>

      <div className="bg-white border border-black/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4 font-normal">Ảnh</th>
              <th className="py-3 px-4 font-normal">Tên sản phẩm</th>
              <th className="py-3 px-4 font-normal">Danh mục</th>
              <th className="py-3 px-4 font-normal text-right">Giá</th>
              <th className="py-3 px-4 font-normal text-center">Trạng thái</th>
              <th className="py-3 px-4 font-normal text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.slug} className="border-b border-black/5">
                <td className="py-2 px-4">
                  <div className="relative h-10 w-10 bg-[#f5f2ee]">
                    <Image src={p.images[0]} alt={p.name} fill sizes="40px" className="object-cover" />
                  </div>
                </td>
                <td className="py-2 px-4">{p.name}</td>
                <td className="py-2 px-4">{p.category}</td>
                <td className="py-2 px-4 text-right">${p.price.toFixed(2)}</td>
                <td className="py-2 px-4 text-center">
                  <button
                    onClick={() => toggleVisible(p.slug)}
                    className={`text-xs px-2 py-1 border ${
                      p.stock > 0
                        ? "border-green-700 text-green-700"
                        : "border-black/30 text-black/40"
                    }`}
                  >
                    {p.stock > 0 ? "Đang hiển thị" : "Đã ẩn"}
                  </button>
                </td>
                <td className="py-2 px-4 text-right space-x-3">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setEditAttributes(p.attributes ?? []);
                    }}
                    className="text-xs underline"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => remove(p.slug)}
                    disabled={!isAdmin}
                    title={!isAdmin ? "Chỉ Quản trị viên được xóa sản phẩm" : ""}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white p-6 w-full max-w-lg my-auto">
            <h2 className="text-lg font-medium mb-4">Sửa sản phẩm</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tên sản phẩm
            </label>
            <input
              defaultValue={editing.name}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Giá (USD)
            </label>
            <input
              defaultValue={editing.price}
              type="number"
              className="w-full border border-black/20 px-3 py-2 text-sm mb-6"
            />

            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs uppercase tracking-wide">
                Thuộc tính sản phẩm
              </label>
              <button
                onClick={() =>
                  setEditAttributes((list) => [...list, { name: "", value: "" }])
                }
                className="text-xs underline"
              >
                + Thêm thuộc tính
              </button>
            </div>
            <p className="text-xs text-black/40 mb-3">
              Cặp tên/giá trị tự do, ví dụ: Chất liệu, Kích thước, Trọng lượng,
              Kiểu khóa...
            </p>
            <div className="space-y-2 mb-6">
              {editAttributes.length === 0 && (
                <p className="text-xs text-black/30 italic">
                  Chưa có thuộc tính nào.
                </p>
              )}
              {editAttributes.map((attr, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={attr.name}
                    onChange={(e) => updateAttribute(i, "name", e.target.value)}
                    placeholder="Tên (VD: Chất liệu)"
                    className="w-1/3 border border-black/20 px-2 py-1.5 text-xs"
                  />
                  <input
                    value={attr.value}
                    onChange={(e) => updateAttribute(i, "value", e.target.value)}
                    placeholder="Giá trị (VD: 18k Gold Vermeil)"
                    className="flex-1 border border-black/20 px-2 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => removeAttribute(i)}
                    className="text-xs text-red-700 shrink-0"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditing(null)}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setProducts((list) =>
                    list.map((p) =>
                      p.slug === editing.slug
                        ? { ...p, attributes: editAttributes }
                        : p
                    )
                  );
                  setEditing(null);
                }}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
