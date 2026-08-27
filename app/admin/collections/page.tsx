"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";

type Collection = {
  id: number;
  slug: string;
  name: string;
  image_url: string | null;
  href: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminCollectionsPage() {
  const { session } = useAdminAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.role === "admin";

  const load = () => {
    setLoading(true);
    setError(null);
    apiFetch<Collection[]>("/api/collections/admin")
      .then((data) => setCollections(data))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Không thể tải collections");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  const remove = async (c: Collection) => {
    if (!isAdmin) return;
    if (!confirm(`Xóa collection "${c.name}"?`)) return;
    try {
      await apiFetch(`/api/collections/admin/${c.id}`, { method: "DELETE" });
      setCollections((list) => list.filter((item) => item.id !== c.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Xóa thất bại");
    }
  };

  const saveEdit = async (form: { name: string; href: string }) => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await apiFetch<Collection>(
        `/api/collections/admin/${editing.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ name: form.name, href: form.href }),
        }
      );
      setCollections((list) =>
        list.map((c) => (c.id === updated.id ? updated : c))
      );
      setEditing(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const createCollection = async (form: { name: string; href: string }) => {
    setSaving(true);
    try {
      const slug = form.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const created = await apiFetch<Collection>("/api/collections/admin", {
        method: "POST",
        body: JSON.stringify({ slug, name: form.name, href: form.href }),
      });
      setCollections((list) => [...list, created]);
      setCreating(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Tạo collection thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {collections.length} bộ sưu tập
        </span>
        <button
          onClick={() => setCreating(true)}
          className="text-sm border border-[#2b261f] px-4 py-2 hover:bg-[#2b261f] hover:text-white transition-colors"
        >
          + Thêm collection
        </button>
      </PageHeader>

      {loading && <div className="text-sm text-black/50 py-6">Đang tải...</div>}
      {error && !loading && (
        <div className="text-sm text-red-700 py-6">{error}</div>
      )}

      {!loading && !error && (
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
                <tr key={c.id} className="border-b border-black/5">
                  <td className="py-2 px-4">
                    <div className="relative h-10 w-10 bg-[#f5f2ee]">
                      {c.image_url && (
                        <Image
                          src={c.image_url}
                          alt={c.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
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
                      onClick={() => remove(c)}
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
      )}

      {editing && (
        <EditModal
          key={editing.id}
          title="Sửa collection"
          submitLabel="Lưu thay đổi"
          initialName={editing.name}
          initialHref={editing.href ?? ""}
          saving={saving}
          onCancel={() => setEditing(null)}
          onSubmit={saveEdit}
        />
      )}

      {creating && (
        <EditModal
          title="Thêm collection mới"
          submitLabel="Tạo collection"
          initialName=""
          initialHref=""
          saving={saving}
          onCancel={() => setCreating(false)}
          onSubmit={createCollection}
        />
      )}

      <p className="text-xs text-black/40 mt-4">
        Thêm/sửa/xóa ở đây ghi trực tiếp vào cơ sở dữ liệu.
      </p>
    </AdminShell>
  );
}

function EditModal({
  title,
  submitLabel,
  initialName,
  initialHref,
  saving,
  onCancel,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initialName: string;
  initialHref: string;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (form: { name: string; href: string }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [href, setHref] = useState(initialHref);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
      <div className="bg-white p-6 w-full max-w-md">
        <h2 className="text-lg font-medium mb-4">{title}</h2>
        <label className="block text-xs uppercase tracking-wide mb-2">
          Tên hiển thị
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
        />
        <label className="block text-xs uppercase tracking-wide mb-2">
          Đường dẫn (href)
        </label>
        <input
          value={href}
          onChange={(e) => setHref(e.target.value)}
          className="w-full border border-black/20 px-3 py-2 text-sm mb-6"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="text-sm px-4 py-2 border border-black/20"
          >
            Hủy
          </button>
          <button
            onClick={() => onSubmit({ name, href })}
            disabled={saving || !name.trim()}
            className="text-sm px-4 py-2 bg-[#2b261f] text-white disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
