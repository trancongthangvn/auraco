"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";

type PressMention = {
  id: number;
  name: string;
  logo_url: string | null;
  sort_order: number;
  active: boolean;
};

export default function AdminCertificatesPage() {
  const { session } = useAdminAuth();
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
        <button
          onClick={() => setCreating(true)}
          className="text-sm border border-[#2b261f] px-4 py-2 hover:bg-[#2b261f] hover:text-white transition-colors"
        >
          + Thêm logo
        </button>
      </PageHeader>

      {loading && <p className="text-sm text-black/40 py-8 text-center">Đang tải...</p>}
      {error && <p className="text-sm text-red-700 py-4">{error}</p>}

      {!loading && !error && (
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
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((m) => (
                  <tr key={m.id} className="border-b border-black/5">
                    <td className="py-2 px-4 font-medium tracking-wide">{m.name}</td>
                    <td className="py-2 px-4 text-black/50">{m.sort_order}</td>
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
      )}

      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Thêm logo báo chí</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tên báo chí / truyền thông
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="VD: VOGUE"
              className="w-full border border-black/20 px-3 py-2 text-sm mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeCreate}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={submitCreate}
                disabled={saving || !newName.trim()}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white disabled:opacity-50"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Danh sách logo hiển thị ở mục &quot;As Seen In&quot; trên trang chủ.
      </p>
    </AdminShell>
  );
}
