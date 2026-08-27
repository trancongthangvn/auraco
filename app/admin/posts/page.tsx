"use client";

import { useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { journalPosts as initialPosts } from "@/data/site";

type JournalPost = (typeof initialPosts)[number];

export default function AdminPostsPage() {
  const { session } = useAdminAuth();
  const [posts, setPosts] = useState<JournalPost[]>(initialPosts);
  const [editing, setEditing] = useState<JournalPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingBody, setEditingBody] = useState("");
  const [newBody, setNewBody] = useState("");

  const isAdmin = session?.role === "admin";

  const remove = (slug: string) => {
    if (!isAdmin) return;
    setPosts((list) => list.filter((p) => p.slug !== slug));
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="font-serif-display text-2xl">Bài viết</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-black/50">
            {posts.length} bài viết, thay đổi chỉ lưu tạm trong phiên demo
          </span>
          <button
            onClick={() => {
              setNewBody("");
              setCreating(true);
            }}
            className="text-sm border border-[#2b261f] px-4 py-2 hover:bg-[#2b261f] hover:text-white transition-colors"
          >
            + Thêm bài viết
          </button>
        </div>
      </div>

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
              <tr key={p.slug} className="border-b border-black/5">
                <td className="py-2 px-4">
                  <div className="relative h-10 w-10 bg-[#f5f2ee]">
                    <Image
                      src={p.img}
                      alt={p.title}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                </td>
                <td className="py-2 px-4 max-w-[280px]">{p.title}</td>
                <td className="py-2 px-4 whitespace-nowrap">{p.date}</td>
                <td className="py-2 px-4 text-black/40">/news/{p.slug}</td>
                <td className="py-2 px-4 text-right space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => {
                      setEditingBody(
                        p.body.map((para) => `<p>${para}</p>`).join("")
                      );
                      setEditing(p);
                    }}
                    className="text-xs underline"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => remove(p.slug)}
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

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white p-6 w-full max-w-2xl my-auto">
            <h2 className="text-lg font-medium mb-4">Sửa bài viết</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tiêu đề
            </label>
            <input
              defaultValue={editing.title}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Mô tả ngắn
            </label>
            <textarea
              defaultValue={editing.excerpt}
              rows={2}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Ngày đăng
            </label>
            <input
              defaultValue={editing.date}
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
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={() => setEditing(null)}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white"
              >
                Lưu thay đổi
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
            <input className="w-full border border-black/20 px-3 py-2 text-sm mb-4" />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Mô tả ngắn
            </label>
            <textarea
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
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={() => setCreating(false)}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white"
              >
                Đăng bài
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-black/40 mt-4">
        Danh sách lấy từ nội dung Journal hiện có trên website. Thêm/sửa/xóa ở
        đây chỉ minh họa giao diện, chưa ghi ngược lại vào nội dung thật của
        trang.
      </p>
    </AdminShell>
  );
}
