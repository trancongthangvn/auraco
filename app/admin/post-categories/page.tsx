"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import Button from "@/components/admin/ui/Button";
import { Input, Textarea, Label } from "@/components/admin/ui/Field";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";
import {
  ModalBackdrop,
  ModalPanel,
  ModalHeader,
  ModalFooter,
} from "@/components/admin/ui/Modal";

type PostCategory = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  post_count?: number;
};

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminPostCategoriesPage() {
  useRequireAdmin();
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PostCategory | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PostCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiFetch<PostCategory[]>("/api/content/post-categories")
      .then((data) =>
        setCategories(
          [...data].sort(
            (a, b) =>
              a.sort_order - b.sort_order || a.name.localeCompare(b.name)
          )
        )
      )
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Không thể tải danh mục bài viết"
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  const sortList = (list: PostCategory[]) =>
    [...list].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
    );

  const createCategory = async (form: CategoryForm) => {
    const created = await apiFetch<PostCategory>(
      "/api/content/admin/post-categories",
      {
        method: "POST",
        body: JSON.stringify({
          slug: form.slug.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          sort_order: Number(form.sort_order) || 0,
        }),
      }
    );
    setCategories((list) =>
      sortList([...list, { ...created, post_count: created.post_count ?? 0 }])
    );
    setCreating(false);
  };

  const saveEdit = async (form: CategoryForm) => {
    if (!editing) return;
    const updated = await apiFetch<PostCategory>(
      `/api/content/admin/post-categories/${editing.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          slug: form.slug.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          sort_order: Number(form.sort_order) || 0,
        }),
      }
    );
    setCategories((list) =>
      sortList(
        list.map((c) =>
          c.id === editing.id ? { ...c, ...updated, post_count: c.post_count } : c
        )
      )
    );
    setEditing(null);
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch(`/api/content/admin/post-categories/${confirmDelete.id}`, {
        method: "DELETE",
      });
      setCategories((list) => list.filter((c) => c.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof ApiError ? err.message : "Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">{categories.length} danh mục</span>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Thêm danh mục
        </Button>
      </PageHeader>

      {loading && (
        <div className="py-10 text-center text-sm text-black/50">Đang tải...</div>
      )}
      {error && !loading && (
        <div className="py-6 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <TableCard>
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-black/10">
                <Th>Tên danh mục</Th>
                <Th>Slug</Th>
                <Th>Mô tả</Th>
                <Th align="center">Thứ tự</Th>
                <Th align="center">Bài viết</Th>
                <Th align="right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className={TR_HOVER}>
                  <Td className="text-[#2b261f]">{c.name}</Td>
                  <Td className="text-black/40">/{c.slug}</Td>
                  <Td className="text-black/50 max-w-xs truncate">
                    {c.description || "—"}
                  </Td>
                  <Td align="center" className="text-black/50">
                    {c.sort_order}
                  </Td>
                  <Td align="center">{c.post_count ?? 0}</Td>
                  <Td align="right" className="whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                        Sửa
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setDeleteError(null);
                          setConfirmDelete(c);
                        }}
                      >
                        Xóa
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && (
            <EmptyState>Chưa có danh mục bài viết nào.</EmptyState>
          )}
        </TableCard>
      )}

      {creating && (
        <CategoryModal
          title="Thêm danh mục bài viết"
          submitLabel="Tạo danh mục"
          autoSlug
          initial={{
            name: "",
            slug: "",
            description: "",
            sort_order: String(
              categories.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1
            ),
          }}
          onCancel={() => setCreating(false)}
          onSubmit={createCategory}
        />
      )}

      {editing && (
        <CategoryModal
          key={editing.id}
          title="Sửa danh mục bài viết"
          submitLabel="Lưu thay đổi"
          initial={{
            name: editing.name,
            slug: editing.slug,
            description: editing.description ?? "",
            sort_order: String(editing.sort_order),
          }}
          onCancel={() => setEditing(null)}
          onSubmit={saveEdit}
        />
      )}

      {confirmDelete && (
        <ModalBackdrop onClose={() => !deleting && setConfirmDelete(null)}>
          <ModalPanel maxWidth="max-w-sm">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-2">Xóa danh mục bài viết?</h2>
              <p className="text-sm text-black/60 mb-2">
                Danh mục &ldquo;{confirmDelete.name}&rdquo; sẽ bị xóa vĩnh viễn.
              </p>
              <p className="text-sm text-black/60 mb-6">
                {confirmDelete.post_count ?? 0} bài viết trong danh mục này{" "}
                <strong>không bị xóa</strong> — chúng chỉ trở thành bài viết chưa
                phân loại và bạn có thể gán lại danh mục sau.
              </p>
              {deleteError && (
                <p className="text-sm text-red-700 mb-4">{deleteError}</p>
              )}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                >
                  Hủy
                </Button>
                <Button variant="danger" onClick={remove} disabled={deleting}>
                  {deleting ? "Đang xóa..." : "Xóa"}
                </Button>
              </div>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}

      <p className="text-xs text-black/40 mt-4">
        Danh mục dùng để phân loại bài viết Journal. Thứ tự nhỏ hơn sẽ hiển thị
        trước.
      </p>
    </AdminShell>
  );
}

function CategoryModal({
  title,
  submitLabel,
  initial,
  autoSlug = false,
  onCancel,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initial: CategoryForm;
  autoSlug?: boolean;
  onCancel: () => void;
  onSubmit: (form: CategoryForm) => Promise<void>;
}) {
  const [form, setForm] = useState<CategoryForm>(initial);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<CategoryForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const onNameChange = (name: string) => {
    if (autoSlug && !slugTouched) {
      set({ name, slug: slugify(name) });
    } else {
      set({ name });
    }
  };

  const submit = () => {
    setSaving(true);
    setError(null);
    onSubmit(form)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Lưu thất bại");
      })
      .finally(() => setSaving(false));
  };

  return (
    <ModalBackdrop onClose={() => !saving && onCancel()}>
      <ModalPanel maxWidth="max-w-md">
        <ModalHeader title={title} onClose={onCancel} />
        <div className="p-6">
          <Label>Tên danh mục</Label>
          <Input
            value={form.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ví dụ: Cẩm nang trang sức"
            className="mb-4"
          />

          <Label>Slug</Label>
          <Input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set({ slug: e.target.value });
            }}
            placeholder="cam-nang-trang-suc"
            className="mb-4"
          />

          <Label>Mô tả</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={3}
            className="mb-4"
          />

          <Label>Thứ tự hiển thị</Label>
          <Input
            type="number"
            value={form.sort_order}
            onChange={(e) => set({ sort_order: e.target.value })}
            className="mb-4"
          />

          {error && <p className="text-sm text-red-700 mb-4">{error}</p>}
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={saving || !form.name.trim() || !form.slug.trim()}
          >
            {saving ? "Đang lưu..." : submitLabel}
          </Button>
        </ModalFooter>
      </ModalPanel>
    </ModalBackdrop>
  );
}
