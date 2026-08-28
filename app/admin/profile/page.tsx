"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import { Input, Label } from "@/components/admin/ui/Field";

export default function AdminProfilePage() {
  const { session } = useAdminAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AdminShell>
      <PageHeader />

      <form
        onSubmit={async (e) => {
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
          setSubmitting(true);
          try {
            await apiFetch("/api/admin/change-password", {
              method: "POST",
              body: JSON.stringify({
                current_password: current,
                new_password: next,
              }),
            });
            setSaved(true);
            setCurrent("");
            setNext("");
            setConfirm("");
            setTimeout(() => setSaved(false), 2000);
          } catch (err) {
            setError(
              err instanceof ApiError ? err.message : "Không thể đổi mật khẩu."
            );
          } finally {
            setSubmitting(false);
          }
        }}
        className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 max-w-md space-y-4"
      >
        <div>
          <p className="text-xs text-black/40 mb-1">Đăng nhập với tên</p>
          <p className="text-sm font-medium">{session?.username}</p>
        </div>

        <div>
          <Label>Mật khẩu hiện tại</Label>
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>

        <div>
          <Label>Mật khẩu mới</Label>
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>

        <div>
          <Label>Nhập lại mật khẩu mới</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-red-700">{error}</p>}
        {saved && (
          <p className="text-xs text-green-700">
            Đã đổi mật khẩu thành công.
          </p>
        )}

        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Đang xử lý..." : "Đổi mật khẩu"}
        </Button>
      </form>
    </AdminShell>
  );
}
