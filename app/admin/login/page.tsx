"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f4f0] px-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const ok = login(username, password);
          if (ok) {
            router.replace("/admin");
          } else {
            setError("Tên đăng nhập hoặc mật khẩu không đúng.");
          }
        }}
        className="w-full max-w-sm bg-white border border-black/10 p-8"
      >
        <h1 className="font-serif-display text-2xl mb-1 text-center">AURA & CO</h1>
        <p className="text-xs text-center text-black/50 mb-6 tracking-wide uppercase">
          Đăng nhập trang quản trị
        </p>

        <label className="block text-xs uppercase tracking-wide mb-2">
          Tên đăng nhập
        </label>
        <input
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
          className="w-full border border-black/20 px-4 py-3 text-sm mb-4"
        />

        <label className="block text-xs uppercase tracking-wide mb-2">
          Mật khẩu
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full border border-black/20 px-4 py-3 text-sm mb-2"
        />

        {error && <p className="text-xs text-red-700 mb-4">{error}</p>}
        {!error && <div className="mb-6" />}

        <button
          type="submit"
          className="w-full bg-[#2b261f] text-white py-3 text-sm tracking-wide hover:bg-black transition-colors"
        >
          ĐĂNG NHẬP
        </button>
        <p className="text-xs text-black/40 mt-4 text-center">
          Tài khoản quản trị được cấp riêng cho AURA & CO, không tự đăng ký
          được từ trang này.
        </p>
      </form>
    </div>
  );
}
