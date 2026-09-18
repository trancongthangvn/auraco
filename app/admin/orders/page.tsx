"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderStatus } from "@/data/admin";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";
import { Input, Label, Select } from "@/components/admin/ui/Field";
import Badge from "@/components/admin/ui/Badge";
import Button from "@/components/admin/ui/Button";

const STATUSES: OrderStatus[] = ["Đang xử lý", "Đã giao", "Đã hủy"];

const STATUS_TONE: Record<OrderStatus, "success" | "warning" | "danger"> = {
  "Đang xử lý": "warning",
  "Đã giao": "success",
  "Đã hủy": "danger",
};

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "card", label: "Thẻ tín dụng" },
  { value: "paypal", label: "PayPal" },
  { value: "cashapp", label: "Cash App" },
  { value: "zelle", label: "Zelle" },
  { value: "airwallex", label: "Airwallex" },
  { value: "payos", label: "PayOS" },
];

type AdminOrder = {
  id: number;
  order_code: string;
  customer_name: string;
  email: string;
  phone?: string;
  total: string;
  status: OrderStatus;
  payment_method?: string;
  created_at: string;
};

type Filters = { q: string; status: string; payment: string; from: string; to: string };
const EMPTY_FILTERS: Filters = { q: "", status: "", payment: "", from: "", to: "" };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Request: filter by order code/name/email/phone, status, payment method
  // and date range. Filtering runs server-side (GET /admin/orders), so it
  // searches every order, not just the 100 rows a page loads. `draft` is
  // what the admin is typing; `applied` is what was last searched, only
  // replaced on Lọc / Enter so each keystroke doesn't fire a request.
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const hasFilters = Object.values(applied).some((v) => v !== "");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ limit: "100" });
    if (applied.q.trim()) params.set("q", applied.q.trim());
    if (applied.status) params.set("status", applied.status);
    if (applied.payment) params.set("payment_method", applied.payment);
    if (applied.from) params.set("date_from", applied.from);
    if (applied.to) params.set("date_to", applied.to);
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    apiFetch<{ orders: AdminOrder[]; total: number; page: number; limit: number }>(
      `/api/admin/orders?${params.toString()}`
    )
      .then((data) => {
        if (cancelled) return;
        setOrders(data.orders);
        setTotal(data.total);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Đã có lỗi xảy ra");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied]);

  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));

  const updateStatus = async (id: number, status: OrderStatus) => {
    const previous = orders;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await apiFetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      setOrders(previous);
      setError(err instanceof ApiError ? err.message : "Không thể cập nhật trạng thái");
    }
  };

  return (
    <AdminShell>
      <PageHeader />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
        }}
        className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]"
      >
        <div>
          <Label>Tìm kiếm</Label>
          <Input
            value={draft.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Mã đơn, tên, email, SĐT"
          />
        </div>
        <div>
          <Label>Trạng thái</Label>
          <Select value={draft.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">Tất cả</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Thanh toán</Label>
          <Select value={draft.payment} onChange={(e) => set({ payment: e.target.value })}>
            <option value="">Tất cả</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Từ ngày</Label>
          <Input
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(e) => set({ from: e.target.value })}
          />
        </div>
        <div>
          <Label>Đến ngày</Label>
          <Input
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(e) => set({ to: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">Lọc</Button>
          {hasFilters && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDraft(EMPTY_FILTERS);
                setApplied(EMPTY_FILTERS);
              }}
            >
              Xóa lọc
            </Button>
          )}
        </div>
      </form>

      {!loading && !error && (
        <p className="mb-3 text-xs text-black/50">
          {hasFilters ? `Tìm thấy ${total} đơn hàng` : `Tổng ${total} đơn hàng`}
          {total > orders.length ? ` - đang hiện ${orders.length} đơn mới nhất` : ""}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-black/50">Đang tải...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : orders.length === 0 ? (
        <TableCard>
          <EmptyState>
            {hasFilters ? "Không có đơn hàng nào khớp bộ lọc." : "Chưa có đơn hàng nào."}
          </EmptyState>
        </TableCard>
      ) : (
        <TableCard>
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="border-b border-black/10">
                <Th>Mã đơn</Th>
                <Th>Khách hàng</Th>
                <Th>Ngày đặt</Th>
                <Th>Thanh toán</Th>
                <Th align="right">Giá trị</Th>
                <Th align="right">Trạng thái</Th>
                <Th align="right">Chi tiết</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className={TR_HOVER}>
                  <Td className="font-medium text-[#2b261f]">{o.order_code}</Td>
                  <Td>
                    <div>{o.customer_name}</div>
                    <div className="text-xs text-black/45">{o.email}</div>
                  </Td>
                  <Td>{new Date(o.created_at).toLocaleDateString("vi-VN")}</Td>
                  <Td>
                    {PAYMENT_METHODS.find((m) => m.value === o.payment_method)?.label ??
                      o.payment_method}
                  </Td>
                  <Td align="right">${parseFloat(o.total).toFixed(2)}</Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-2">
                      <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                      <Select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                        className="!w-auto !py-1.5 !px-2 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-xl border border-black/15 bg-white px-3 text-xs font-medium text-[#2b261f] transition-all duration-150 ease-out hover:border-black/30 hover:bg-black/[0.03] active:scale-[0.97]"
                    >
                      Xem
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </AdminShell>
  );
}
