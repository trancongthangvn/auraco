"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import { apiFetch, ApiError } from "@/lib/api";
import { StarIcon, StarRating } from "@/components/icons";
import Button from "@/components/admin/ui/Button";
import IconButton from "@/components/admin/ui/IconButton";
import { Input, Label, Select, Textarea } from "@/components/admin/ui/Field";
import { ModalBackdrop, ModalFooter, ModalHeader, ModalPanel } from "@/components/admin/ui/Modal";
import ImageField from "@/components/admin/ImageField";

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
  photo_url: string | null;
};

type ProductOption = { id: number; name: string; review_count_override: number | null };

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN");
}

/** Clickable 1-5 star input — same visual language as StarRating (read-only)
 *  elsewhere in this admin, just interactive. */
function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            aria-label={`${n} sao`}
            className="disabled:cursor-not-allowed"
          >
            <StarIcon
              size={20}
              filled={n <= value}
              className={n <= value ? "text-[#f0b429]" : "text-black/20"}
            />
          </button>
        );
      })}
    </span>
  );
}

/** Product search + single-select for the create form — a review must
 *  belong to exactly one product, and this list can be long, so a search
 *  box beats a giant native <select>. Not shown on edit: reassigning an
 *  existing review to a different product isn't a case this was asked
 *  for, and product_name is denormalized onto the row (see server route),
 *  so silently changing product_id without also updating product_name
 *  would leave them inconsistent. */
function ProductPickerField({
  products,
  productId,
  productName,
  onSelect,
  disabled,
}: {
  products: ProductOption[];
  productId: number | null;
  productName: string;
  onSelect: (id: number, name: string) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");

  if (productId) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-black/15 bg-black/[0.03] px-3.5 py-2.5 text-sm">
        <span className="flex-1 truncate">{productName}</span>
        <button
          type="button"
          onClick={() => onSelect(0, "")}
          disabled={disabled}
          className="text-xs text-black/50 hover:text-black underline underline-offset-2 disabled:cursor-not-allowed"
        >
          Đổi
        </button>
      </div>
    );
  }

  const candidates = products.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm sản phẩm theo tên..."
        disabled={disabled}
        className="mb-2 text-xs"
      />
      {search.trim() && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-black/10 p-1">
          {candidates.length === 0 && (
            <p className="text-xs text-black/30 italic px-2 py-1.5">
              Không tìm thấy sản phẩm nào khớp &quot;{search}&quot;.
            </p>
          )}
          {candidates.slice(0, 20).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p.id, p.name);
                setSearch("");
              }}
              className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-black/[0.03]"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_CREATE_FORM = {
  product_id: null as number | null,
  product_name: "",
  customer_name: "",
  rating: 5,
  comment: "",
  // Displayed review count for the whole product (not for this one review) —
  // what shows in brackets beside the stars on the public product page.
  // Empty string = no override, i.e. keep showing the real derived count.
  review_count_override: "",
  status: "Đã duyệt" as ReviewStatus,
};

/** "" -> null (clear the override); "279" -> 279. Validated before send. */
function parseCountInput(raw: string): number | null {
  return raw.trim() === "" ? null : Number(raw.trim());
}

/** Rejects anything that is not empty or a whole number >= 0. */
function countInputInvalid(raw: string) {
  const t = raw.trim();
  if (t === "") return false;
  return !/^\d+$/.test(t);
}

export default function AdminReviewsPage() {
  const { session } = useAdminAuth();
  useRequireAdmin();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewStatus | "Tất cả">("Tất cả");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  const isAdmin = session?.role === "admin";

  /** The product's current displayed-count override as a form string ("" = none). */
  const currentOverrideFor = (productId: number | null) => {
    if (!productId) return "";
    const p = productOptions.find((o) => o.id === productId);
    return p?.review_count_override != null ? String(p.review_count_override) : "";
  };

  /** Keeps the in-memory product list in step after a save, so reopening a
   *  modal shows the number that was just written rather than the stale one. */
  const rememberOverride = (productId: number, value: number | null) => {
    setProductOptions((list) =>
      list.map((o) => (o.id === productId ? { ...o, review_count_override: value } : o))
    );
  };

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

  useEffect(() => {
    apiFetch<{ id: number; name: string; review_count_override: number | null }[]>(
      "/api/products/admin/products"
    )
      .then((data) =>
        setProductOptions(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            review_count_override: p.review_count_override ?? null,
          }))
        )
      )
      .catch(() => {
        // Non-critical — the create form falls back to an empty product list.
      });
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

  const updatePhoto = async (r: ProductReview, photoUrl: string | null) => {
    try {
      const updated = await apiFetch<ProductReview>(`/api/admin/reviews/${r.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: r.status, photoUrl }),
      });
      setReviews((list) => list.map((x) => (x.id === r.id ? updated : x)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể cập nhật ảnh");
    }
  };

  const remove = async (id: number) => {
    if (!isAdmin) return;
    if (!confirm("Xóa đánh giá này? Không thể hoàn tác.")) return;
    try {
      await apiFetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      setReviews((list) => list.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể xóa");
    }
  };

  // Create modal ---------------------------------------------------------
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError("");
    setCreating(true);
  };

  const submitCreate = async () => {
    setCreateError("");
    if (!createForm.product_id) return setCreateError("Chọn một sản phẩm.");
    if (!createForm.customer_name.trim()) return setCreateError("Nhập tên khách hàng.");
    if (!createForm.comment.trim()) return setCreateError("Nhập nội dung đánh giá.");
    if (countInputInvalid(createForm.review_count_override)) {
      return setCreateError("Số lượt đánh giá hiển thị phải là số nguyên không âm (hoặc để trống).");
    }
    const createOverride = parseCountInput(createForm.review_count_override);
    setCreateSaving(true);
    try {
      const created = await apiFetch<ProductReview>("/api/admin/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId: createForm.product_id,
          customerName: createForm.customer_name.trim(),
          rating: createForm.rating,
          comment: createForm.comment.trim(),
          status: createForm.status,
          reviewCountOverride: createOverride,
        }),
      });
      setReviews((list) => [created, ...list]);
      if (createForm.product_id) rememberOverride(createForm.product_id, createOverride);
      setCreating(false);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Không thể tạo đánh giá");
    } finally {
      setCreateSaving(false);
    }
  };

  // Edit modal -------------------------------------------------------------
  const [editing, setEditing] = useState<ProductReview | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: "",
    rating: 5,
    comment: "",
    review_count_override: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const openEdit = (r: ProductReview) => {
    setEditForm({
      customer_name: r.customer_name,
      rating: r.rating,
      comment: r.comment,
      review_count_override: currentOverrideFor(r.product_id),
    });
    setEditError("");
    setEditing(r);
  };

  const submitEdit = async () => {
    if (!editing) return;
    setEditError("");
    if (!editForm.customer_name.trim()) return setEditError("Nhập tên khách hàng.");
    if (!editForm.comment.trim()) return setEditError("Nhập nội dung đánh giá.");
    if (countInputInvalid(editForm.review_count_override)) {
      return setEditError("Số lượt đánh giá hiển thị phải là số nguyên không âm (hoặc để trống).");
    }
    const editOverride = parseCountInput(editForm.review_count_override);
    setEditSaving(true);
    try {
      const updated = await apiFetch<ProductReview>(`/api/admin/reviews/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: editing.status,
          customerName: editForm.customer_name.trim(),
          rating: editForm.rating,
          comment: editForm.comment.trim(),
          reviewCountOverride: editOverride,
        }),
      });
      setReviews((list) => list.map((r) => (r.id === editing.id ? updated : r)));
      rememberOverride(editing.product_id, editOverride);
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Không thể cập nhật");
    } finally {
      setEditSaving(false);
    }
  };

  const visible =
    filter === "Tất cả" ? reviews : reviews.filter((r) => r.status === filter);

  return (
    <AdminShell>
      <PageHeader>
        <div className="flex items-center gap-3">
          <span className="text-xs text-black/50">
            {reviews.filter((r) => r.status === "Chờ duyệt").length} chờ duyệt /{" "}
            {reviews.length} tổng
          </span>
          <Button size="sm" onClick={openCreate}>
            + Thêm đánh giá
          </Button>
        </div>
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
              <div className="mb-3 max-w-xs">
                <ImageField
                  label="Ảnh khách hàng"
                  value={r.photo_url}
                  onChange={(url) => updatePhoto(r, url)}
                />
              </div>
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
                <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                  Sửa
                </Button>
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

      {creating && (
        <ModalBackdrop onClose={() => !createSaving && setCreating(false)}>
          <ModalPanel maxWidth="max-w-lg">
            <ModalHeader title="Thêm đánh giá" onClose={() => setCreating(false)} />
            <div className="space-y-4 px-6 py-5">
              <div>
                <Label>Sản phẩm</Label>
                <ProductPickerField
                  products={productOptions}
                  productId={createForm.product_id}
                  productName={createForm.product_name}
                  onSelect={(id, name) =>
                    setCreateForm((f) => ({
                      ...f,
                      product_id: id || null,
                      product_name: name,
                      // Show what this product currently displays, so the box
                      // reads as "edit the product's number", not "type a new
                      // one from scratch every time".
                      review_count_override: currentOverrideFor(id) ?? "",
                    }))
                  }
                  disabled={createSaving}
                />
              </div>
              <div>
                <Label>Tên khách hàng</Label>
                <Input
                  value={createForm.customer_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, customer_name: e.target.value }))}
                  disabled={createSaving}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Số sao</Label>
                  <StarPicker
                    value={createForm.rating}
                    onChange={(rating) => setCreateForm((f) => ({ ...f, rating }))}
                    disabled={createSaving}
                  />
                </div>
                <div>
                  <Label>Số lượt đánh giá hiển thị</Label>
                  <Input
                    value={createForm.review_count_override}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, review_count_override: e.target.value }))
                    }
                    disabled={createSaving}
                    inputMode="numeric"
                    placeholder="Tự động"
                  />
                  <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                    Số trong ngoặc cạnh sao ở trang sản phẩm. Để trống = đếm tự động theo
                    số đánh giá đã duyệt. Áp dụng cho cả sản phẩm, không riêng đánh giá này.
                  </p>
                </div>
              </div>
              <div>
                <Label>Nội dung</Label>
                <Textarea
                  rows={4}
                  value={createForm.comment}
                  onChange={(e) => setCreateForm((f) => ({ ...f, comment: e.target.value }))}
                  disabled={createSaving}
                  placeholder="Nội dung đánh giá của khách hàng..."
                />
              </div>
              <div>
                <Label>Trạng thái</Label>
                <Select
                  value={createForm.status}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, status: e.target.value as ReviewStatus }))
                  }
                  disabled={createSaving}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              {createError && <p className="text-xs text-red-700">{createError}</p>}
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setCreating(false)} disabled={createSaving}>
                Hủy
              </Button>
              <Button onClick={submitCreate} disabled={createSaving}>
                {createSaving ? "Đang lưu..." : "Thêm đánh giá"}
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {editing && (
        <ModalBackdrop onClose={() => !editSaving && setEditing(null)}>
          <ModalPanel maxWidth="max-w-lg">
            <ModalHeader title={`Sửa đánh giá — ${editing.product_name}`} onClose={() => setEditing(null)} />
            <div className="space-y-4 px-6 py-5">
              <div>
                <Label>Tên khách hàng</Label>
                <Input
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, customer_name: e.target.value }))}
                  disabled={editSaving}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Số sao</Label>
                  <StarPicker
                    value={editForm.rating}
                    onChange={(rating) => setEditForm((f) => ({ ...f, rating }))}
                    disabled={editSaving}
                  />
                </div>
                <div>
                  <Label>Số lượt đánh giá hiển thị</Label>
                  <Input
                    value={editForm.review_count_override}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, review_count_override: e.target.value }))
                    }
                    disabled={editSaving}
                    inputMode="numeric"
                    placeholder="Tự động"
                  />
                  <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                    Số trong ngoặc cạnh sao ở trang sản phẩm. Để trống = đếm tự động theo
                    số đánh giá đã duyệt. Áp dụng cho cả sản phẩm, không riêng đánh giá này.
                  </p>
                </div>
              </div>
              <div>
                <Label>Nội dung</Label>
                <Textarea
                  rows={4}
                  value={editForm.comment}
                  onChange={(e) => setEditForm((f) => ({ ...f, comment: e.target.value }))}
                  disabled={editSaving}
                />
              </div>
              {editError && <p className="text-xs text-red-700">{editError}</p>}
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={editSaving}>
                Hủy
              </Button>
              <Button onClick={submitEdit} disabled={editSaving}>
                {editSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}
    </AdminShell>
  );
}
