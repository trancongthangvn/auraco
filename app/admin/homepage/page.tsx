"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import { apiFetch, ApiError } from "@/lib/api";
import {
  beachVibeProducts as initialBeachVibe,
  newArrivalProducts as initialNewArrivals,
} from "@/data/site";
import Button from "@/components/admin/ui/Button";
import { Input, Textarea, Label, Select } from "@/components/admin/ui/Field";
import ImageField from "@/components/admin/ImageField";
import { StarIcon, StarRating } from "@/components/icons";
import { TableCard, Th, Td, TR_HOVER } from "@/components/admin/ui/Table";
import {
  ModalBackdrop,
  ModalPanel,
  ModalHeader,
  ModalFooter,
} from "@/components/admin/ui/Modal";

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
  photo_url?: string | null;
  product_id?: number | null;
  product_name?: string | null;
  rating?: number;
};

type ProductOption = { id: number; name: string };

type FeaturedProduct = (typeof initialBeachVibe)[number];

type CollectionOption = { id: number; slug: string; name: string };

type HomepageData = {
  heroSlides: HeroSlide[];
  testimonials: Testimonial[];
  featuredProducts?: unknown[];
};

const TABS = ["Ảnh bìa lớn", "Sản phẩm nổi bật", "Đánh giá khách hàng"] as const;
type Tab = (typeof TABS)[number];

// quote_date comes back from the API as an ISO timestamp/date string;
// <input type="date"> needs exactly "yyyy-mm-dd" or it silently shows blank.
function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Optional single-product link for a testimonial: a search box + matching
 *  list (same pattern as the product page's "Mua cùng nhau" bundle picker),
 *  but single-select — picking a result replaces the search with a chip. */
function ProductPickerField({
  products,
  productId,
  productName,
  onSelect,
  onClear,
  disabled,
}: {
  products: ProductOption[];
  productId: number | null;
  productName: string;
  onSelect: (id: number, name: string) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");

  if (productId) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-black/15 bg-black/[0.03] px-3.5 py-2.5 text-sm">
        <span className="flex-1 truncate">{productName}</span>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="text-xs text-black/50 hover:text-black underline underline-offset-2 disabled:cursor-not-allowed"
        >
          Bỏ chọn
        </button>
      </div>
    );
  }

  const candidates = products.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm sản phẩm theo tên..."
        disabled={disabled}
        className="mb-2 text-xs"
      />
      {search.trim() && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-black/10 p-1">
          {candidates.length === 0 && (
            <p className="text-xs text-black/30 italic px-2 py-1.5">
              Không tìm thấy sản phẩm nào khớp &quot;{search}&quot;.
            </p>
          )}
          {candidates.slice(0, 20).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p.id, p.name);
                setSearch("");
              }}
              className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-black/[0.03]"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Clickable 1-5 star input, built on the same StarIcon used by the
 *  read-only StarRating display elsewhere in the admin. */
function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            aria-label={`${n} sao`}
            className="disabled:cursor-not-allowed"
          >
            <StarIcon
              size={20}
              filled={n <= value}
              className={n <= value ? "text-[#f0b429]" : "text-black/20"}
            />
          </button>
        );
      })}
    </span>
  );
}

export default function AdminHomepagePage() {
  const { session } = useAdminAuth();
  useRequireAdmin();
  const isAdmin = session?.role === "admin";
  const [tab, setTab] = useState<Tab>("Ảnh bìa lớn");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [slideForm, setSlideForm] = useState({ label: "", title: "", image_url: "", href: "" });
  const [savingSlide, setSavingSlide] = useState(false);
  const [collectionOptions, setCollectionOptions] = useState<CollectionOption[]>([]);

  // NOTE: content.js's /api/content/homepage endpoint only returns a flat
  // "featuredProducts" list (top active products by rating), it does not
  // model separate curated "Beach Vibe" / "New Arrivals" collections and
  // there is no admin endpoint to edit such a selection. This tab is left
  // as a local-only UI demo (not persisted) per the task instructions.
  const [beachVibe, setBeachVibe] = useState<FeaturedProduct[]>(initialBeachVibe);
  const [newArrivals, setNewArrivals] = useState<FeaturedProduct[]>(initialNewArrivals);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialSearch, setTestimonialSearch] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const emptyTestimonialForm = {
    name: "",
    quote: "",
    photo_url: "",
    quote_date: toDateInputValue(new Date().toISOString()),
    rating: 5,
    product_id: null as number | null,
    product_name: "",
  };
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState(emptyTestimonialForm);
  const [creatingTestimonial, setCreatingTestimonial] = useState(false);
  const [newTestimonialForm, setNewTestimonialForm] = useState({
    initials: "",
    ...emptyTestimonialForm,
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

  useEffect(() => {
    apiFetch<CollectionOption[]>("/api/collections/admin")
      .then((data) => setCollectionOptions(data))
      .catch(() => {
        // Non-critical — the modal falls back to a plain href text field.
      });
  }, []);

  useEffect(() => {
    apiFetch<{ id: number; name: string }[]>("/api/products/admin/products")
      .then((data) => setProductOptions(data.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => {
        // Non-critical — the testimonial form falls back to no product link.
      });
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
    setSlideForm({
      label: slide.label,
      title: slide.title,
      image_url: slide.image_url,
      href: slide.href || "",
    });
  };

  const submitEditSlide = async () => {
    if (!editingSlide) return;
    setSavingSlide(true);
    try {
      const next = heroSlides.map((s) =>
        s === editingSlide
          ? {
              ...s,
              label: slideForm.label,
              title: slideForm.title,
              image_url: slideForm.image_url,
              href: slideForm.href,
            }
          : s
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
    setTestimonialForm({
      name: t.name,
      quote: t.quote,
      photo_url: t.photo_url ?? "",
      quote_date: toDateInputValue(t.quote_date) || emptyTestimonialForm.quote_date,
      rating: t.rating ?? 5,
      product_id: t.product_id ?? null,
      product_name: t.product_name ?? "",
    });
  };

  const submitEditTestimonial = async () => {
    if (!editingTestimonial) return;
    setSavingTestimonial(true);
    try {
      const next = testimonials.map((t) =>
        t === editingTestimonial
          ? {
              ...t,
              name: testimonialForm.name,
              quote: testimonialForm.quote,
              photo_url: testimonialForm.photo_url || null,
              quote_date: testimonialForm.quote_date || null,
              rating: testimonialForm.rating,
              product_id: testimonialForm.product_id,
              product_name: testimonialForm.product_id ? testimonialForm.product_name : null,
            }
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
          photo_url: newTestimonialForm.photo_url || null,
          quote_date: newTestimonialForm.quote_date || null,
          rating: newTestimonialForm.rating,
          product_id: newTestimonialForm.product_id,
          product_name: newTestimonialForm.product_id ? newTestimonialForm.product_name : null,
        },
      ];
      await saveTestimonials(next);
      setCreatingTestimonial(false);
      setNewTestimonialForm({ initials: "", ...emptyTestimonialForm });
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
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-1 border-b border-black/10 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors duration-150 ${
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
          {tab === "Ảnh bìa lớn" && (
            <TableCard>
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-black/10">
                    <Th>Ảnh</Th>
                    <Th>Nhãn</Th>
                    <Th>Tiêu đề</Th>
                    <Th align="right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {heroSlides.map((s) => (
                    <tr key={s.id ?? s.label} className={TR_HOVER}>
                      <Td>
                        <div className="relative h-10 w-16 rounded-lg overflow-hidden bg-[#f5f2ee]">
                          <Image
                            src={s.image_url}
                            alt={s.label}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      </Td>
                      <Td>{s.label}</Td>
                      <Td className="max-w-[280px] truncate">{s.title}</Td>
                      <Td align="right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEditSlide(s)}>
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => removeSlide(s)}
                            disabled={!isAdmin}
                            title={!isAdmin ? "Chỉ Quản trị viên được xóa" : ""}
                          >
                            Xóa
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          )}

          {tab === "Sản phẩm nổi bật" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-sm font-medium uppercase tracking-wide mb-3">
                  Beach Vibe
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {beachVibe.map((p) => (
                    <div
                      key={p.name}
                      className="bg-white rounded-2xl border border-black/10 shadow-sm p-2"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f5f2ee] mb-2">
                        <Image
                          src={p.img}
                          alt={p.name}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </div>
                      <p className="text-xs truncate mb-1">{p.name}</p>
                      <Button
                        size="sm"
                        variant="danger"
                        className="w-full"
                        onClick={() => removeFeatured("beach", p.name)}
                        disabled={!isAdmin}
                      >
                        Gỡ khỏi mục này
                      </Button>
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
                    <div
                      key={p.name}
                      className="bg-white rounded-2xl border border-black/10 shadow-sm p-2"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f5f2ee] mb-2">
                        <Image
                          src={p.img}
                          alt={p.name}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </div>
                      <p className="text-xs truncate mb-1">{p.name}</p>
                      <Button
                        size="sm"
                        variant="danger"
                        className="w-full"
                        onClick={() => removeFeatured("new", p.name)}
                        disabled={!isAdmin}
                      >
                        Gỡ khỏi mục này
                      </Button>
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
              <div className="flex justify-between items-center gap-3 mb-4 flex-wrap">
                <Input
                  value={testimonialSearch}
                  onChange={(e) => setTestimonialSearch(e.target.value)}
                  placeholder="Tìm theo tên sản phẩm..."
                  className="max-w-xs"
                />
                <Button
                  variant="primary"
                  onClick={() => setCreatingTestimonial(true)}
                  disabled={!isAdmin}
                >
                  + Thêm đánh giá
                </Button>
              </div>
              <TableCard>
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="border-b border-black/10">
                      <Th>Khách hàng</Th>
                      <Th>Sản phẩm</Th>
                      <Th>Ngày</Th>
                      <Th>Sao</Th>
                      <Th>Nội dung</Th>
                      <Th align="right">Thao tác</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {testimonials
                      .filter((t) =>
                        (t.product_name ?? "")
                          .toLowerCase()
                          .includes(testimonialSearch.trim().toLowerCase())
                      )
                      .map((t) => (
                      <tr key={t.id ?? t.name + t.quote_date} className={TR_HOVER}>
                        <Td className="whitespace-nowrap">{t.name}</Td>
                        <Td className="whitespace-nowrap text-black/60">
                          {t.product_name || "—"}
                        </Td>
                        <Td className="whitespace-nowrap">
                          {t.quote_date
                            ? new Date(t.quote_date).toLocaleDateString("vi-VN")
                            : ""}
                        </Td>
                        <Td className="whitespace-nowrap">
                          <StarRating rating={t.rating ?? 5} size={13} />
                        </Td>
                        <Td className="max-w-[280px] truncate text-black/60">
                          {t.quote}
                        </Td>
                        <Td align="right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEditTestimonial(t)}
                            >
                              Sửa
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => removeTestimonial(t)}
                              disabled={!isAdmin}
                              title={!isAdmin ? "Chỉ Quản trị viên được xóa" : ""}
                            >
                              Xóa
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                    {testimonials.filter((t) =>
                      (t.product_name ?? "")
                        .toLowerCase()
                        .includes(testimonialSearch.trim().toLowerCase())
                    ).length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-sm text-black/40 py-6">
                          {testimonialSearch.trim()
                            ? `Không tìm thấy đánh giá nào cho sản phẩm "${testimonialSearch}".`
                            : "Chưa có đánh giá nào."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableCard>
            </div>
          )}
        </>
      )}

      {editingSlide && (
        <ModalBackdrop onClose={() => setEditingSlide(null)}>
          <ModalPanel maxWidth="max-w-md">
            <ModalHeader title="Sửa banner" onClose={() => setEditingSlide(null)} />
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label>Nhãn</Label>
                <Input
                  value={slideForm.label}
                  onChange={(e) => setSlideForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tiêu đề</Label>
                <Textarea
                  value={slideForm.title}
                  onChange={(e) => setSlideForm((f) => ({ ...f, title: e.target.value }))}
                  rows={3}
                />
              </div>
              <ImageField
                label="Ảnh banner"
                value={slideForm.image_url || null}
                onChange={(url) => setSlideForm((f) => ({ ...f, image_url: url ?? "" }))}
                disabled={savingSlide}
              />
              <div>
                <Label>Collection (khi bấm &quot;Discover Now&quot; sẽ chuyển tới)</Label>
                <Select
                  value={
                    collectionOptions.some(
                      (c) => `/catalog/${c.slug.toUpperCase()}` === slideForm.href
                    )
                      ? slideForm.href
                      : ""
                  }
                  onChange={(e) => setSlideForm((f) => ({ ...f, href: e.target.value }))}
                >
                  <option value="">— Chọn collection —</option>
                  {collectionOptions.map((c) => (
                    <option key={c.id} value={`/catalog/${c.slug.toUpperCase()}`}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setEditingSlide(null)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={submitEditSlide} disabled={savingSlide}>
                {savingSlide ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {editingTestimonial && (
        <ModalBackdrop onClose={() => setEditingTestimonial(null)}>
          <ModalPanel maxWidth="max-w-md">
            <ModalHeader title="Sửa đánh giá" onClose={() => setEditingTestimonial(null)} />
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label>Tên khách hàng</Label>
                <Input
                  value={testimonialForm.name}
                  onChange={(e) => setTestimonialForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Nội dung đánh giá</Label>
                <Textarea
                  value={testimonialForm.quote}
                  onChange={(e) => setTestimonialForm((f) => ({ ...f, quote: e.target.value }))}
                  rows={4}
                />
              </div>
              <div>
                <Label>Ngày đánh giá</Label>
                <Input
                  type="date"
                  value={testimonialForm.quote_date}
                  onChange={(e) => setTestimonialForm((f) => ({ ...f, quote_date: e.target.value }))}
                  disabled={savingTestimonial}
                />
              </div>
              <div>
                <Label>Số sao</Label>
                <StarPicker
                  value={testimonialForm.rating}
                  onChange={(rating) => setTestimonialForm((f) => ({ ...f, rating }))}
                  disabled={savingTestimonial}
                />
              </div>
              <div>
                <Label>Sản phẩm liên quan (tùy chọn)</Label>
                <ProductPickerField
                  products={productOptions}
                  productId={testimonialForm.product_id}
                  productName={testimonialForm.product_name}
                  onSelect={(id, name) =>
                    setTestimonialForm((f) => ({ ...f, product_id: id, product_name: name }))
                  }
                  onClear={() =>
                    setTestimonialForm((f) => ({ ...f, product_id: null, product_name: "" }))
                  }
                  disabled={savingTestimonial}
                />
              </div>
              <ImageField
                label="Ảnh khách hàng"
                value={testimonialForm.photo_url || null}
                onChange={(url) => setTestimonialForm((f) => ({ ...f, photo_url: url ?? "" }))}
                disabled={savingTestimonial}
              />
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setEditingTestimonial(null)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={submitEditTestimonial} disabled={savingTestimonial}>
                {savingTestimonial ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {creatingTestimonial && (
        <ModalBackdrop onClose={() => setCreatingTestimonial(false)}>
          <ModalPanel maxWidth="max-w-md">
            <ModalHeader title="Thêm đánh giá mới" onClose={() => setCreatingTestimonial(false)} />
            <div className="px-6 py-5 space-y-4">
              <div>
                <Label>Tên khách hàng</Label>
                <Input
                  value={newTestimonialForm.name}
                  onChange={(e) =>
                    setNewTestimonialForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Nội dung đánh giá</Label>
                <Textarea
                  value={newTestimonialForm.quote}
                  onChange={(e) =>
                    setNewTestimonialForm((f) => ({ ...f, quote: e.target.value }))
                  }
                  rows={4}
                />
              </div>
              <div>
                <Label>Ngày đánh giá</Label>
                <Input
                  type="date"
                  value={newTestimonialForm.quote_date}
                  onChange={(e) =>
                    setNewTestimonialForm((f) => ({ ...f, quote_date: e.target.value }))
                  }
                  disabled={savingTestimonial}
                />
              </div>
              <div>
                <Label>Số sao</Label>
                <StarPicker
                  value={newTestimonialForm.rating}
                  onChange={(rating) => setNewTestimonialForm((f) => ({ ...f, rating }))}
                  disabled={savingTestimonial}
                />
              </div>
              <div>
                <Label>Sản phẩm liên quan (tùy chọn)</Label>
                <ProductPickerField
                  products={productOptions}
                  productId={newTestimonialForm.product_id}
                  productName={newTestimonialForm.product_name}
                  onSelect={(id, name) =>
                    setNewTestimonialForm((f) => ({ ...f, product_id: id, product_name: name }))
                  }
                  onClear={() =>
                    setNewTestimonialForm((f) => ({ ...f, product_id: null, product_name: "" }))
                  }
                  disabled={savingTestimonial}
                />
              </div>
              <ImageField
                label="Ảnh khách hàng"
                value={newTestimonialForm.photo_url || null}
                onChange={(url) => setNewTestimonialForm((f) => ({ ...f, photo_url: url ?? "" }))}
                disabled={savingTestimonial}
              />
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setCreatingTestimonial(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={submitNewTestimonial} disabled={savingTestimonial}>
                {savingTestimonial ? "Đang lưu..." : "Thêm"}
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}
    </AdminShell>
  );
}
