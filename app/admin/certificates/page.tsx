"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import { apiFetch, ApiError } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import { Input, Label } from "@/components/admin/ui/Field";
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
  };

  const submitCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await apiFetch<PressMention>("/api/admin/press-mentions", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), sort_order: mentions.length }),
      });
      setMentions((list) => [...list, created]);
      closeCreate();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể thêm logo");
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
                    <Td className="font-medium tracking-wide">{m.name}</Td>
                    <Td className="text-black/50">{m.sort_order}</Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
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
                  <td colSpan={3}>
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

      <p className="text-xs text-black/40 mt-4">
        Danh sách logo hiển thị ở mục &quot;As Seen In&quot; trên trang chủ.
      </p>
    </AdminShell>
  );
}
