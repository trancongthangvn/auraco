"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string[];
  image_url: string | null;
  published: boolean;
  published_at: string | null;
};

// The API stores post body as a JSONB array of strings (one entry per
// top-level block), while the TipTap editor works with a single HTML
// string. These two helpers convert between the two shapes.
function bodyArrayToHtml(body: string[]): string {
  return body.join("");
}

function htmlToBodyArray(html: string): string[] {
  if (typeof window === "undefined") return html ? [html] : [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = Array.from(doc.body.children)
    .map((el) => el.outerHTML)
    .filter((s) => s.trim().length > 0);
  return blocks.length > 0 ? blocks : html ? [html] : [];
}

export default function AdminPostsPage() {
  const { session } = useAdminAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingBody, setEditingBody] = useState("");
  const [newBody, setNewBody] = useState("");

  const [editForm, setEditForm] = useState({ title: "", excerpt: "", date: "" });
  const [newForm, setNewForm] = useState({ title: "", excerpt: "", date: "" });
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.role === "admin";

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Post[]>("/api/content/posts?limit=100");
      setPosts(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tải danh sách bài viết.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(loadPosts);
  }, []);

  const remove = async (post: Post) => {
    if (!isAdmin) return;
    if (!confirm(`Xóa bài viết "${post.title}"?`)) return;
    try {
      await apiFetch(`/api/content/admin/posts/${post.id}`, { method: "DELETE" });
      setPosts((list) => list.filter((p) => p.id !== post.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể xóa bài viết.");
    }
  };

  const startEdit = (post: Post) => {
    setEditForm({
      title: post.title,
      excerpt: post.excerpt ?? "",
      date: post.published_at ?? "",
    });
    setEditingBody(bodyArrayToHtml(post.body));
    setEditing(post);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await apiFetch<Post>(`/api/content/admin/posts/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editForm.title,
          excerpt: editForm.excerpt,
          published_at: editForm.date || undefined,
          body: htmlToBodyArray(editingBody),
        }),
      });
      setPosts((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      setEditing(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể lưu bài viết.");
    } finally {
      setSaving(false);
    }
  };

  const saveNew = async () => {
    if (!newForm.title.trim()) {
      alert("Vui lòng nhập tiêu đề bài viết.");
      return;
    }
    setSaving(true);
    try {
      const slug = newForm.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const created = await apiFetch<Post>("/api/content/admin/posts", {
        method: "POST",
        body: JSON.stringify({
          slug,
          title: newForm.title,
          excerpt: newForm.excerpt,
          published_at: newForm.date || undefined,
          body: htmlToBodyArray(newBody),
        }),
      });
      setPosts((list) => [created, ...list]);
      setCreating(false);
      setNewForm({ title: "", excerpt: "", date: "" });
      setNewBody("");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Không thể tạo bài viết.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">{posts.length} bài viết</span>
        <button
          onClick={() => {
            setNewBody("");
            setNewForm({ title: "", excerpt: "", date: "" });
            setCreating(true);
          }}
          className="text-sm border border-[#2b261f] px-4 py-2 hover:bg-[#2b261f] hover:text-white transition-colors"
        >
          + Thêm bài viết
        </button>
      </PageHeader>

      {loading && <div className="text-sm text-black/50 py-6">Đang tải...</div>}
      {error && <div className="text-sm text-red-700 py-6">{error}</div>}

      {!loading && !error && (
        <div className="bg-white border border-black/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-3 px-4 font-normal">Ảnh</th>
                <th className="py-3 px-4 font-normal">Tiêu đề</th>
                <th className="py-3 px-4 font-normal">Ngày đăng</th>
                <th className="py-3 px-4 font-normal">Đường dẫn</th>
                <th className="py-3 px-4 font-normal text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-black/5">
                  <td className="py-2 px-4">
                    <div className="relative h-10 w-10 bg-[#f5f2ee]">
                      {p.image_url && (
                        <Image
                          src={p.image_url}
                          alt={p.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-4 max-w-[280px]">{p.title}</td>
                  <td className="py-2 px-4 whitespace-nowrap">
                    {p.published_at ? new Date(p.published_at).toLocaleDateString("vi-VN") : "—"}
                  </td>
                  <td className="py-2 px-4 text-black/40">/news/{p.slug}</td>
                  <td className="py-2 px-4 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => startEdit(p)} className="text-xs underline">
                      Sửa
                    </button>
                    <button
                      onClick={() => remove(p)}
                      disabled={!isAdmin}
                      title={!isAdmin ? "Chỉ Quản trị viên được xóa bài viết" : ""}
                      className={`text-xs underline ${
                        isAdmin ? "text-red-700" : "text-black/20 cursor-not-allowed"
                      }`}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white p-6 w-full max-w-2xl my-auto">
            <h2 className="text-lg font-medium mb-4">Sửa bài viết</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tiêu đề
            </label>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Mô tả ngắn
            </label>
            <textarea
              value={editForm.excerpt}
              onChange={(e) => setEditForm((f) => ({ ...f, excerpt: e.target.value }))}
              rows={2}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Ngày đăng
            </label>
            <input
              value={editForm.date}
              onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Nội dung bài viết
            </label>
            <div className="mb-6">
              <RichTextEditor content={editingBody} onChange={setEditingBody} />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white p-6 w-full max-w-2xl my-auto">
            <h2 className="text-lg font-medium mb-4">Thêm bài viết mới</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tiêu đề
            </label>
            <input
              value={newForm.title}
              onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Mô tả ngắn
            </label>
            <textarea
              value={newForm.excerpt}
              onChange={(e) => setNewForm((f) => ({ ...f, excerpt: e.target.value }))}
              rows={2}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Nội dung bài viết
            </label>
            <div className="mb-6">
              <RichTextEditor
                content={newBody}
                onChange={setNewBody}
                placeholder="Viết nội dung bài viết, chèn ảnh hoặc video bằng nút trên thanh công cụ…"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCreating(false)}
                disabled={saving}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={saveNew}
                disabled={saving}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white disabled:opacity-50"
              >
                {saving ? "Đang đăng..." : "Đăng bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
