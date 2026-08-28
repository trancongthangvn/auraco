"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ImageField from "@/components/admin/ImageField";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import { apiFetch, ApiError } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import { Input, Textarea, Select, Label } from "@/components/admin/ui/Field";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";
import Badge from "@/components/admin/ui/Badge";
import {
  ModalBackdrop,
  ModalPanel,
  ModalHeader,
  ModalFooter,
} from "@/components/admin/ui/Modal";

const SITE_HOST = "aura.maxmin.vn";

type PostStatus = "published" | "draft" | "scheduled";

/** Row shape returned by GET /api/content/admin/posts (no `content`). */
type PostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  views: number | null;
  created_at?: string;
  updated_at?: string;
};

/** Full post from GET /api/content/admin/posts/:id — the row plus SEO + content. */
type PostFull = PostRow & {
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
};

type PostCategory = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  sort_order?: number | null;
  post_count?: number;
};

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  category_id: string;
  seo_title: string;
  seo_description: string;
  og_image: string | null;
  status: PostStatus;
  scheduled_at: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  image_url: null,
  category_id: "",
  seo_title: "",
  seo_description: "",
  og_image: null,
  status: "draft",
  scheduled_at: "",
};

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
  { value: "published", label: "Xuất bản" },
  { value: "draft", label: "Bản nháp" },
  { value: "scheduled", label: "Hẹn giờ" },
];

/** Vietnamese-aware slugifier: strips diacritics, then collapses to a-z0-9 + dashes. */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN");
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO timestamp → the "YYYY-MM-DDTHH:mm" local form a datetime-local input wants. */
function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function StatusBadge({ post }: { post: PostRow }) {
  if (post.status === "published") {
    return <Badge tone="success">Đã xuất bản</Badge>;
  }
  if (post.status === "scheduled") {
    return (
      <Badge tone="warning">
        Hẹn giờ · {formatDateTime(post.scheduled_at)}
      </Badge>
    );
  }
  return <Badge tone="neutral">Bản nháp</Badge>;
}

export default function AdminPostsPage() {
  const { session } = useAdminAuth();
  useRequireAdmin();
  const isAdmin = session?.role === "admin";

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [tab, setTab] = useState<"content" | "seo" | "settings">("content");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<PostRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    return Promise.all([
      apiFetch<PostRow[]>("/api/content/admin/posts"),
      apiFetch<PostCategory[]>("/api/content/post-categories").catch(() => []),
    ])
      .then(([rows, cats]) => {
        setPosts(Array.isArray(rows) ? rows : []);
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Không thể tải danh sách bài viết."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q)) return false;
      if (categoryFilter && String(p.category_id ?? "") !== categoryFilter) return false;
      return true;
    });
  }, [posts, search, categoryFilter]);

  const hasFilter = search.trim() !== "" || categoryFilter !== "";

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onTitleChange = (value: string) => {
    setForm((f) => ({
      ...f,
      title: value,
      // Auto-slug only while creating; an existing post's slug is a permalink.
      slug: editingId === null ? slugify(value) : f.slug,
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTab("content");
    setModalError(null);
    setModalLoading(false);
    setModalOpen(true);
  };

  const openEdit = (post: PostRow) => {
    setEditingId(post.id);
    setTab("content");
    setModalError(null);
    setModalOpen(true);
    setModalLoading(true);
    // The list endpoint omits `content`, so fetch the full record.
    apiFetch<PostFull>(`/api/content/admin/posts/${post.id}`)
      .then((full) => {
        setForm({
          title: full.title ?? "",
          slug: full.slug ?? "",
          excerpt: full.excerpt ?? "",
          content: full.content ?? "",
          image_url: full.image_url ?? null,
          category_id: full.category_id != null ? String(full.category_id) : "",
          seo_title: full.seo_title ?? "",
          seo_description: full.seo_description ?? "",
          og_image: full.og_image ?? null,
          status: full.status ?? "draft",
          scheduled_at: toDateTimeLocal(full.scheduled_at),
        });
      })
      .catch((err: unknown) => {
        setModalError(
          err instanceof ApiError ? err.message : "Không thể tải nội dung bài viết."
        );
      })
      .finally(() => {
        setModalLoading(false);
      });
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setModalError(null);
  };

  const save = () => {
    if (!form.title.trim()) {
      setModalError("Vui lòng nhập tiêu đề bài viết.");
      setTab("content");
      return;
    }
    const slug = form.slug.trim() || slugify(form.title);
    if (!slug) {
      setModalError("Vui lòng nhập đường dẫn (slug) cho bài viết.");
      setTab("settings");
      return;
    }
    if (form.status === "scheduled" && !form.scheduled_at) {
      setModalError("Vui lòng chọn thời điểm hẹn giờ đăng bài.");
      setTab("settings");
      return;
    }

    // `published` is derived server-side from `status` — never send it.
    const payload = {
      slug,
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content || null,
      image_url: form.image_url || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      og_image: form.og_image || null,
      status: form.status,
      scheduled_at:
        form.status === "scheduled" && form.scheduled_at
          ? new Date(form.scheduled_at).toISOString()
          : null,
    };

    setSaving(true);
    setModalError(null);
    const request =
      editingId === null
        ? apiFetch<PostFull>("/api/content/admin/posts", {
            method: "POST",
            body: JSON.stringify(payload),
          })
        : apiFetch<PostFull>(`/api/content/admin/posts/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });

    request
      .then(() => {
        setModalOpen(false);
        setEditingId(null);
        return load();
      })
      .catch((err: unknown) => {
        setModalError(
          err instanceof ApiError ? err.message : "Không thể lưu bài viết."
        );
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const remove = (post: PostRow) => {
    setDeleting(true);
    apiFetch(`/api/content/admin/posts/${post.id}`, { method: "DELETE" })
      .then(() => {
        setPosts((list) => list.filter((p) => p.id !== post.id));
        setConfirmDelete(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Không thể xóa bài viết.");
        setConfirmDelete(null);
      })
      .finally(() => {
        setDeleting(false);
      });
  };

  const seoTitleLen = form.seo_title.length;
  const seoDescLen = form.seo_description.length;
  const previewSlug = form.slug.trim() || slugify(form.title) || "duong-dan";

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">{posts.length} bài viết</span>
        <Button variant="primary" onClick={openCreate}>
          + Thêm bài viết
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tiêu đề..."
          className="w-full sm:w-64"
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-auto"
        >
          <option value="">Tất cả chuyên mục</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </Select>
        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setCategoryFilter("");
            }}
          >
            Xóa lọc
          </Button>
        )}
        {hasFilter && (
          <span className="text-xs text-black/40">
            {filtered.length} / {posts.length} bài viết
          </span>
        )}
      </div>

      {loading && <p className="text-sm text-black/40 py-8 text-center">Đang tải...</p>}
      {error && <p className="text-sm text-red-700 py-4">{error}</p>}

      {!loading && !error && (
        <TableCard>
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-black/10">
                <Th>Ảnh</Th>
                <Th>Tiêu đề</Th>
                <Th>Chuyên mục</Th>
                <Th>Trạng thái</Th>
                <Th align="right">Lượt xem</Th>
                <Th>Ngày đăng</Th>
                <Th align="right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={TR_HOVER}>
                  <Td>
                    <div className="h-10 w-10 rounded-lg bg-[#f5f2ee] overflow-hidden">
                      {p.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element -- image_url may be an
                           arbitrary pasted external URL that next/image would reject. */
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="h-10 w-10 object-cover"
                        />
                      )}
                    </div>
                  </Td>
                  <Td className="max-w-[280px]">
                    <span className="block truncate">{p.title}</span>
                    <span className="block text-xs text-black/30 truncate">
                      /news/{p.slug}
                    </span>
                  </Td>
                  <Td className="text-black/60 whitespace-nowrap">
                    {p.category_name || "—"}
                  </Td>
                  <Td>
                    <StatusBadge post={p} />
                  </Td>
                  <Td align="right" className="text-black/60">{p.views ?? 0}</Td>
                  <Td className="whitespace-nowrap text-black/60">
                    {formatDate(p.published_at)}
                  </Td>
                  <Td align="right" className="whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`https://${SITE_HOST}/news/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-black/50 hover:text-black/80 transition-colors px-2"
                      >
                        Xem trang
                      </a>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        Sửa
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmDelete(p)}
                        disabled={!isAdmin}
                        title={!isAdmin ? "Chỉ Quản trị viên được xóa bài viết" : ""}
                      >
                        Xóa
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <EmptyState>
              {posts.length === 0
                ? "Chưa có bài viết nào. Bấm “+ Thêm bài viết” để tạo bài đầu tiên."
                : "Không có bài viết nào khớp bộ lọc."}
            </EmptyState>
          )}
        </TableCard>
      )}

      {modalOpen && (
        <ModalBackdrop onClose={closeModal}>
          <ModalPanel maxWidth="max-w-3xl">
            <ModalHeader
              title={editingId === null ? "Thêm bài viết mới" : "Sửa bài viết"}
              onClose={closeModal}
            />

            <div className="flex border-b border-black/10 px-6 gap-6">
              {(
                [
                  ["content", "Nội dung"],
                  ["seo", "SEO"],
                  ["settings", "Cài đặt"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`text-xs uppercase tracking-wide py-3 border-b-2 -mb-px transition-colors ${
                    tab === key
                      ? "border-[#2b261f] text-[#2b261f]"
                      : "border-transparent text-black/40 hover:text-black/70"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {modalLoading ? (
              <p className="text-sm text-black/40 py-16 text-center">Đang tải...</p>
            ) : (
              <div className="px-6 py-5">
                {modalError && (
                  <p className="mb-4 border border-red-700/30 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {modalError}
                  </p>
                )}

                {tab === "content" && (
                  <div className="space-y-4">
                    <div>
                      <Label>Tiêu đề</Label>
                      <Input
                        value={form.title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        disabled={saving}
                        placeholder="Tiêu đề bài viết"
                      />
                    </div>
                    <div>
                      <Label>Mô tả ngắn</Label>
                      <Textarea
                        value={form.excerpt}
                        onChange={(e) => setField("excerpt", e.target.value)}
                        disabled={saving}
                        rows={2}
                        placeholder="Đoạn tóm tắt hiển thị ở danh sách tin tức"
                      />
                    </div>
                    <div>
                      <Label>Nội dung bài viết</Label>
                      <RichTextEditor
                        content={form.content}
                        onChange={(html) => setField("content", html)}
                        placeholder="Viết nội dung bài viết, chèn ảnh hoặc video bằng nút trên thanh công cụ…"
                      />
                    </div>
                  </div>
                )}

                {tab === "seo" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="mb-0">Tiêu đề SEO</Label>
                        <span
                          className={`text-xs ${
                            seoTitleLen > 60 ? "text-red-700" : "text-black/40"
                          }`}
                        >
                          {seoTitleLen}/60 ký tự
                        </span>
                      </div>
                      <Input
                        value={form.seo_title}
                        onChange={(e) => setField("seo_title", e.target.value)}
                        disabled={saving}
                        placeholder={form.title || "Mặc định lấy theo tiêu đề bài viết"}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="mb-0">Mô tả SEO</Label>
                        <span
                          className={`text-xs ${
                            seoDescLen > 160 ? "text-red-700" : "text-black/40"
                          }`}
                        >
                          {seoDescLen}/160 ký tự
                        </span>
                      </div>
                      <Textarea
                        value={form.seo_description}
                        onChange={(e) => setField("seo_description", e.target.value)}
                        disabled={saving}
                        rows={3}
                        placeholder={form.excerpt || "Mặc định lấy theo mô tả ngắn"}
                      />
                    </div>

                    <ImageField
                      label="Ảnh chia sẻ (OG image)"
                      hint="Ảnh hiển thị khi chia sẻ bài viết lên Facebook, Zalo..."
                      value={form.og_image}
                      onChange={(url) => setField("og_image", url)}
                      disabled={saving}
                    />

                    <div>
                      <p className="text-xs uppercase tracking-wide text-black/50 mb-2">
                        Xem trước trên Google
                      </p>
                      <div className="border border-black/10 bg-[#fafafa] p-4">
                        <p className="text-[#1a0dab] text-base leading-snug truncate">
                          {form.seo_title.trim() || form.title || "Tiêu đề bài viết"}
                        </p>
                        <p className="text-[#006621] text-xs mt-0.5 truncate">
                          {SITE_HOST}/news/{previewSlug}
                        </p>
                        <p className="text-black/60 text-sm mt-1 line-clamp-2">
                          {form.seo_description.trim() ||
                            form.excerpt.trim() ||
                            "Mô tả bài viết sẽ hiển thị ở đây."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {tab === "settings" && (
                  <div className="space-y-5">
                    <div>
                      <Label>Đường dẫn</Label>
                      <div className="flex items-stretch rounded-xl border border-black/15 overflow-hidden transition-colors duration-150 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20">
                        <span className="flex items-center px-3 text-sm text-black/40 bg-black/[0.03] border-r border-black/10">
                          /news/
                        </span>
                        <input
                          value={form.slug}
                          onChange={(e) => setField("slug", e.target.value)}
                          disabled={saving}
                          placeholder="duong-dan-bai-viet"
                          className="flex-1 px-3 py-2 text-sm outline-none bg-white disabled:bg-black/[0.03] disabled:text-black/40"
                        />
                      </div>
                    </div>

                    <ImageField
                      label="Ảnh đại diện"
                      hint="Ảnh thumbnail hiển thị ở danh sách tin tức và đầu bài viết."
                      value={form.image_url}
                      onChange={(url) => setField("image_url", url)}
                      disabled={saving}
                    />

                    <div>
                      <Label>Chuyên mục</Label>
                      <Select
                        value={form.category_id}
                        onChange={(e) => setField("category_id", e.target.value)}
                        disabled={saving}
                      >
                        <option value="">— Không có —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-2">Trạng thái</Label>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <Button
                            key={opt.value}
                            type="button"
                            size="sm"
                            variant={form.status === opt.value ? "primary" : "secondary"}
                            onClick={() => setField("status", opt.value)}
                            disabled={saving}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {form.status === "scheduled" && (
                      <div>
                        <Label>Thời điểm đăng</Label>
                        <Input
                          type="datetime-local"
                          value={form.scheduled_at}
                          onChange={(e) => setField("scheduled_at", e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <ModalFooter>
              <Button variant="secondary" onClick={closeModal} disabled={saving}>
                Hủy
              </Button>
              <Button variant="primary" onClick={save} disabled={saving || modalLoading}>
                {saving
                  ? "Đang lưu..."
                  : editingId === null
                    ? "Tạo bài viết"
                    : "Lưu thay đổi"}
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {confirmDelete && (
        <ModalBackdrop onClose={() => !deleting && setConfirmDelete(null)}>
          <ModalPanel maxWidth="max-w-sm">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-2">Xóa bài viết?</h2>
              <p className="text-sm text-black/60 mb-6">
                Bài viết “{confirmDelete.title}” sẽ bị xóa vĩnh viễn khỏi website.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                >
                  Hủy
                </Button>
                <Button
                  variant="danger"
                  onClick={() => remove(confirmDelete)}
                  disabled={deleting}
                >
                  {deleting ? "Đang xóa..." : "Xóa"}
                </Button>
              </div>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}
    </AdminShell>
  );
}
