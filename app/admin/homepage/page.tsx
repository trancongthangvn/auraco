"use client";

import { useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import {
  heroSlides as initialHeroSlides,
  testimonials as initialTestimonials,
  beachVibeProducts as initialBeachVibe,
  newArrivalProducts as initialNewArrivals,
} from "@/data/site";

type HeroSlide = (typeof initialHeroSlides)[number];
type Testimonial = (typeof initialTestimonials)[number];
type FeaturedProduct = (typeof initialBeachVibe)[number];

const TABS = ["Hero banner", "Sản phẩm nổi bật", "Đánh giá khách hàng"] as const;
type Tab = (typeof TABS)[number];

export default function AdminHomepagePage() {
  const { session } = useAdminAuth();
  const isAdmin = session?.role === "admin";
  const [tab, setTab] = useState<Tab>("Hero banner");

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(initialHeroSlides);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);

  const [beachVibe, setBeachVibe] = useState<FeaturedProduct[]>(initialBeachVibe);
  const [newArrivals, setNewArrivals] = useState<FeaturedProduct[]>(initialNewArrivals);

  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [creatingTestimonial, setCreatingTestimonial] = useState(false);

  const removeSlide = (label: string) => {
    if (!isAdmin) return;
    setHeroSlides((list) => list.filter((s) => s.label !== label));
  };

  const removeFeatured = (
    section: "beach" | "new",
    name: string
  ) => {
    if (!isAdmin) return;
    if (section === "beach") {
      setBeachVibe((list) => list.filter((p) => p.name !== name));
    } else {
      setNewArrivals((list) => list.filter((p) => p.name !== name));
    }
  };

  const removeTestimonial = (name: string, date: string) => {
    if (!isAdmin) return;
    setTestimonials((list) =>
      list.filter((t) => !(t.name === name && t.date === date))
    );
  };

  return (
    <AdminShell>
      <h1 className="font-serif-display text-2xl mb-6">Nội dung trang chủ</h1>

      <div className="flex gap-1 border-b border-black/10 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
              tab === t
                ? "border-[#2b261f] text-[#2b261f]"
                : "border-transparent text-black/50 hover:text-black"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Hero banner" && (
        <div className="bg-white border border-black/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-3 px-4 font-normal">Ảnh</th>
                <th className="py-3 px-4 font-normal">Nhãn</th>
                <th className="py-3 px-4 font-normal">Tiêu đề</th>
                <th className="py-3 px-4 font-normal text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {heroSlides.map((s) => (
                <tr key={s.label} className="border-b border-black/5">
                  <td className="py-2 px-4">
                    <div className="relative h-10 w-16 bg-[#f5f2ee]">
                      <Image
                        src={s.img}
                        alt={s.label}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-4">{s.label}</td>
                  <td className="py-2 px-4 max-w-[280px] truncate">
                    {s.title}
                  </td>
                  <td className="py-2 px-4 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => setEditingSlide(s)}
                      className="text-xs underline"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => removeSlide(s.label)}
                      disabled={!isAdmin}
                      title={!isAdmin ? "Chỉ Quản trị viên được xóa" : ""}
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

      {tab === "Sản phẩm nổi bật" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide mb-3">
              Beach Vibe
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {beachVibe.map((p) => (
                <div key={p.name} className="bg-white border border-black/10 p-2">
                  <div className="relative aspect-square bg-[#f5f2ee] mb-2">
                    <Image
                      src={p.img}
                      alt={p.name}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </div>
                  <p className="text-xs truncate mb-1">{p.name}</p>
                  <button
                    onClick={() => removeFeatured("beach", p.name)}
                    disabled={!isAdmin}
                    className={`text-xs underline ${
                      isAdmin ? "text-red-700" : "text-black/20 cursor-not-allowed"
                    }`}
                  >
                    Gỡ khỏi mục này
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide mb-3">
              New Arrivals
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {newArrivals.map((p) => (
                <div key={p.name} className="bg-white border border-black/10 p-2">
                  <div className="relative aspect-square bg-[#f5f2ee] mb-2">
                    <Image
                      src={p.img}
                      alt={p.name}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </div>
                  <p className="text-xs truncate mb-1">{p.name}</p>
                  <button
                    onClick={() => removeFeatured("new", p.name)}
                    disabled={!isAdmin}
                    className={`text-xs underline ${
                      isAdmin ? "text-red-700" : "text-black/20 cursor-not-allowed"
                    }`}
                  >
                    Gỡ khỏi mục này
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Đánh giá khách hàng" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setCreatingTestimonial(true)}
              className="text-sm border border-[#2b261f] px-4 py-2 hover:bg-[#2b261f] hover:text-white transition-colors"
            >
              + Thêm đánh giá
            </button>
          </div>
          <div className="bg-white border border-black/10 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-black/50 border-b border-black/10">
                  <th className="py-3 px-4 font-normal">Khách hàng</th>
                  <th className="py-3 px-4 font-normal">Ngày</th>
                  <th className="py-3 px-4 font-normal">Nội dung</th>
                  <th className="py-3 px-4 font-normal text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {testimonials.map((t) => (
                  <tr key={t.name + t.date} className="border-b border-black/5">
                    <td className="py-2 px-4 whitespace-nowrap">{t.name}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{t.date}</td>
                    <td className="py-2 px-4 max-w-[280px] truncate text-black/60">
                      {t.quote}
                    </td>
                    <td className="py-2 px-4 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => setEditingTestimonial(t)}
                        className="text-xs underline"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => removeTestimonial(t.name, t.date)}
                        disabled={!isAdmin}
                        title={!isAdmin ? "Chỉ Quản trị viên được xóa" : ""}
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
        </div>
      )}

      {editingSlide && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Sửa banner</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Nhãn
            </label>
            <input
              defaultValue={editingSlide.label}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tiêu đề
            </label>
            <textarea
              defaultValue={editingSlide.title}
              rows={3}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditingSlide(null)}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={() => setEditingSlide(null)}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTestimonial && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Sửa đánh giá</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tên khách hàng
            </label>
            <input
              defaultValue={editingTestimonial.name}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Nội dung đánh giá
            </label>
            <textarea
              defaultValue={editingTestimonial.quote}
              rows={4}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditingTestimonial(null)}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={() => setEditingTestimonial(null)}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {creatingTestimonial && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Thêm đánh giá mới</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tên khách hàng
            </label>
            <input className="w-full border border-black/20 px-3 py-2 text-sm mb-4" />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Nội dung đánh giá
            </label>
            <textarea
              rows={4}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCreatingTestimonial(false)}
                className="text-sm px-4 py-2 border border-black/20"
              >
                Hủy
              </button>
              <button
                onClick={() => setCreatingTestimonial(false)}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-black/40 mt-6">
        Thêm/sửa/xóa ở đây chỉ minh họa giao diện, chưa ghi ngược lại vào nội
        dung thật của trang chủ.
      </p>
    </AdminShell>
  );
}
