"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import { apiFetch, ApiError } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import { Input, Label } from "@/components/admin/ui/Field";
import ImageField from "@/components/admin/ImageField";
import { TableCard, Th, Td, TR_HOVER } from "@/components/admin/ui/Table";
import {
  ModalBackdrop,
  ModalPanel,
  ModalHeader,
  ModalFooter,
} from "@/components/admin/ui/Modal";

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
  useRequireAdmin();
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

  const saveEdit = async (form: { name: string; href: string; image_url: string }) => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await apiFetch<Collection>(
        `/api/collections/admin/${editing.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ name: form.name, href: form.href, image_url: form.image_url || null }),
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

  const createCollection = async (form: { name: string; href: string; image_url: string }) => {
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
        body: JSON.stringify({
          slug,
          name: form.name,
          href: form.href,
          image_url: form.image_url || null,
        }),
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
        <Button variant="secondary" onClick={() => setCreating(true)}>
          + Thêm collection
        </Button>
      </PageHeader>

      {loading && <div className="text-sm text-black/50 py-6">Đang tải...</div>}
      {error && !loading && (
        <div className="text-sm text-red-700 py-6">{error}</div>
      )}

      {!loading && !error && (
        <TableCard>
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-black/10">
                <Th>Ảnh</Th>
                <Th>Tên</Th>
                <Th>Đường dẫn</Th>
                <Th align="right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c) => (
                <tr key={c.id} className={TR_HOVER}>
                  <Td>
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-[#f5f2ee]">
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
                  </Td>
                  <Td>{c.name}</Td>
                  <Td className="text-black/40">{c.href}</Td>
                  <Td align="right" className="whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => remove(c)}
                        disabled={!isAdmin}
                        title={!isAdmin ? "Chỉ Quản trị viên được xóa collection" : ""}
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
      )}

      {editing && (
        <EditModal
          key={editing.id}
          title="Sửa collection"
          submitLabel="Lưu thay đổi"
          initialName={editing.name}
          initialHref={editing.href ?? ""}
          initialImageUrl={editing.image_url ?? ""}
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
          initialImageUrl=""
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
  initialImageUrl,
  saving,
  onCancel,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initialName: string;
  initialHref: string;
  initialImageUrl: string;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (form: { name: string; href: string; image_url: string }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [href, setHref] = useState(initialHref);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);

  return (
    <ModalBackdrop onClose={onCancel}>
      <ModalPanel maxWidth="max-w-md">
        <ModalHeader title={title} onClose={onCancel} />
        <div className="px-6 py-4">
          <Label>Tên hiển thị</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-4"
          />
          <Label>Đường dẫn (href)</Label>
          <Input
            value={href}
            onChange={(e) => setHref(e.target.value)}
            className="mb-4"
          />
          <ImageField
            label="Ảnh collection"
            value={imageUrl || null}
            onChange={(url) => setImageUrl(url ?? "")}
            disabled={saving}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={() => onSubmit({ name, href, image_url: imageUrl })}
            disabled={saving || !name.trim()}
          >
            {submitLabel}
          </Button>
        </ModalFooter>
      </ModalPanel>
    </ModalBackdrop>
  );
}
