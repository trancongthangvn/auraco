"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import { apiFetch, ApiError } from "@/lib/api";
import { StarRating } from "@/components/icons";
import Button from "@/components/admin/ui/Button";
import IconButton from "@/components/admin/ui/IconButton";
import { Select } from "@/components/admin/ui/Field";

type ReviewStatus = "Chờ duyệt" | "Đã duyệt" | "Từ chối";

const STATUSES: ReviewStatus[] = ["Chờ duyệt", "Đã duyệt", "Từ chối"];

type ProductReview = {
  id: number;
  product_id: number;
  product_name: string;
  customer_name: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN");
}

export default function AdminReviewsPage() {
  const { session } = useAdminAuth();
  useRequireAdmin();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewStatus | "Tất cả">("Tất cả");

  const isAdmin = session?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<ProductReview[]>("/api/admin/reviews");
        if (!cancelled) setReviews(data);
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

  const updateStatus = async (id: number, status: ReviewStatus) => {
    try {
      const updated = await apiFetch<ProductReview>(`/api/admin/reviews/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setReviews((list) => list.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể cập nhật");
    }
  };

  const remove = async (id: number) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      setReviews((list) => list.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể xóa");
    }
  };

  const visible =
    filter === "Tất cả" ? reviews : reviews.filter((r) => r.status === filter);

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {reviews.filter((r) => r.status === "Chờ duyệt").length} chờ duyệt /{" "}
          {reviews.length} tổng
        </span>
      </PageHeader>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["Tất cả", ...STATUSES] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? "primary" : "secondary"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {loading && <p className="text-sm text-black/40 py-8 text-center">Đang tải...</p>}
      {error && <p className="text-sm text-red-700 py-4">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3">
          {visible.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-black/10 shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                <div>
                  <p className="text-sm font-medium">{r.product_name}</p>
                  <p className="text-xs text-black/40">
                    {r.customer_name} · {formatDate(r.created_at)}
                  </p>
                </div>
                <StarRating rating={r.rating} size={13} />
              </div>
              <p className="text-sm text-black/70 mb-3">{r.comment}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Select
                  value={r.status}
                  onChange={(e) => updateStatus(r.id, e.target.value as ReviewStatus)}
                  className="!w-auto text-xs px-2.5 py-1.5"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <IconButton
                  tone="danger"
                  onClick={() => remove(r.id)}
                  disabled={!isAdmin}
                  title={!isAdmin ? "Chỉ Quản trị viên được xóa đánh giá" : "Xóa"}
                  aria-label="Xóa"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </IconButton>
              </div>
            </div>
          ))}

          {visible.length === 0 && (
            <p className="text-sm text-black/40 py-8 text-center">
              Không có đánh giá nào ở trạng thái này.
            </p>
          )}
        </div>
      )}
    </AdminShell>
  );
}
