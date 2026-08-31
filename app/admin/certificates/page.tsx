"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import { apiFetch, ApiError } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import { Input, Label } from "@/components/admin/ui/Field";
import ImageField from "@/components/admin/ImageField";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";
import { ModalBackdrop, ModalPanel, ModalHeader, ModalFooter } from "@/components/admin/ui/Modal";

type PressMention = {
  id: number;
  name: string;
  logo_url: string | null;
  sort_order: number;
  active: boolean;
};

export default function AdminCertificatesPage() {
  const { session } = useAdminAuth();
  useRequireAdmin();
  const [mentions, setMentions] = useState<PressMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState<PressMention | null>(null);
  const [editName, setEditName] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<PressMention[]>("/api/press-mentions");
        if (!cancelled) setMentions(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Không thể tải dữ liệu");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = async (id: number) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/admin/press-mentions/${id}`, { method: "DELETE" });
      setMentions((list) => list.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể xóa");
    }
  };

  const closeCreate = () => {
    setCreating(false);
    setNewName("");
    setNewLogoUrl(null);
  };

  const submitCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await apiFetch<PressMention>("/api/admin/press-mentions", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          logo_url: newLogoUrl,
          sort_order: mentions.length,
        }),
      });
      setMentions((list) => [...list, created]);
      closeCreate();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể thêm logo");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (m: PressMention) => {
    setEditing(m);
    setEditName(m.name);
    setEditLogoUrl(m.logo_url);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditName("");
    setEditLogoUrl(null);
  };

  const submitEdit = async () => {
    if (!editing || !editName.trim()) return;
    setSaving(true);
    try {
      const updated = await apiFetch<PressMention>(`/api/admin/press-mentions/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim(), logo_url: editLogoUrl }),
      });
      setMentions((list) => list.map((m) => (m.id === updated.id ? updated : m)));
      closeEdit();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {mentions.length} logo báo chí
        </span>
        <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
          + Thêm logo
        </Button>
      </PageHeader>

      {loading && <p className="text-sm text-black/40 py-8 text-center">Đang tải...</p>}
      {error && <p className="text-sm text-red-700 py-4">{error}</p>}

      {!loading && !error && (
        <TableCard>
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-black/10">
                <Th>Ảnh</Th>
                <Th>Tên báo chí</Th>
                <Th>Thứ tự</Th>
                <Th align="right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {mentions
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((m) => (
                  <tr key={m.id} className={TR_HOVER}>
                    <Td>
                      <div className="relative h-10 w-16 overflow-hidden rounded-lg bg-[#f5f2ee]">
                        {m.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail, not worth next/image's config here
                          <img
                            src={m.logo_url}
                            alt={m.name}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                    </Td>
                    <Td className="font-medium tracking-wide">{m.name}</Td>
                    <Td className="text-black/50">{m.sort_order}</Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          Sửa
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => remove(m.id)}
                          disabled={!isAdmin}
                          title={!isAdmin ? "Chỉ Quản trị viên được xóa" : ""}
                        >
                          Xóa
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              {mentions.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState>Chưa có logo báo chí nào.</EmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>
      )}

      {creating && (
        <ModalBackdrop onClose={closeCreate}>
          <ModalPanel maxWidth="max-w-md">
            <ModalHeader title="Thêm logo báo chí" onClose={closeCreate} />
            <div className="px-6 py-5">
              <Label>Tên báo chí / truyền thông</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: VOGUE"
                autoFocus
                className="mb-4"
              />
              <ImageField
                label="Logo"
                value={newLogoUrl}
                onChange={setNewLogoUrl}
                disabled={saving}
              />
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={closeCreate}>
                Hủy
              </Button>
              <Button variant="primary" onClick={submitCreate} disabled={saving || !newName.trim()}>
                Thêm
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {editing && (
        <ModalBackdrop onClose={closeEdit}>
          <ModalPanel maxWidth="max-w-md">
            <ModalHeader title="Sửa logo báo chí" onClose={closeEdit} />
            <div className="px-6 py-5">
              <Label>Tên báo chí / truyền thông</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                className="mb-4"
              />
              <ImageField
                label="Logo"
                value={editLogoUrl}
                onChange={setEditLogoUrl}
                disabled={saving}
              />
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={closeEdit}>
                Hủy
              </Button>
              <Button variant="primary" onClick={submitEdit} disabled={saving || !editName.trim()}>
                Lưu thay đổi
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}

      <p className="text-xs text-black/40 mt-4">
        Danh sách logo hiển thị ở mục &quot;As Seen In&quot; trên trang chủ.
      </p>
    </AdminShell>
  );
}
