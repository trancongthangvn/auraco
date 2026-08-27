"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { mockAccounts } from "@/data/admin";

export default function AdminAccountsPage() {
  const { session, ready } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && session && session.role !== "admin") {
      router.replace("/admin");
    }
  }, [ready, session, router]);

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif-display text-2xl">Tài khoản quản trị</h1>
      </div>

      <div className="bg-white border border-black/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4 font-normal">Tên</th>
              <th className="py-3 px-4 font-normal">Email</th>
              <th className="py-3 px-4 font-normal">Vai trò</th>
            </tr>
          </thead>
          <tbody>
            {mockAccounts.map((a) => (
              <tr key={a.id} className="border-b border-black/5">
                <td className="py-2 px-4">{a.name}</td>
                <td className="py-2 px-4">{a.email}</td>
                <td className="py-2 px-4">
                  {a.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-black/40 mt-4">
        Theo phạm vi hợp đồng, hệ thống có đúng 1 tài khoản Quản trị viên
        thật (đăng nhập bằng email và mật khẩu cố định). Tài khoản Nhân viên
        ở đây chỉ để minh họa cơ chế phân quyền, chưa có chức năng tạo thêm
        tài khoản mới trong bản này.
      </p>
    </AdminShell>
  );
}
