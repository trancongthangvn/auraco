"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import {
  paymentMethodSettings as initialSettings,
  paymentTransactions,
  type PaymentMethodSetting,
} from "@/data/admin";

const TABS = ["Lịch sử giao dịch", "Cấu hình phương thức"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<Tab>("Lịch sử giao dịch");
  const [settings, setSettings] = useState<PaymentMethodSetting[]>(initialSettings);

  const toggleMethod = (key: PaymentMethodSetting["key"]) => {
    setSettings((list) =>
      list.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
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
        <div className="bg-white border border-black/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-3 px-4 font-normal">Đơn hàng</th>
                <th className="py-3 px-4 font-normal">Phương thức</th>
                <th className="py-3 px-4 font-normal text-right">Số tiền</th>
                <th className="py-3 px-4 font-normal text-center">Trạng thái</th>
                <th className="py-3 px-4 font-normal text-right">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {paymentTransactions.map((t) => (
                <tr key={t.id} className="border-b border-black/5">
                  <td className="py-2 px-4">{t.orderId}</td>
                  <td className="py-2 px-4">{t.method}</td>
                  <td className="py-2 px-4 text-right">{t.amount}</td>
                  <td className="py-2 px-4 text-center">
                    <span
                      className={`text-xs px-2 py-1 border ${
                        t.status === "Đã thanh toán"
                          ? "border-green-700 text-green-700"
                          : t.status === "Chờ xử lý"
                          ? "border-gold text-gold"
                          : "border-red-700 text-red-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right text-black/50 whitespace-nowrap">
                    {t.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Cấu hình phương thức" && (
        <div className="bg-white border border-black/10 divide-y divide-black/10">
          {settings.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-black/40">{s.detail}</p>
              </div>
              <button
                onClick={() => toggleMethod(s.key)}
                className={`text-xs px-3 py-1.5 border shrink-0 ${
                  s.enabled
                    ? "border-green-700 text-green-700"
                    : "border-black/30 text-black/40"
                }`}
              >
                {s.enabled ? "Đang bật" : "Đã tắt"}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Dữ liệu minh họa giao diện, chưa kết nối cổng thanh toán thật (PayPal,
        Cash App, Zelle...).
      </p>
    </AdminShell>
  );
}
