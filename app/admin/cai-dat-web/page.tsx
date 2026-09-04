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
// GET/PUT /api/content/admin/site-settings. seoTitle/seoDescription/
// ogImageUrl/deliveryReturnsItems/taxPercent are convenience fields backed
// by the `extra` JSONB column server-side; storeName/contactEmail/
// contactPhone/freeShippingThreshold are real columns. shippingFee/
// whatsappNumber/trustBadges/footerLinks exist in the API but have no form
// fields here yet — left untouched, add when a page needs them.
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
    why_love_it_label?: string | null;
    og_image_url?: string | null;
    tax_percent?: number | null;
    it_girl_edit_image_url?: string | null;
    it_girl_edit_heading?: string | null;
    it_girl_edit_description?: string | null;
    currency_rates?: Record<string, number> | null;
    currency_active?: Record<string, boolean> | null;
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

// Matches lib/i18n/dictionaries/en.ts's product.whyLoveIt, so this field
// starts pre-filled with today's live heading instead of an empty box.
const DEFAULT_WHY_LOVE_IT_LABEL = "Why You'll Love It:";

// Matches components/ITGirlEdit.tsx's own hardcoded fallbacks, so this form
// starts pre-filled with today's live content instead of an empty section.
const DEFAULT_IT_GIRL_EDIT_IMAGE = "/images/pages/64e5ed6e-0491-4f3d-a678-b315945972da.png";
const DEFAULT_IT_GIRL_EDIT_HEADING = "The IT-Girl Edit: Effortless Edge & Sterling Chic";
const DEFAULT_IT_GIRL_EDIT_DESCRIPTION =
  "Redefine your everyday sparkle with pieces curated for the modern " +
  "trendsetter. Blending effortless streetwear cool with high-shine " +
  "sterling silver sophistication, this collection is designed for the " +
  "girl who sets the standard instead of following it. From coffee runs to VIP " +
  "nights out, make every look unforgettable.";

// USD's own rate is always fixed at 1 (it's the list-price currency itself,
// not something an admin sets) — only EUR/GBP are ever editable here.
const CURRENCY_ROWS = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
] as const;

export default function AdminSiteSettingsPage() {
  useRequireAdmin();
  const [siteTitle, setSiteTitle] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [deliveryReturnsItems, setDeliveryReturnsItems] = useState<string[]>([]);
  const [whyLoveItLabel, setWhyLoveItLabel] = useState("");
  const [storeName, setStoreName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [itGirlEditImage, setItGirlEditImage] = useState<string | null>(null);
  const [itGirlEditHeading, setItGirlEditHeading] = useState("");
  const [itGirlEditDescription, setItGirlEditDescription] = useState("");
  // EUR/GBP only — USD is fixed at "1" and never sent to the server.
  const [currencyRates, setCurrencyRates] = useState<Record<string, string>>({
    EUR: "1",
    GBP: "1",
  });
  // USD always true — see lib/currency.ts's defaultCurrencyActive comment.
  const [currencyActive, setCurrencyActive] = useState<Record<string, boolean>>({
    USD: true,
    EUR: true,
    GBP: true,
  });

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
        setStoreName(data.storeName || "");
        setContactEmail(data.contactEmail || "");
        setContactPhone(data.contactPhone || "");
        setFreeShippingThreshold(
          data.freeShippingThreshold != null ? String(data.freeShippingThreshold) : ""
        );
        setTaxPercent(extra.tax_percent != null ? String(extra.tax_percent) : "");
        setDeliveryReturnsItems(
          extra.delivery_returns_items && extra.delivery_returns_items.length > 0
            ? extra.delivery_returns_items
            : DEFAULT_DELIVERY_RETURNS_ITEMS
        );
        setWhyLoveItLabel(
          (extra.why_love_it_label as string) || DEFAULT_WHY_LOVE_IT_LABEL
        );
        setItGirlEditImage(
          (extra.it_girl_edit_image_url as string | null) ?? DEFAULT_IT_GIRL_EDIT_IMAGE
        );
        setItGirlEditHeading(
          (extra.it_girl_edit_heading as string) || DEFAULT_IT_GIRL_EDIT_HEADING
        );
        setItGirlEditDescription(
          (extra.it_girl_edit_description as string) || DEFAULT_IT_GIRL_EDIT_DESCRIPTION
        );
        if (extra.currency_rates) {
          setCurrencyRates({
            EUR: extra.currency_rates.EUR != null ? String(extra.currency_rates.EUR) : "1",
            GBP: extra.currency_rates.GBP != null ? String(extra.currency_rates.GBP) : "1",
          });
        }
        if (extra.currency_active) {
          setCurrencyActive({
            USD: true,
            EUR: extra.currency_active.EUR ?? true,
            GBP: extra.currency_active.GBP ?? true,
          });
        }
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
    const parsedThreshold = freeShippingThreshold.trim()
      ? Number(freeShippingThreshold)
      : null;
    if (parsedThreshold !== null && (!Number.isFinite(parsedThreshold) || parsedThreshold < 0)) {
      setError("Ngưỡng miễn phí vận chuyển phải là số không âm");
      setSaving(false);
      return;
    }
    const parsedTaxPercent = taxPercent.trim() ? Number(taxPercent) : null;
    if (
      parsedTaxPercent !== null &&
      (!Number.isFinite(parsedTaxPercent) || parsedTaxPercent < 0 || parsedTaxPercent > 100)
    ) {
      setError("Thuế (%) phải là số từ 0 đến 100");
      setSaving(false);
      return;
    }
    const parsedEurRate = Number(currencyRates.EUR);
    const parsedGbpRate = Number(currencyRates.GBP);
    if (
      !Number.isFinite(parsedEurRate) ||
      parsedEurRate <= 0 ||
      !Number.isFinite(parsedGbpRate) ||
      parsedGbpRate <= 0
    ) {
      setError("Tỉ giá EUR/GBP phải là số lớn hơn 0");
      setSaving(false);
      return;
    }
    try {
      await apiFetch<SiteSettings>("/api/content/admin/site-settings", {
        method: "PUT",
        body: JSON.stringify({
          seoTitle: siteTitle,
          seoDescription: siteDescription,
          deliveryReturnsItems: items,
          whyLoveItLabel: whyLoveItLabel.trim() || DEFAULT_WHY_LOVE_IT_LABEL,
          ogImageUrl: ogImage,
          itGirlEditImageUrl: itGirlEditImage,
          itGirlEditHeading: itGirlEditHeading.trim() || DEFAULT_IT_GIRL_EDIT_HEADING,
          itGirlEditDescription:
            itGirlEditDescription.trim() || DEFAULT_IT_GIRL_EDIT_DESCRIPTION,
          currencyRates: { USD: 1, EUR: parsedEurRate, GBP: parsedGbpRate },
          currencyActive: {
            USD: true,
            EUR: currencyActive.EUR,
            GBP: currencyActive.GBP,
          },
          storeName: storeName.trim() || undefined,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          ...(parsedThreshold !== null ? { freeShippingThreshold: parsedThreshold } : {}),
          taxPercent: parsedTaxPercent ?? 0,
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
            <Label>Tên cửa hàng</Label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Email liên hệ</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hello@yourdomain.com"
              />
            </div>
            <div>
              <Label>Số điện thoại liên hệ</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Ngưỡng miễn phí vận chuyển (USD)</Label>
              <Input
                type="number"
                min={0}
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                placeholder="VD: 120"
              />
            </div>
            <div>
              <Label>Thuế (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                placeholder="VD: 8"
              />
              <p className="mt-1 text-xs text-black/40">
                Tính vào Tổng cộng khi thanh toán, hiển thị dạng &quot;Bao
                gồm $X thuế&quot;. Để trống hoặc 0 nếu không thu thuế.
              </p>
            </div>
          </div>

          <div className="border-t border-black/10 pt-5">
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
            <Label>Tiêu đề mô tả sản phẩm (hiển thị trên mọi trang sản phẩm)</Label>
            <Input
              value={whyLoveItLabel}
              onChange={(e) => setWhyLoveItLabel(e.target.value)}
              placeholder={DEFAULT_WHY_LOVE_IT_LABEL}
            />
            <p className="text-xs text-black/40 mt-2">
              Dòng chữ in đậm phía trên đoạn mô tả sản phẩm (ví dụ:
              &quot;Why You&apos;ll Love It:&quot;). Áp dụng cho toàn bộ sản
              phẩm (chưa hỗ trợ theo từng ngôn ngữ — hiện chỉ có bản tiếng
              Anh).
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

          <div className="border-t border-black/10 pt-5">
            <Label>Mục &quot;The IT-Girl Edit&quot; (trang chủ)</Label>
            <div className="space-y-4">
              <ImageField
                label="Ảnh"
                value={itGirlEditImage}
                onChange={setItGirlEditImage}
              />
              <div>
                <Label>Tiêu đề</Label>
                <Input
                  value={itGirlEditHeading}
                  onChange={(e) => setItGirlEditHeading(e.target.value)}
                />
              </div>
              <div>
                <Label>Mô tả</Label>
                <Textarea
                  value={itGirlEditDescription}
                  onChange={(e) => setItGirlEditDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-black/10 pt-5">
            <Label>Tỉ giá quy đổi (USD → EUR/GBP)</Label>
            <p className="text-xs text-black/40 mb-3">
              Giá hiển thị = giá niêm yết (USD) × tỉ giá. Chỉ áp dụng ở khu duyệt
              sản phẩm (trang sản phẩm nổi bật, catalog, mua cùng nhau) — giỏ
              hàng và thanh toán luôn giữ nguyên USD.
            </p>
            <div className="overflow-hidden rounded-xl border border-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 bg-black/[0.02] text-left text-xs text-black/50">
                    <th className="px-3 py-2 font-medium">Mã</th>
                    <th className="px-3 py-2 font-medium">Tên</th>
                    <th className="px-3 py-2 font-medium">Ký hiệu</th>
                    <th className="px-3 py-2 font-medium">Tỉ giá / 1 USD</th>
                    <th className="px-3 py-2 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {CURRENCY_ROWS.map((row) => (
                    <tr key={row.code} className="border-b border-black/5 last:border-0">
                      <td className="px-3 py-2 font-semibold">{row.code}</td>
                      <td className="px-3 py-2">{row.label}</td>
                      <td className="px-3 py-2">{row.symbol}</td>
                      <td className="px-3 py-2">
                        {row.code === "USD" ? (
                          <Input value="1" disabled className="w-28" />
                        ) : (
                          <Input
                            value={currencyRates[row.code]}
                            onChange={(e) =>
                              setCurrencyRates((r) => ({ ...r, [row.code]: e.target.value }))
                            }
                            type="number"
                            step="0.0001"
                            min={0}
                            className="w-28"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={currencyActive[row.code]}
                          disabled={row.code === "USD"}
                          title={
                            row.code === "USD"
                              ? "USD là tiền tệ gốc, luôn bật"
                              : undefined
                          }
                          onChange={(e) =>
                            setCurrencyActive((a) => ({ ...a, [row.code]: e.target.checked }))
                          }
                          className="h-4 w-4 accent-ink disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
