"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import {
  beachVibeProducts as initialBeachVibe,
  newArrivalProducts as initialNewArrivals,
} from "@/data/site";

// API shapes (server/routes/content.js GET/PUT /api/content(/admin)/homepage)
type HeroSlide = {
  id?: number;
  label: string;
  title: string;
  href: string;
  image_url: string;
  sort_order?: number;
  active?: boolean;
};

type Testimonial = {
  id?: number;
  initials: string;
  name: string;
  quote: string;
  quote_date?: string | null;
  sort_order?: number;
  active?: boolean;
};

type FeaturedProduct = (typeof initialBeachVibe)[number];

type HomepageData = {
  heroSlides: HeroSlide[];
  testimonials: Testimonial[];
  featuredProducts?: unknown[];
};

const TABS = ["Hero banner", "Sản phẩm nổi bật", "Đánh giá khách hàng"] as const;
type Tab = (typeof TABS)[number];

export default function AdminHomepagePage() {
  const { session } = useAdminAuth();
  const isAdmin = session?.role === "admin";
  const [tab, setTab] = useState<Tab>("Hero banner");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [slideForm, setSlideForm] = useState({ label: "", title: "" });
  const [savingSlide, setSavingSlide] = useState(false);

  // NOTE: content.js's /api/content/homepage endpoint only returns a flat
  // "featuredProducts" list (top active products by rating), it does not
  // model separate curated "Beach Vibe" / "New Arrivals" collections and
  // there is no admin endpoint to edit such a selection. This tab is left
  // as a local-only UI demo (not persisted) per the task instructions.
  const [beachVibe, setBeachVibe] = useState<FeaturedProduct[]>(initialBeachVibe);
  const [newArrivals, setNewArrivals] = useState<FeaturedProduct[]>(initialNewArrivals);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({ name: "", quote: "" });
  const [creatingTestimonial, setCreatingTestimonial] = useState(false);
  const [newTestimonialForm, setNewTestimonialForm] = useState({
    initials: "",
    name: "",
    quote: "",
  });
  const [savingTestimonial, setSavingTestimonial] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<HomepageData>("/api/content/homepage")
      .then((data) => {
        if (cancelled) return;
        setHeroSlides(data.heroSlides || []);
        setTestimonials(data.testimonials || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Không thể tải dữ liệu trang chủ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveHeroSlides = async (next: HeroSlide[]) => {
    const data = await apiFetch<{ heroSlides: HeroSlide[] }>(
      "/api/content/admin/homepage",
      {
        method: "PUT",
        body: JSON.stringify({ heroSlides: next }),
      }
    );
    setHeroSlides(data.heroSlides);
  };

  const saveTestimonials = async (next: Testimonial[]) => {
    const data = await apiFetch<{ testimonials: Testimonial[] }>(
      "/api/content/admin/homepage",
      {
        method: "PUT",
        body: JSON.stringify({ testimonials: next }),
      }
    );
    setTestimonials(data.testimonials);
  };

  const removeSlide = async (slide: HeroSlide) => {
    if (!isAdmin) return;
    try {
      await saveHeroSlides(heroSlides.filter((s) => s !== slide));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể xóa banner");
    }
  };

  const openEditSlide = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setSlideForm({ label: slide.label, title: slide.title });
  };

  const submitEditSlide = async () => {
    if (!editingSlide) return;
    setSavingSlide(true);
    try {
      const next = heroSlides.map((s) =>
        s === editingSlide ? { ...s, label: slideForm.label, title: slideForm.title } : s
      );
      await saveHeroSlides(next);
      setEditingSlide(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lưu banner");
    } finally {
      setSavingSlide(false);
    }
  };

  const removeFeatured = (section: "beach" | "new", name: string) => {
    if (!isAdmin) return;
    if (section === "beach") {
      setBeachVibe((list) => list.filter((p) => p.name !== name));
    } else {
      setNewArrivals((list) => list.filter((p) => p.name !== name));
    }
  };

  const removeTestimonial = async (t: Testimonial) => {
    if (!isAdmin) return;
    try {
      await saveTestimonials(testimonials.filter((x) => x !== t));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể xóa đánh giá");
    }
  };

  const openEditTestimonial = (t: Testimonial) => {
    setEditingTestimonial(t);
    setTestimonialForm({ name: t.name, quote: t.quote });
  };

  const submitEditTestimonial = async () => {
    if (!editingTestimonial) return;
    setSavingTestimonial(true);
    try {
      const next = testimonials.map((t) =>
        t === editingTestimonial
          ? { ...t, name: testimonialForm.name, quote: testimonialForm.quote }
          : t
      );
      await saveTestimonials(next);
      setEditingTestimonial(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lưu đánh giá");
    } finally {
      setSavingTestimonial(false);
    }
  };

  const submitNewTestimonial = async () => {
    setSavingTestimonial(true);
    try {
      const next = [
        ...testimonials,
        {
          initials: newTestimonialForm.initials || newTestimonialForm.name.slice(0, 2).toUpperCase(),
          name: newTestimonialForm.name,
          quote: newTestimonialForm.quote,
        },
      ];
      await saveTestimonials(next);
      setCreatingTestimonial(false);
      setNewTestimonialForm({ initials: "", name: "", quote: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể thêm đánh giá");
    } finally {
      setSavingTestimonial(false);
    }
  };

  return (
    <AdminShell>
      <PageHeader />

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2">
          {error}
        </div>
      )}

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

      {loading ? (
        <div className="text-sm text-black/50">Đang tải...</div>
      ) : (
        <>
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
                    <tr key={s.id ?? s.label} className="border-b border-black/5">
                      <td className="py-2 px-4">
                        <div className="relative h-10 w-16 bg-[#f5f2ee]">
                          <Image
                            src={s.image_url}
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
                          onClick={() => openEditSlide(s)}
                          className="text-xs underline"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => removeSlide(s)}
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
              <p className="text-xs text-black/40">
                Mục này chỉ minh họa giao diện — API trang chủ hiện chưa hỗ trợ
                quản lý danh sách sản phẩm nổi bật theo từng nhóm, nên thay đổi
                ở đây chưa ghi ngược lại vào nội dung thật.
              </p>
            </div>
          )}

          {tab === "Đánh giá khách hàng" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setCreatingTestimonial(true)}
                  disabled={!isAdmin}
                  className="text-sm border border-[#2b261f] px-4 py-2 hover:bg-[#2b261f] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                      <tr key={t.id ?? t.name + t.quote_date} className="border-b border-black/5">
                        <td className="py-2 px-4 whitespace-nowrap">{t.name}</td>
                        <td className="py-2 px-4 whitespace-nowrap">
                          {t.quote_date
                            ? new Date(t.quote_date).toLocaleDateString("vi-VN")
                            : ""}
                        </td>
                        <td className="py-2 px-4 max-w-[280px] truncate text-black/60">
                          {t.quote}
                        </td>
                        <td className="py-2 px-4 text-right space-x-3 whitespace-nowrap">
                          <button
                            onClick={() => openEditTestimonial(t)}
                            className="text-xs underline"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => removeTestimonial(t)}
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
        </>
      )}

      {editingSlide && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Sửa banner</h2>
            <label className="block text-xs uppercase tracking-wide mb-2">
              Nhãn
            </label>
            <input
              value={slideForm.label}
              onChange={(e) => setSlideForm((f) => ({ ...f, label: e.target.value }))}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Tiêu đề
            </label>
            <textarea
              value={slideForm.title}
              onChange={(e) => setSlideForm((f) => ({ ...f, title: e.target.value }))}
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
                onClick={submitEditSlide}
                disabled={savingSlide}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white disabled:opacity-50"
              >
                {savingSlide ? "Đang lưu..." : "Lưu thay đổi"}
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
              value={testimonialForm.name}
              onChange={(e) => setTestimonialForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Nội dung đánh giá
            </label>
            <textarea
              value={testimonialForm.quote}
              onChange={(e) => setTestimonialForm((f) => ({ ...f, quote: e.target.value }))}
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
                onClick={submitEditTestimonial}
                disabled={savingTestimonial}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white disabled:opacity-50"
              >
                {savingTestimonial ? "Đang lưu..." : "Lưu thay đổi"}
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
            <input
              value={newTestimonialForm.name}
              onChange={(e) =>
                setNewTestimonialForm((f) => ({ ...f, name: e.target.value }))
              }
              className="w-full border border-black/20 px-3 py-2 text-sm mb-4"
            />
            <label className="block text-xs uppercase tracking-wide mb-2">
              Nội dung đánh giá
            </label>
            <textarea
              value={newTestimonialForm.quote}
              onChange={(e) =>
                setNewTestimonialForm((f) => ({ ...f, quote: e.target.value }))
              }
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
                onClick={submitNewTestimonial}
                disabled={savingTestimonial}
                className="text-sm px-4 py-2 bg-[#2b261f] text-white disabled:opacity-50"
              >
                {savingTestimonial ? "Đang lưu..." : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
