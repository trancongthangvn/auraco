"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import Button from "@/components/admin/ui/Button";
import { Input, Textarea, Label } from "@/components/admin/ui/Field";
import ImageField from "@/components/admin/ImageField";

// Matches server/routes/content.js toAdminSiteSettings() shape for
// GET/PUT /api/content/admin/site-settings. seoTitle/seoDescription are
// convenience fields backed by the `extra` JSONB column server-side; this
// page only edits the fields it already has UI for (SEO title/description,
// OG image) — extra columns like taxPercent/shippingFee/whatsappNumber
// exist in the API but have no form fields here, so they are left untouched.
type SiteSettings = {
  storeName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  freeShippingThreshold?: number | null;
  trustBadges?: unknown[];
  footerLinks?: Record<string, unknown>;
  extra?: {
    seo_title?: string | null;
    seo_description?: string | null;
    delivery_returns_items?: string[] | null;
    og_image_url?: string | null;
    [key: string]: unknown;
  };
  updatedAt?: string;
};

// Falls back to the current hard-coded English copy (lib/i18n/dictionaries/en.ts,
// key product.deliveryReturnsItems) so the admin form starts pre-filled with
// today's live content instead of an empty list.
const DEFAULT_DELIVERY_RETURNS_ITEMS = [
  "Free shipping on orders over $120, plus easy 30-day returns",
  "18K Gold Vermeil / 925 Sterling Silver",
  "100% waterproof and tarnish-resistant, guaranteed",
];

export default function AdminSiteSettingsPage() {
  useRequireAdmin();
  const [siteTitle, setSiteTitle] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [deliveryReturnsItems, setDeliveryReturnsItems] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<SiteSettings>("/api/content/admin/site-settings")
      .then((data) => {
        if (cancelled) return;
        const extra = data.extra || {};
        setSiteTitle((extra.seo_title as string) || "");
        setSiteDescription((extra.seo_description as string) || "");
        setOgImage((extra.og_image_url as string | null) ?? null);
        setDeliveryReturnsItems(
          extra.delivery_returns_items && extra.delivery_returns_items.length > 0
            ? extra.delivery_returns_items
            : DEFAULT_DELIVERY_RETURNS_ITEMS
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Không thể tải cài đặt website"
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const items = deliveryReturnsItems.map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) {
      setError("Cần ít nhất 1 dòng cho mục Giao hàng & Đổi trả");
      setSaving(false);
      return;
    }
    try {
      // NOTE: content.js's PUT /admin/site-settings only recognizes
      // seoTitle/seoDescription/deliveryReturnsItems (plus storeName/
      // contactEmail/contactPhone/freeShippingThreshold/trustBadges/
      // footerLinks/whatsappNumber/shippingFee/taxPercent) as body keys —
      // there is no OG image field anywhere in the schema. So ogImage stays
      // local-only (see the note below the form).
      await apiFetch<SiteSettings>("/api/content/admin/site-settings", {
        method: "PUT",
        body: JSON.stringify({
          seoTitle: siteTitle,
          seoDescription: siteDescription,
          deliveryReturnsItems: items,
          ogImageUrl: ogImage,
        }),
      });
      setDeliveryReturnsItems(items);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Không thể lưu cài đặt website"
      );
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, value: string) => {
    setDeliveryReturnsItems((items) => items.map((s, i) => (i === index ? value : s)));
  };

  const removeItem = (index: number) => {
    setDeliveryReturnsItems((items) => items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setDeliveryReturnsItems((items) => [...items, ""]);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setDeliveryReturnsItems((items) => {
      const next = [...items];
      const target = index + direction;
      if (target < 0 || target >= next.length) return items;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <AdminShell>
      <PageHeader />

      {loading ? (
        <div className="text-sm text-black/50">Đang tải...</div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 max-w-2xl space-y-5"
        >
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <div>
            <Label>Tiêu đề website (SEO title)</Label>
            <Input
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
            />
          </div>

          <div>
            <Label>Mô tả website (SEO description)</Label>
            <Textarea
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <ImageField
              label="Ảnh chia sẻ mạng xã hội (Open Graph)"
              value={ogImage}
              onChange={setOgImage}
            />
            <p className="text-xs text-black/40 mt-2">
              Hiển thị khi chia sẻ link website lên Facebook, Zalo, X...
            </p>
          </div>

          <div className="border-t border-black/10 pt-5">
            <Label>Giao hàng & Đổi trả (hiển thị trên mọi trang sản phẩm)</Label>
            <div className="space-y-2">
              {deliveryReturnsItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Textarea
                    value={item}
                    onChange={(e) => updateItem(i, e.target.value)}
                    rows={1}
                    className="flex-1"
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => moveItem(i, -1)}
                      disabled={i === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => moveItem(i, 1)}
                      disabled={i === deliveryReturnsItems.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => removeItem(i)}
                  >
                    Xóa
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={addItem}>
              + Thêm dòng
            </Button>
            <p className="text-xs text-black/40 mt-2">
              Áp dụng cho toàn bộ sản phẩm (chưa hỗ trợ theo từng ngôn ngữ — hiện
              chỉ có bản tiếng Anh).
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
            {saved && <span className="text-xs text-green-700">Đã lưu.</span>}
          </div>
        </form>
      )}
    </AdminShell>
  );
}
