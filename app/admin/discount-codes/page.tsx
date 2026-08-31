"use client";

import { useEffect, useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import { apiFetch, ApiError } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import { Input, Label } from "@/components/admin/ui/Field";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";
import Badge from "@/components/admin/ui/Badge";
import {
  ModalBackdrop,
  ModalPanel,
  ModalHeader,
  ModalFooter,
} from "@/components/admin/ui/Modal";

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
  useRequireAdmin();
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
          {codes.length} mã khuyến mãi
        </span>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Thêm mã
        </Button>
      </PageHeader>

      {error && (
        <div className="text-sm text-red-700 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-black/50">Đang tải...</div>
      ) : (
      <TableCard>
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-black/10">
              <Th>Mã</Th>
              <Th>Giá trị</Th>
              <Th>Đơn tối thiểu</Th>
              <Th>Lượt dùng</Th>
              <Th>Hiệu lực</Th>
              <Th align="center">Trạng thái</Th>
              <Th align="right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className={TR_HOVER}>
                <Td className="font-medium">{c.code}</Td>
                <Td>{c.type === "percent" ? `${c.value}%` : `$${c.value}`}</Td>
                <Td>{c.minOrder > 0 ? `$${c.minOrder}` : "Không giới hạn"}</Td>
                <Td className="whitespace-nowrap">
                  {c.used}/{c.usageLimit}
                </Td>
                <Td className="whitespace-nowrap text-black/50">
                  {c.startDate} - {c.endDate}
                </Td>
                <Td align="center">
                  <button
                    onClick={() => toggleActive(c.id)}
                    className="transition-transform duration-150 active:scale-95"
                  >
                    <Badge tone={c.active ? "success" : "neutral"}>
                      {c.active ? "Đang bật" : "Đã tắt"}
                    </Badge>
                  </button>
                </Td>
                <Td align="right" className="whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => remove(c.id)}
                      disabled={!isAdmin}
                      title={!isAdmin ? "Chỉ Quản trị viên được xóa mã" : ""}
                    >
                      Xóa
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {codes.length === 0 && <EmptyState>Chưa có mã khuyến mãi nào.</EmptyState>}
      </TableCard>
      )}

      {editing && (
        <ModalBackdrop onClose={() => setEditing(null)}>
          <ModalPanel maxWidth="max-w-md">
            <ModalHeader title="Sửa mã khuyến mãi" onClose={() => setEditing(null)} />
            <div className="px-6 py-5">
              <Label>Mã</Label>
              <Input ref={editCodeRef} defaultValue={editing.code} className="mb-4" />
              <Label>Giá trị giảm</Label>
              <Input
                ref={editValueRef}
                defaultValue={editing.value}
                type="number"
              />
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={saveEdit}>
                Lưu thay đổi
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {creating && (
        <ModalBackdrop onClose={() => setCreating(false)}>
          <ModalPanel maxWidth="max-w-md">
            <ModalHeader title="Thêm mã khuyến mãi" onClose={() => setCreating(false)} />
            <div className="px-6 py-5">
              <Label>Mã</Label>
              <Input ref={createCodeRef} placeholder="VD: AURA15" className="mb-4" />
              <Label>Giá trị giảm (%)</Label>
              <Input ref={createValueRef} type="number" />
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setCreating(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={saveCreate}>
                Tạo mã
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}

      <p className="text-xs text-black/40 mt-4">
        Mã tạo/sửa ở đây áp dụng thật ngay tại trang thanh toán.
      </p>
    </AdminShell>
  );
}
