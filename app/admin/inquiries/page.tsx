"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import { Mail, Phone, Trash2, ChevronDown } from "lucide-react";

type Inquiry = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN");
}

export default function AdminInquiriesPage() {
  const { session } = useAdminAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Inquiry | null>(null);

  const isAdmin = session?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<Inquiry[]>("/api/admin/inquiries");
        if (!cancelled) setInquiries(data);
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

  const toggleResolved = async (i: Inquiry) => {
    try {
      const updated = await apiFetch<Inquiry>(`/api/admin/inquiries/${i.id}`, {
        method: "PUT",
        body: JSON.stringify({ resolved: !i.resolved }),
      });
      setInquiries((list) => list.map((x) => (x.id === i.id ? updated : x)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể cập nhật");
    }
  };

  const remove = async (id: number) => {
    try {
      await apiFetch(`/api/admin/inquiries/${id}`, { method: "DELETE" });
      setInquiries((list) => list.filter((i) => i.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể xóa");
    }
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {inquiries.filter((i) => !i.resolved).length} chưa xử lý / {inquiries.length} tổng
        </span>
      </PageHeader>

      {loading && <p className="text-sm text-black/40 py-8 text-center">Đang tải...</p>}
      {error && <p className="text-sm text-red-700 py-4">{error}</p>}

      {!loading && !error && (
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
                      <span className="text-black/40"> ({i.name})</span>
                    </p>
                    <p className="text-xs text-black/40">{formatDate(i.created_at)}</p>
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
                      {i.phone && (
                        <a
                          href={`tel:${i.phone}`}
                          className="flex items-center gap-1.5 hover:text-black"
                        >
                          <Phone size={13} /> {i.phone}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleResolved(i)}
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
      )}

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
    </AdminShell>
  );
}
