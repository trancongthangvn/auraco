"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import { apiFetch, ApiError } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import { Textarea } from "@/components/admin/ui/Field";
import { TableCard } from "@/components/admin/ui/Table";
import ImageField from "@/components/admin/ImageField";

type Brand = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// Necklaces / Bracelets / Earrings / Signature Sets — the ?brand= nav
// categories. Unlike collections these are a fixed set (they're wired
// one-for-one into the header nav), so there's no "add brand" here, only
// editing each one's description.
export default function AdminBrandsPage() {
  useRequireAdmin();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [imageDrafts, setImageDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiFetch<Brand[]>("/api/brands/admin")
      .then((data) => {
        setBrands(data);
        setDrafts(Object.fromEntries(data.map((b) => [b.id, b.description ?? ""])));
        setImageDrafts(Object.fromEntries(data.map((b) => [b.id, b.image_url ?? ""])));
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Không thể tải danh mục thương hiệu");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  const save = async (b: Brand) => {
    setSavingId(b.id);
    try {
      const updated = await apiFetch<Brand>(`/api/brands/admin/${b.id}`, {
        method: "PUT",
        body: JSON.stringify({
          description: drafts[b.id] || null,
          image_url: imageDrafts[b.id] || null,
        }),
      });
      setBrands((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Lưu thất bại");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">{brands.length} danh mục thương hiệu</span>
      </PageHeader>

      {loading && <div className="text-sm text-black/50 py-6">Đang tải...</div>}
      {error && !loading && <div className="text-sm text-red-700 py-6">{error}</div>}

      {!loading && !error && (
        <div className="grid gap-4">
          {brands.map((b) => {
            const dirty =
              (drafts[b.id] ?? "") !== (b.description ?? "") ||
              (imageDrafts[b.id] ?? "") !== (b.image_url ?? "");
            return (
              <TableCard key={b.id}>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-[#2b261f]">{b.name}</h3>
                    <span className="text-xs text-black/40">/catalog?brand={b.slug}</span>
                  </div>
                  <Textarea
                    value={drafts[b.id] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [b.id]: e.target.value }))
                    }
                    rows={3}
                    placeholder="Mô tả hiển thị dưới tiêu đề trên trang catalog của danh mục này"
                    className="mb-3"
                  />
                  <ImageField
                    label="Ảnh (dùng cho ô Necklaces/Bracelets/Earrings/Signature Sets ở trang chủ)"
                    value={imageDrafts[b.id] || null}
                    onChange={(url) =>
                      setImageDrafts((d) => ({ ...d, [b.id]: url ?? "" }))
                    }
                    disabled={savingId === b.id}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => save(b)}
                      disabled={!dirty || savingId === b.id}
                    >
                      {savingId === b.id ? "Đang lưu..." : "Lưu"}
                    </Button>
                  </div>
                </div>
              </TableCard>
            );
          })}
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Đây là 4 danh mục cố định trên thanh menu (Necklaces, Bracelets, Earrings, Signature Sets) — chỉ sửa được mô tả và ảnh.
      </p>
    </AdminShell>
  );
}
