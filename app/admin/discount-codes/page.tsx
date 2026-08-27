"use client";

import { useEffect, useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";

type DiscountCode = {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  usageLimit: number;
  used: number;
  startDate: string;
  endDate: string;
  active: boolean;
};

export default function AdminDiscountCodesPage() {
  const { session } = useAdminAuth();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [creating, setCreating] = useState(false);

  const editCodeRef = useRef<HTMLInputElement | null>(null);
  const editValueRef = useRef<HTMLInputElement | null>(null);
  const createCodeRef = useRef<HTMLInputElement | null>(null);
  const createValueRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = session?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    apiFetch<DiscountCode[]>("/api/discount-codes/admin/discount-codes")
      .then((data) => {
        if (!cancelled) setCodes(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Không thể tải mã khuyến mãi");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleActive = async (id: number) => {
    try {
      const updated = await apiFetch<DiscountCode>(
        `/api/discount-codes/admin/discount-codes/${id}/toggle`,
        { method: "PUT" }
      );
      setCodes((list) => list.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể cập nhật trạng thái");
    }
  };

  const remove = async (id: number) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/discount-codes/admin/discount-codes/${id}`, {
        method: "DELETE",
      });
      setCodes((list) => list.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể xóa mã");
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const code = editCodeRef.current?.value ?? editing.code;
    const value = Number(editValueRef.current?.value ?? editing.value);
    try {
      const updated = await apiFetch<DiscountCode>(
        `/api/discount-codes/admin/discount-codes/${editing.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ code, value }),
        }
      );
      setCodes((list) => list.map((c) => (c.id === editing.id ? updated : c)));
      setEditing(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lưu thay đổi");
    }
  };

  const saveCreate = async () => {
    const code = createCodeRef.current?.value ?? "";
    const value = Number(createValueRef.current?.value ?? 0);
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    try {
      const created = await apiFetch<DiscountCode>(
        "/api/discount-codes/admin/discount-codes",
        {
          method: "POST",
          body: JSON.stringify({
            code,
            type: "percent",
            value,
            minOrder: 0,
            usageLimit: 0,
            startDate: today.toISOString().slice(0, 10),
            endDate: endDate.toISOString().slice(0, 10),
            active: true,
          }),
        }
      );
      setCodes((list) => [created, ...list]);
      setCreating(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo mã");
    }
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {codes.length} mã khuyến mãi, thay đổi chỉ lưu tạm trong phiên demo
        </span>
        <button
          onClick={() => setCreating(true)}
          className="text-sm border border-[#2b261f] px-4 py-2 hover:bg-[#2b261f] hover:text-white transition-colors"
        >
          + Thêm mã
        </button>
      </PageHeader>

      {error && (
        <div className="text-sm text-red-700 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-black/50">Đang tải...</div>
      ) : (
      <div className="bg-white border border-black/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4 font-normal">Mã</th>
              <th className="py-3 px-4 font-normal">Giá trị</th>
              <th className="py-3 px-4 font-normal">Đơn tối thiểu</th>
              <th className="py-3 px-4 font-normal">Lượt dùng</th>
              <th className="py-3 px-4 font-normal">Hiệu lực</th>
              <th className="py-3 px-4 font-normal text-center">Trạng thái</th>
              <th className="py-3 px-4 font-normal text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="py-2 px-4 font-medium">{c.code}</td>
                <td className="py-2 px-4">
                  {c.type === "percent" ? `${c.value}%` : `$${c.value}`}
                </td>
                <td className="py-2 px-4">
                  {c.minOrder > 0 ? `$${c.minOrder}` : "Không giới hạn"}
                </td>
                <td className="py-2 px-4 whitespace-nowrap">
                  {c.used}/{c.usageLimit}
                </td>
                <td className="py-2 px-4 whitespace-nowrap text-black/50">
                  {c.startDate} - {c.endDate}
                </td>
                <td className="py-2 px-4 text-center">
                  <button
                    onClick={() => toggleActive(c.id)}
                    className={`text-xs px-2 py-1 border ${
                      c.active
                        ? "border-green-700 text-green-700"
                        : "border-black/30 text-black/40"
                    }`}
                  >
                    {c.active ? "Đang bật" : "Đã tắt"}
                  </button>
                </td>
                <td className="py-2 px-4 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => setEditing(c)} className="text-xs underline">
                    Sửa
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    disabled={!isAdmin}
                    title={!isAdmin ? "Chỉ Quản trị viên được xóa mã" : ""}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Sửa mã khuyến mãi</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">Mã</label>
            <input
              ref={editCodeRef}
              defaultValue={editing.code}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Giá trị giảm
            </label>
            <input
              ref={editValueRef}
              defaultValue={editing.value}
              type="number"
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
                onClick={saveEdit}
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
            <h2 className="text-lg font-medium mb-4">Thêm mã khuyến mãi</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">Mã</label>
            <input
              ref={createCodeRef}
              placeholder="VD: AURA15"
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Giá trị giảm (%)
            </label>
            <input
              ref={createValueRef}
              type="number"
              className="w-full border border-black/20 px-3 py-2 text-sm mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCreating(false)}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={saveCreate}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white"
              >
                Tạo mã
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Thêm/sửa/xóa và bật/tắt ở đây chỉ minh họa giao diện, chưa kết nối vào
        cơ chế áp mã thật ở trang thanh toán.
      </p>
    </AdminShell>
  );
}
