"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";

type AdminUser = {
  id: number;
  username: string;
  display_name: string;
  role: "admin" | "staff";
  active: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminAccountsPage() {
  const { session, ready } = useAdminAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && session && session.role !== "admin") {
      router.replace("/admin");
    }
  }, [ready, session, router]);

  useEffect(() => {
    if (!ready || !session || session.role !== "admin") return;
    let cancelled = false;
    apiFetch<AdminUser[]>("/api/admin/users")
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Không thể tải danh sách tài khoản.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  if (session && session.role !== "admin") {
    return (
      <AdminShell>
        <p className="text-sm text-black/50">
          Bạn không có quyền truy cập trang này. Chỉ Quản trị viên mới quản lý
          được tài khoản.
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageHeader />

      {loading && <p className="text-sm text-black/50">Đang tải...</p>}
      {!loading && error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && (
        <div className="bg-white border border-black/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-3 px-4 font-normal">Tên</th>
                <th className="py-3 px-4 font-normal">Tên đăng nhập</th>
                <th className="py-3 px-4 font-normal">Vai trò</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-black/5">
                  <td className="py-2 px-4">{a.display_name}</td>
                  <td className="py-2 px-4">{a.username}</td>
                  <td className="py-2 px-4">
                    {a.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-black/40 mt-4">
        Theo phạm vi hợp đồng, hệ thống có đúng 1 tài khoản Quản trị viên
        thật (đăng nhập bằng tên đăng nhập và mật khẩu cố định). Cơ chế phân quyền
        Quản trị viên / Nhân viên đã được xây dựng sẵn trong hệ thống và sẽ
        tự động áp dụng khi có tài khoản Nhân viên thứ hai; bản này chưa có
        chức năng tạo thêm tài khoản mới.
      </p>
    </AdminShell>
  );
}
