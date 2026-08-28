"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import IconButton from "@/components/admin/ui/IconButton";
import { Input, Label } from "@/components/admin/ui/Field";
import VideoField from "@/components/admin/VideoField";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";
import {
  ModalBackdrop,
  ModalPanel,
  ModalHeader,
  ModalFooter,
} from "@/components/admin/ui/Modal";

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
  video_url: string | null;
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
  const [editVideoUrl, setEditVideoUrl] = useState<string | null>(null);
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
    setEditVideoUrl(p.video_url ?? null);
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
            videoUrl: editVideoUrl,
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
        <div className="mb-4 text-xs text-red-700 border border-red-700/30 bg-red-50 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <TableCard>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-black/10">
              <Th>Ảnh</Th>
              <Th>Tên sản phẩm</Th>
              <Th>Danh mục</Th>
              <Th align="right">Giá</Th>
              <Th align="center">Trạng thái</Th>
              <Th align="right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>
                  <EmptyState>Đang tải...</EmptyState>
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState>Chưa có sản phẩm nào.</EmptyState>
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.slug} className={TR_HOVER}>
                <Td>
                  <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-[#f5f2ee]">
                    {p.images?.[0] && (
                      <Image src={p.images[0]} alt={p.name} fill sizes="40px" className="object-cover" />
                    )}
                  </div>
                </Td>
                <Td>{p.name}</Td>
                <Td>{p.category}</Td>
                <Td align="right">${Number(p.price).toFixed(2)}</Td>
                <Td align="center">
                  <button
                    onClick={() => toggleVisible(p)}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap border transition-all duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                      p.active
                        ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        : "border-black/15 bg-black/5 text-black/40 hover:bg-black/10"
                    }`}
                  >
                    {p.active ? "Đang hiển thị" : "Đã ẩn"}
                  </button>
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => remove(p.slug)}
                      disabled={!isAdmin}
                      title={!isAdmin ? "Chỉ Quản trị viên được xóa sản phẩm" : ""}
                    >
                      Xóa
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {editing && (
        <ModalBackdrop onClose={() => setEditing(null)}>
          <ModalPanel maxWidth="max-w-lg">
            <ModalHeader title="Sửa sản phẩm" onClose={() => setEditing(null)} />
            <div className="px-6 py-4">
              {modalError && (
                <div className="mb-4 text-xs text-red-700 border border-red-700/30 bg-red-50 rounded-xl px-3 py-2">
                  {modalError}
                </div>
              )}

              <Label>Tên sản phẩm</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mb-4"
              />
              <Label>Giá (USD)</Label>
              <Input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                type="number"
                className="mb-6"
              />

              <div className="mb-6">
                <VideoField
                  label="Video sản phẩm"
                  hint="Video MP4 ngắn, lặp — hiển thị ở băng video trên trang chủ. Để trống nếu sản phẩm không có video."
                  value={editVideoUrl}
                  onChange={setEditVideoUrl}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <Label className="mb-0">Thuộc tính sản phẩm</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEditAttributes((list) => [...list, { name: "", value: "" }])
                  }
                >
                  + Thêm thuộc tính
                </Button>
              </div>
              <p className="text-xs text-black/40 mb-3">
                Cặp tên/giá trị tự do, ví dụ: Chất liệu, Kích thước, Trọng lượng,
                Kiểu khóa...
              </p>
              <div className="space-y-2 mb-2">
                {editAttributes.length === 0 && (
                  <p className="text-xs text-black/30 italic">
                    Chưa có thuộc tính nào.
                  </p>
                )}
                {editAttributes.map((attr, i) => (
                  <div key={attr.id ?? `new-${i}`} className="flex gap-2">
                    <Input
                      value={attr.name}
                      onChange={(e) => updateAttribute(i, "name", e.target.value)}
                      placeholder="Tên (VD: Chất liệu)"
                      className="w-1/3 text-xs"
                    />
                    <Input
                      value={attr.value}
                      onChange={(e) => updateAttribute(i, "value", e.target.value)}
                      placeholder="Giá trị (VD: 18k Gold Vermeil)"
                      className="flex-1 text-xs"
                    />
                    <IconButton
                      type="button"
                      tone="danger"
                      className="shrink-0"
                      aria-label="Xóa thuộc tính"
                      onClick={() => removeAttribute(i)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </IconButton>
                  </div>
                ))}
              </div>
            </div>

            <ModalFooter>
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
                Hủy
              </Button>
              <Button variant="primary" onClick={saveEdit} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}
    </AdminShell>
  );
}
