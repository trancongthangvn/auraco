"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import Button from "@/components/admin/ui/Button";
import Badge from "@/components/admin/ui/Badge";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";
import { Input, Label } from "@/components/admin/ui/Field";
import ImageField from "@/components/admin/ImageField";

// Methods the customer pays by scanning a QR code and then uploading a
// screenshot as proof (see CheckoutClient's post-order panel). Only these
// have anywhere to show a QR image, so only these get the QR uploader —
// card/PayPal/Airwallex are processed by the gateway itself.
const QR_METHOD_KEYS = ["cashapp", "zelle"];

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

  // Per-method draft of the editable fields (detail text + QR image), keyed
  // by method key. Kept separate from `settings` so typing doesn't count as
  // saved, and so Save can send only what this method actually changed.
  const [draft, setDraft] = useState<Record<string, { detail: string; qr: string | null }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const draftFor = (s: PaymentMethodSetting) =>
    draft[s.key] ?? { detail: s.detail ?? "", qr: s.qr_image_url };

  const setDraftFor = (key: string, patch: Partial<{ detail: string; qr: string | null }>) =>
    setDraft((d) => {
      const current = d[key] ?? {
        detail: settings.find((s) => s.key === key)?.detail ?? "",
        qr: settings.find((s) => s.key === key)?.qr_image_url ?? null,
      };
      return { ...d, [key]: { ...current, ...patch } };
    });

  const saveMethod = async (key: string) => {
    const current = settings.find((s) => s.key === key);
    if (!current) return;
    const d = draftFor(current);
    setSavingKey(key);
    setSettingsError(null);
    try {
      const updated = await apiFetch<PaymentMethodSetting>(
        `/api/admin/payment-methods/${key}`,
        {
          method: "PUT",
          body: JSON.stringify({ detail: d.detail, qr_image_url: d.qr }),
        }
      );
      setSettings((list) => list.map((s) => (s.key === key ? updated : s)));
      setDraft((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2500);
    } catch (err) {
      setSettingsError(err instanceof ApiError ? err.message : "Không thể lưu cấu hình");
    } finally {
      setSavingKey(null);
    }
  };

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
            settings.map((s) => {
              const d = draftFor(s);
              const dirty =
                d.detail !== (s.detail ?? "") || d.qr !== s.qr_image_url;
              return (
                <div key={s.key} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-black/40">{s.key}</p>
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

                  {/* Editable config. The API has always accepted `detail`
                      and `qr_image_url` (PUT /admin/payment-methods/:key),
                      but this page only ever rendered the on/off toggle, so
                      there was no way for an admin to actually put a QR code
                      on the checkout page — bug report: "để admin thêm ảnh
                      để thanh toán". */}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>
                        {QR_METHOD_KEYS.includes(s.key)
                          ? "Thông tin nhận tiền (hiện ở trang thanh toán)"
                          : "Ghi chú hiển thị"}
                      </Label>
                      <Input
                        value={d.detail}
                        onChange={(e) => setDraftFor(s.key, { detail: e.target.value })}
                        placeholder={
                          s.key === "cashapp"
                            ? "VD: $AuraCoShop"
                            : s.key === "zelle"
                              ? "VD: payments@auraco.com"
                              : ""
                        }
                      />
                      <p className="mt-2 text-xs text-black/40">
                        {QR_METHOD_KEYS.includes(s.key)
                          ? "Khách nhìn thấy dòng này ngay dưới mã QR khi thanh toán."
                          : "Chỉ hiển thị nội bộ trong trang quản trị."}
                      </p>
                    </div>

                    {QR_METHOD_KEYS.includes(s.key) && (
                      <div>
                        <ImageField
                          label="Ảnh mã QR nhận tiền"
                          hint="Khách quét mã này để chuyển tiền, sau đó tải ảnh chụp màn hình lên làm bằng chứng."
                          value={d.qr}
                          onChange={(url) => setDraftFor(s.key, { qr: url })}
                          disabled={savingKey === s.key}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => saveMethod(s.key)}
                      disabled={!dirty || savingKey === s.key}
                    >
                      {savingKey === s.key ? "Đang lưu..." : "Lưu"}
                    </Button>
                    {savedKey === s.key && (
                      <span className="text-xs text-green-700">Đã lưu</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Cash App và Zelle là thanh toán thủ công: khách quét mã QR cấu hình ở
        trên, chuyển tiền rồi tải ảnh chụp màn hình lên; giao dịch nằm ở tab
        &ldquo;Lịch sử giao dịch&rdquo; chờ quản trị viên duyệt.
      </p>
    </AdminShell>
  );
}
