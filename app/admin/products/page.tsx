"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";

type AdminProduct = {
  id: number;
  slug: string;
  name: string;
  category: string;
  material: string;
  price: number;
  compare_at_price: number | null;
  rating: number;
  review_count: number;
  images: string[];
  description: string;
  features: string[];
  stock: number;
  active: boolean;
  attributes?: AdminAttribute[];
  collections?: string[];
};

type AdminAttribute = { id?: number; name: string; value: string };

export default function AdminProductsPage() {
  const { session } = useAdminAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editAttributes, setEditAttributes] = useState<AdminAttribute[]>([]);
  const [originalAttributes, setOriginalAttributes] = useState<AdminAttribute[]>([]);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isAdmin = session?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<AdminProduct[]>("/api/products/admin/products");
        if (!cancelled) setProducts(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Không thể tải danh sách sản phẩm");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateAttribute = (
    index: number,
    field: keyof AdminAttribute,
    value: string
  ) => {
    setEditAttributes((list) =>
      list.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const removeAttribute = (index: number) => {
    setEditAttributes((list) => list.filter((_, i) => i !== index));
  };

  const openEdit = async (p: AdminProduct) => {
    setEditing(p);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setModalError(null);
    setEditAttributes(p.attributes ?? []);
    setOriginalAttributes(p.attributes ?? []);
    try {
      const attrs = await apiFetch<AdminAttribute[]>(
        `/api/products/admin/products/${p.slug}/attributes`
      );
      setEditAttributes(attrs);
      setOriginalAttributes(attrs);
    } catch {
      // fall back to the attributes already attached to the product row
    }
  };

  const toggleVisible = async (p: AdminProduct) => {
    try {
      const updated = await apiFetch<AdminProduct>(
        `/api/products/admin/products/${p.slug}`,
        {
          method: "PUT",
          body: JSON.stringify({ active: !p.active }),
        }
      );
      setProducts((list) =>
        list.map((item) => (item.slug === p.slug ? { ...item, ...updated } : item))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể cập nhật trạng thái");
    }
  };

  const remove = async (slug: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/products/admin/products/${slug}`, { method: "DELETE" });
      setProducts((list) => list.filter((p) => p.slug !== slug));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể xóa sản phẩm");
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setModalError(null);
    try {
      const parsedPrice = Number(editPrice);
      const updated = await apiFetch<AdminProduct>(
        `/api/products/admin/products/${editing.slug}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: editName,
            price: Number.isFinite(parsedPrice) ? parsedPrice : editing.price,
          }),
        }
      );

      const originalById = new Map(
        originalAttributes.filter((a) => a.id !== undefined).map((a) => [a.id, a])
      );
      const remainingIds = new Set(
        editAttributes.filter((a) => a.id !== undefined).map((a) => a.id)
      );

      const savedAttributes: AdminAttribute[] = [];

      for (const attr of editAttributes) {
        if (attr.id === undefined) {
          if (!attr.name.trim() || !attr.value.trim()) continue;
          const created = await apiFetch<AdminAttribute>(
            `/api/products/admin/products/${editing.slug}/attributes`,
            {
              method: "POST",
              body: JSON.stringify({ name: attr.name, value: attr.value }),
            }
          );
          savedAttributes.push(created);
        } else {
          const original = originalById.get(attr.id);
          if (original && original.name === attr.name && original.value === attr.value) {
            savedAttributes.push(attr);
            continue;
          }
          const result = await apiFetch<AdminAttribute>(
            `/api/products/admin/products/${editing.slug}/attributes/${attr.id}`,
            {
              method: "PUT",
              body: JSON.stringify({ name: attr.name, value: attr.value }),
            }
          );
          savedAttributes.push(result);
        }
      }

      for (const original of originalAttributes) {
        if (original.id !== undefined && !remainingIds.has(original.id)) {
          await apiFetch(
            `/api/products/admin/products/${editing.slug}/attributes/${original.id}`,
            { method: "DELETE" }
          );
        }
      }

      setProducts((list) =>
        list.map((p) =>
          p.slug === editing.slug
            ? { ...p, ...updated, attributes: savedAttributes }
            : p
        )
      );
      setEditing(null);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {loading ? "Đang tải..." : `${products.length} sản phẩm`}
        </span>
      </PageHeader>

      {error && (
        <div className="mb-4 text-xs text-red-700 border border-red-700/30 bg-red-50 px-3 py-2">
          {error}
        </div>
      )}

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
            {loading && (
              <tr>
                <td colSpan={6} className="py-6 px-4 text-center text-black/40">
                  Đang tải...
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 px-4 text-center text-black/40">
                  Chưa có sản phẩm nào.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.slug} className="border-b border-black/5">
                <td className="py-2 px-4">
                  <div className="relative h-10 w-10 bg-[#f5f2ee]">
                    {p.images?.[0] && (
                      <Image src={p.images[0]} alt={p.name} fill sizes="40px" className="object-cover" />
                    )}
                  </div>
                </td>
                <td className="py-2 px-4">{p.name}</td>
                <td className="py-2 px-4">{p.category}</td>
                <td className="py-2 px-4 text-right">${Number(p.price).toFixed(2)}</td>
                <td className="py-2 px-4 text-center">
                  <button
                    onClick={() => toggleVisible(p)}
                    className={`text-xs px-2 py-1 border ${
                      p.active
                        ? "border-green-700 text-green-700"
                        : "border-black/30 text-black/40"
                    }`}
                  >
                    {p.active ? "Đang hiển thị" : "Đã ẩn"}
                  </button>
                </td>
                <td className="py-2 px-4 text-right space-x-3">
                  <button
                    onClick={() => openEdit(p)}
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

            {modalError && (
              <div className="mb-4 text-xs text-red-700 border border-red-700/30 bg-red-50 px-3 py-2">
                {modalError}
              </div>
            )}

            <label className="block text-xs uppercase tracking-wide mb-2">
              Tên sản phẩm
            </label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Giá (USD)
            </label>
            <input
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
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
                <div key={attr.id ?? `new-${i}`} className="flex gap-2">
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
                disabled={saving}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
