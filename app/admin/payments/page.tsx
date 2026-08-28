"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import Button from "@/components/admin/ui/Button";
import Badge from "@/components/admin/ui/Badge";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";

const TABS = ["Lịch sử giao dịch", "Cấu hình phương thức"] as const;
type Tab = (typeof TABS)[number];

type PaymentMethodSetting = {
  key: string;
  label: string;
  enabled: boolean;
  detail: string;
  qr_image_url: string | null;
};

type PaymentTransaction = {
  id: number;
  order_id: number;
  method: string;
  amount: string;
  status: "Chờ xử lý" | "Đã thanh toán" | "Thất bại" | "Đã hủy";
  created_at: string;
};

export default function AdminPaymentsPage() {
  useRequireAdmin();
  const [tab, setTab] = useState<Tab>("Lịch sử giao dịch");

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);

  const [settings, setSettings] = useState<PaymentMethodSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ transactions: PaymentTransaction[] }>("/api/admin/payment-transactions")
      .then((data) => {
        if (!cancelled) setTransactions(data.transactions);
      })
      .catch((err) => {
        if (!cancelled) {
          setTxError(err instanceof ApiError ? err.message : "Không thể tải giao dịch");
        }
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch<PaymentMethodSetting[]>("/api/admin/payment-methods")
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setSettingsError(err instanceof ApiError ? err.message : "Không thể tải cấu hình");
        }
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMethod = async (key: string) => {
    const current = settings.find((s) => s.key === key);
    if (!current) return;
    const nextEnabled = !current.enabled;
    // optimistic update
    setSettings((list) =>
      list.map((s) => (s.key === key ? { ...s, enabled: nextEnabled } : s))
    );
    try {
      const updated = await apiFetch<PaymentMethodSetting>(
        `/api/admin/payment-methods/${key}`,
        {
          method: "PUT",
          body: JSON.stringify({ enabled: nextEnabled }),
        }
      );
      setSettings((list) => list.map((s) => (s.key === key ? updated : s)));
    } catch (err) {
      // revert on failure
      setSettings((list) =>
        list.map((s) => (s.key === key ? { ...s, enabled: current.enabled } : s))
      );
      setSettingsError(err instanceof ApiError ? err.message : "Không thể cập nhật phương thức");
    }
  };

  return (
    <AdminShell>
      <PageHeader />

      <div className="flex gap-1 border-b border-black/10 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
              tab === t
                ? "border-[#2b261f] text-[#2b261f]"
                : "border-transparent text-black/50 hover:text-black"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Lịch sử giao dịch" && (
        <>
          {txLoading ? (
            <p className="p-4 text-sm text-black/50">Đang tải...</p>
          ) : txError ? (
            <p className="p-4 text-sm text-red-700">{txError}</p>
          ) : (
            <TableCard>
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-black/10">
                    <Th>Đơn hàng</Th>
                    <Th>Phương thức</Th>
                    <Th align="right">Số tiền</Th>
                    <Th align="center">Trạng thái</Th>
                    <Th align="right">Thời gian</Th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className={TR_HOVER}>
                      <Td>AC-{t.order_id}</Td>
                      <Td>{t.method}</Td>
                      <Td align="right">${t.amount}</Td>
                      <Td align="center">
                        <Badge
                          tone={
                            t.status === "Đã thanh toán"
                              ? "success"
                              : t.status === "Chờ xử lý"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {t.status}
                        </Badge>
                      </Td>
                      <Td align="right" className="text-black/50 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString("vi-VN")}
                      </Td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState>Chưa có giao dịch nào.</EmptyState>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableCard>
          )}
        </>
      )}

      {tab === "Cấu hình phương thức" && (
        <div className="bg-white rounded-2xl border border-black/10 shadow-sm divide-y divide-black/10">
          {settingsLoading ? (
            <p className="p-4 text-sm text-black/50">Đang tải...</p>
          ) : settingsError ? (
            <p className="p-4 text-sm text-red-700">{settingsError}</p>
          ) : (
            settings.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-black/40">{s.detail}</p>
                </div>
                <Button
                  variant={s.enabled ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => toggleMethod(s.key)}
                  className="shrink-0"
                >
                  {s.enabled ? "Đang bật" : "Đã tắt"}
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Dữ liệu minh họa giao diện, chưa kết nối cổng thanh toán thật (PayPal,
        Cash App, Zelle...).
      </p>
    </AdminShell>
  );
}
