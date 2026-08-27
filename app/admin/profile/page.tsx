"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";

export default function AdminProfilePage() {
  const { session } = useAdminAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <AdminShell>
      <PageHeader />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          if (!current || !next) {
            setError("Vui lòng nhập đầy đủ thông tin.");
            return;
          }
          if (next !== confirm) {
            setError("Mật khẩu mới nhập lại không khớp.");
            return;
          }
          setSaved(true);
          setCurrent("");
          setNext("");
          setConfirm("");
          setTimeout(() => setSaved(false), 2000);
        }}
        className="bg-white border border-black/10 p-6 max-w-md space-y-4"
      >
        <div>
          <p className="text-xs text-black/40 mb-1">Đăng nhập với tên</p>
          <p className="text-sm font-medium">{session?.username}</p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide mb-2">
            Mật khẩu hiện tại
          </label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full border border-black/20 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide mb-2">
            Mật khẩu mới
          </label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full border border-black/20 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide mb-2">
            Nhập lại mật khẩu mới
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-black/20 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-xs text-red-700">{error}</p>}
        {saved && (
          <p className="text-xs text-green-700">
            Đã đổi mật khẩu (chỉ minh họa, chưa lưu thật).
          </p>
        )}

        <button
          type="submit"
          className="text-sm px-5 py-2.5 bg-[#2b261f] text-white hover:bg-black transition-colors"
        >
          Đổi mật khẩu
        </button>
      </form>

      <p className="text-xs text-black/40 mt-4 max-w-md">
        Trong bản demo này, mật khẩu không thực sự được cập nhật; chức năng
        chỉ minh họa giao diện quản trị.
      </p>
    </AdminShell>
  );
}
