"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAdmin } from "@/components/admin/useRequireAdmin";
import Button from "@/components/admin/ui/Button";
import { Input, Textarea, Label } from "@/components/admin/ui/Field";

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
    [key: string]: unknown;
  };
  updatedAt?: string;
};

export default function AdminSiteSettingsPage() {
  useRequireAdmin();
  const [siteTitle, setSiteTitle] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [ogImage, setOgImage] = useState("");

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
        setOgImage("/images/hero/hero-1.webp");
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
    try {
      // NOTE: content.js's PUT /admin/site-settings only recognizes
      // seoTitle/seoDescription (plus storeName/contactEmail/contactPhone/
      // freeShippingThreshold/trustBadges/footerLinks/whatsappNumber/
      // shippingFee/taxPercent) as body keys — there is no OG image field
      // anywhere in the schema. So only seoTitle/seoDescription are sent;
      // ogImage stays local-only (see the note below the form).
      await apiFetch<SiteSettings>("/api/content/admin/site-settings", {
        method: "PUT",
        body: JSON.stringify({
          seoTitle: siteTitle,
          seoDescription: siteDescription,
        }),
      });
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
            <Label>Ảnh chia sẻ mạng xã hội (Open Graph)</Label>
            <Input
              value={ogImage}
              onChange={(e) => setOgImage(e.target.value)}
            />
            <p className="text-xs text-black/40 mt-2">
              Đường dẫn ảnh hiển thị khi chia sẻ link website lên Facebook,
              Zalo, X...
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

      <p className="text-xs text-black/40 mt-4 max-w-2xl">
        API cài đặt website hiện chưa có cột riêng cho ảnh Open Graph, nên
        trường này chỉ minh họa giao diện và chưa được lưu lại.
      </p>
    </AdminShell>
  );
}
