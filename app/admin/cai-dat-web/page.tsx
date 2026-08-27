"use client";

import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";

export default function AdminSiteSettingsPage() {
  const [siteTitle, setSiteTitle] = useState("AURA & CO | Fine Jewelry");
  const [siteDescription, setSiteDescription] = useState(
    "Trang sức tinh tế, thiết kế tối giản, chế tác thủ công cho phong cách hiện đại."
  );
  const [ogImage, setOgImage] = useState("/images/hero/hero-1.webp");
  const [saved, setSaved] = useState(false);

  return (
    <AdminShell>
      <PageHeader />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
        className="bg-white border border-black/10 p-6 max-w-2xl space-y-5"
      >
        <div>
          <label className="block text-xs uppercase tracking-wide mb-2">
            Tiêu đề website (SEO title)
          </label>
          <input
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            className="w-full border border-black/20 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide mb-2">
            Mô tả website (SEO description)
          </label>
          <textarea
            value={siteDescription}
            onChange={(e) => setSiteDescription(e.target.value)}
            rows={3}
            className="w-full border border-black/20 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide mb-2">
            Ảnh chia sẻ mạng xã hội (Open Graph)
          </label>
          <input
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            className="w-full border border-black/20 px-3 py-2 text-sm"
          />
          <p className="text-xs text-black/40 mt-2">
            Đường dẫn ảnh hiển thị khi chia sẻ link website lên Facebook,
            Zalo, X...
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="text-sm px-5 py-2.5 bg-[#2b261f] text-white hover:bg-black transition-colors"
          >
            Lưu thay đổi
          </button>
          {saved && (
            <span className="text-xs text-green-700">Đã lưu (chỉ minh họa).</span>
          )}
        </div>
      </form>

      <p className="text-xs text-black/40 mt-4 max-w-2xl">
        Thay đổi ở đây chỉ minh họa giao diện, chưa ghi ngược lại vào thẻ
        metadata thật của website.
      </p>
    </AdminShell>
  );
}
