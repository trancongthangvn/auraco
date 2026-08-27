"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { productReviews as initialReviews, type ReviewStatus } from "@/data/admin";
import { StarRating } from "@/components/icons";

const STATUSES: ReviewStatus[] = ["Chờ duyệt", "Đã duyệt", "Từ chối"];

export default function AdminReviewsPage() {
  const { session } = useAdminAuth();
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState<ReviewStatus | "Tất cả">("Tất cả");

  const isAdmin = session?.role === "admin";

  const updateStatus = (id: string, status: ReviewStatus) => {
    setReviews((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const remove = (id: string) => {
    if (!isAdmin) return;
    setReviews((list) => list.filter((r) => r.id !== id));
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
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 border ${
              filter === s
                ? "border-[#2b261f] bg-[#2b261f] text-white"
                : "border-black/20 text-black/60"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((r) => (
          <div key={r.id} className="bg-white border border-black/10 p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
              <div>
                <p className="text-sm font-medium">{r.productName}</p>
                <p className="text-xs text-black/40">
                  {r.customer} · {r.date}
                </p>
              </div>
              <StarRating rating={r.rating} size={13} />
            </div>
            <p className="text-sm text-black/70 mb-3">{r.comment}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={r.status}
                onChange={(e) => updateStatus(r.id, e.target.value as ReviewStatus)}
                className="text-xs border border-black/20 px-2 py-1.5"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove(r.id)}
                disabled={!isAdmin}
                title={!isAdmin ? "Chỉ Quản trị viên được xóa đánh giá" : ""}
                className={`text-xs underline ${
                  isAdmin ? "text-red-700" : "text-black/20 cursor-not-allowed"
                }`}
              >
                Xóa
              </button>
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <p className="text-sm text-black/40 py-8 text-center">
            Không có đánh giá nào ở trạng thái này.
          </p>
        )}
      </div>

      <p className="text-xs text-black/40 mt-4">
        Duyệt/từ chối/xóa ở đây chỉ minh họa giao diện, chưa ghi ngược lại vào
        đánh giá thật hiển thị trên trang sản phẩm.
      </p>
    </AdminShell>
  );
}
