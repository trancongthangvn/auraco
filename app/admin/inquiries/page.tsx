"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { inquiries as initialInquiries, type Inquiry } from "@/data/admin";
import { Mail, Phone, Trash2, ChevronDown } from "lucide-react";

export default function AdminInquiriesPage() {
  const { session } = useAdminAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Inquiry | null>(null);

  const isAdmin = session?.role === "admin";

  const toggleResolved = (id: string) => {
    setInquiries((list) =>
      list.map((i) => (i.id === id ? { ...i, resolved: !i.resolved } : i))
    );
  };

  const remove = (id: string) => {
    setInquiries((list) => list.filter((i) => i.id !== id));
    setConfirmDelete(null);
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {inquiries.filter((i) => !i.resolved).length} chưa xử lý / {inquiries.length} tổng
        </span>
      </PageHeader>

      <div className="space-y-3">
        {inquiries.map((i) => {
          const open = expanded === i.id;
          return (
            <div key={i.id} className="bg-white border border-black/10">
              <button
                onClick={() => setExpanded(open ? null : i.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className={`shrink-0 h-2 w-2 rounded-full ${
                    i.resolved ? "bg-black/20" : "bg-gold"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">
                    {i.subject}
                    <span className="text-black/40"> — {i.name}</span>
                  </p>
                  <p className="text-xs text-black/40">{i.date}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-black/30 shrink-0 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open && (
                <div className="px-4 pb-4 border-t border-black/5 pt-3">
                  <p className="text-sm text-black/70 mb-3 whitespace-pre-line">
                    {i.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-black/60">
                    <a
                      href={`mailto:${i.email}`}
                      className="flex items-center gap-1.5 hover:text-black"
                    >
                      <Mail size={13} /> {i.email}
                    </a>
                    <a
                      href={`tel:${i.phone}`}
                      className="flex items-center gap-1.5 hover:text-black"
                    >
                      <Phone size={13} /> {i.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleResolved(i.id)}
                      className={`text-xs px-3 py-1.5 border ${
                        i.resolved
                          ? "border-black/30 text-black/40"
                          : "border-green-700 text-green-700"
                      }`}
                    >
                      {i.resolved ? "Đánh dấu chưa xử lý" : "Đánh dấu đã xử lý"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(i)}
                      disabled={!isAdmin}
                      title={!isAdmin ? "Chỉ Quản trị viên được xóa" : ""}
                      className={`flex items-center gap-1.5 text-xs ${
                        isAdmin ? "text-red-700" : "text-black/20 cursor-not-allowed"
                      }`}
                    >
                      <Trash2 size={13} /> Xóa
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {inquiries.length === 0 && (
          <p className="text-sm text-black/40 py-8 text-center">
            Chưa có yêu cầu liên hệ nào.
          </p>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white p-6 w-full max-w-sm">
            <h2 className="text-lg font-medium mb-2">Xóa yêu cầu liên hệ?</h2>
            <p className="text-sm text-black/60 mb-6">
              Yêu cầu từ {confirmDelete.name} sẽ bị xóa khỏi danh sách này.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={() => remove(confirmDelete.id)}
                className="text-sm px-4 py-2 bg-red-700 text-white"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Dữ liệu minh họa cho form Liên hệ trên website, thay đổi chỉ lưu tạm
        trong phiên demo.
      </p>
    </AdminShell>
  );
}
