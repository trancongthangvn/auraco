"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import IconButton from "@/components/admin/ui/IconButton";
import { Input, Label, Textarea } from "@/components/admin/ui/Field";
import VideoField from "@/components/admin/VideoField";
import ImageField from "@/components/admin/ImageField";
import { TableCard, Th, Td, TR_HOVER, EmptyState } from "@/components/admin/ui/Table";
import {
  ModalBackdrop,
  ModalPanel,
  ModalHeader,
  ModalFooter,
} from "@/components/admin/ui/Modal";

type AdminProduct = {
  id: number;
  slug: string;
  name: string;
  category: string;
  material: string;
  price: number;
  compare_at_price: number | null;
  rating: number;
  review_count: number;
  images: string[];
  description: string;
  features: string[];
  stock: number;
  active: boolean;
  video_url: string | null;
  sort_order: number;
  attributes?: AdminAttribute[];
  collections?: string[];
  brand?: string | null;
  thumbnail_url?: string | null;
  discount_percent?: number;
  badge_label?: string | null;
  sticker_image_url?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  show_at_home?: boolean;
};

type AdminVariant = {
  id?: number;
  color_name: string;
  color_swatch: string;
  size: string;
  price: string;
  compare_at_price: string;
  stock: string;
  sku: string;
  front_image: string | null;
  is_default: boolean;
  active: boolean;
};

const emptyVariant = (): AdminVariant => ({
  color_name: "",
  color_swatch: "#c9a876",
  size: "",
  price: "",
  compare_at_price: "",
  stock: "0",
  sku: "",
  front_image: null,
  is_default: false,
  active: true,
});

type AdminAttribute = { id?: number; name: string; value: string };

type AdminCollection = { id: number; slug: string; name: string };

/** category is a single required value on every product ("Type" in the
 *  storefront's own filter labels — Necklaces/Bracelets/etc.); collections
 *  are the optional tags (Quiet Luxury, Best Sellers...) a product can carry
 *  any number of. Kept in sync with server/routes/products.js's own
 *  VALID_CATEGORIES allow-list. */
const CATEGORY_OPTIONS = ["Necklaces", "Bracelets", "Earrings", "Signature Sets"];

export default function AdminProductsPage() {
  const { session } = useAdminAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [collections, setCollections] = useState<AdminCollection[]>([]);

  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newMaterial, setNewMaterial] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCollections, setEditCollections] = useState<string[]>([]);
  const [editSortOrder, setEditSortOrder] = useState("0");
  const [editStock, setEditStock] = useState("0");
  const [editBrand, setEditBrand] = useState("");
  const [editThumbnail, setEditThumbnail] = useState<string | null>(null);
  const [editDiscountPercent, setEditDiscountPercent] = useState("0");
  const [editBadgeLabel, setEditBadgeLabel] = useState("");
  const [editStickerImage, setEditStickerImage] = useState<string | null>(null);
  const [editMetaTitle, setEditMetaTitle] = useState("");
  const [editMetaDescription, setEditMetaDescription] = useState("");
  const [editShowAtHome, setEditShowAtHome] = useState(false);
  const [editVariants, setEditVariants] = useState<AdminVariant[]>([]);
  const [originalVariants, setOriginalVariants] = useState<AdminVariant[]>([]);
  const [editBundleCompanions, setEditBundleCompanions] = useState<string[]>([]);
  const [bundleSearch, setBundleSearch] = useState("");
  const [editBundleDiscount, setEditBundleDiscount] = useState("0");
  const [editVideoUrl, setEditVideoUrl] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editAttributes, setEditAttributes] = useState<AdminAttribute[]>([]);
  const [originalAttributes, setOriginalAttributes] = useState<AdminAttribute[]>([]);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isAdmin = session?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<AdminProduct[]>("/api/products/admin/products");
        if (!cancelled) setProducts(data);
        const colls = await apiFetch<AdminCollection[]>("/api/collections/admin");
        if (!cancelled) setCollections(colls);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Không thể tải danh sách sản phẩm");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateAttribute = (
    index: number,
    field: keyof AdminAttribute,
    value: string
  ) => {
    setEditAttributes((list) =>
      list.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const removeAttribute = (index: number) => {
    setEditAttributes((list) => list.filter((_, i) => i !== index));
  };

  function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
    const target = index + direction;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }

  /** Each feature is stored as a single "Label: Value" string (no schema
   *  change needed — the 300+ already-imported products keep working as
   *  plain, label-less bullets). The admin form edits label/value as two
   *  boxes and joins/splits at the boundary; the storefront bolds the label
   *  when one is present (see product/[slug]/page.tsx). */
  const splitFeature = (raw: string): { label: string; value: string } => {
    const i = raw.indexOf(": ");
    return i === -1 ? { label: "", value: raw } : { label: raw.slice(0, i), value: raw.slice(i + 2) };
  };
  const joinFeature = (label: string, value: string) =>
    label.trim() ? `${label.trim()}: ${value}` : value;

  const updateFeatureLabel = (index: number, label: string) => {
    setEditFeatures((list) =>
      list.map((f, i) => (i === index ? joinFeature(label, splitFeature(f).value) : f))
    );
  };
  const updateFeatureValue = (index: number, value: string) => {
    setEditFeatures((list) =>
      list.map((f, i) => (i === index ? joinFeature(splitFeature(f).label, value) : f))
    );
  };
  const removeFeature = (index: number) => {
    setEditFeatures((list) => list.filter((_, i) => i !== index));
  };
  const moveFeature = (index: number, direction: -1 | 1) => {
    setEditFeatures((list) => moveItem(list, index, direction));
  };

  const updateVariant = (index: number, patch: Partial<AdminVariant>) => {
    setEditVariants((list) =>
      list.map((v, i) => {
        if (i !== index) {
          // Only one variant can be the default at a time.
          return patch.is_default ? { ...v, is_default: false } : v;
        }
        return { ...v, ...patch };
      })
    );
  };
  const removeVariant = (index: number) => {
    setEditVariants((list) => list.filter((_, i) => i !== index));
  };
  const addVariant = () => {
    setEditVariants((list) => [
      ...list,
      { ...emptyVariant(), is_default: list.length === 0 },
    ]);
  };

  const updateImage = (index: number, url: string | null) => {
    setEditImages((list) => list.map((img, i) => (i === index ? url ?? "" : img)));
  };
  const removeImage = (index: number) => {
    setEditImages((list) => list.filter((_, i) => i !== index));
  };
  const moveImage = (index: number, direction: -1 | 1) => {
    setEditImages((list) => moveItem(list, index, direction));
  };

  const openEdit = async (p: AdminProduct) => {
    setEditing(p);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setEditCategory(p.category);
    setEditCollections(p.collections ?? []);
    setEditSortOrder(String(p.sort_order ?? 0));
    setEditStock(String(p.stock ?? 0));
    setEditBrand(p.brand ?? "");
    setEditThumbnail(p.thumbnail_url ?? null);
    setEditDiscountPercent(String(p.discount_percent ?? 0));
    setEditBadgeLabel(p.badge_label ?? "");
    setEditStickerImage(p.sticker_image_url ?? null);
    setEditMetaTitle(p.meta_title ?? "");
    setEditMetaDescription(p.meta_description ?? "");
    setEditShowAtHome(Boolean(p.show_at_home));
    setEditVideoUrl(p.video_url ?? null);
    setEditDescription(p.description ?? "");
    setEditFeatures(p.features ?? []);
    setEditImages(p.images ?? []);
    setModalError(null);
    setEditAttributes(p.attributes ?? []);
    setOriginalAttributes(p.attributes ?? []);
    setEditBundleCompanions([]);
    setEditBundleDiscount("0");
    setBundleSearch("");
    setEditVariants([]);
    setOriginalVariants([]);
    try {
      const variants = await apiFetch<
        {
          id: number;
          color_name: string | null;
          color_swatch: string | null;
          size: string | null;
          price: number;
          compare_at_price: number | null;
          stock: number;
          sku: string | null;
          front_image: string | null;
          is_default: boolean;
          active: boolean;
        }[]
      >(`/api/products/admin/products/${p.slug}/variants`);
      const mapped: AdminVariant[] = variants.map((v) => ({
        id: v.id,
        color_name: v.color_name ?? "",
        color_swatch: v.color_swatch ?? "#c9a876",
        size: v.size ?? "",
        price: String(v.price),
        compare_at_price: v.compare_at_price !== null ? String(v.compare_at_price) : "",
        stock: String(v.stock),
        sku: v.sku ?? "",
        front_image: v.front_image,
        is_default: v.is_default,
        active: v.active,
      }));
      setEditVariants(mapped);
      setOriginalVariants(mapped);
    } catch {
      // no variants yet — the product behaves as non-variant, form starts empty
    }
    try {
      const attrs = await apiFetch<AdminAttribute[]>(
        `/api/products/admin/products/${p.slug}/attributes`
      );
      setEditAttributes(attrs);
      setOriginalAttributes(attrs);
    } catch {
      // fall back to the attributes already attached to the product row
    }
    try {
      const bundle = await apiFetch<{
        discountPercent: number;
        companions: { slug: string }[];
      }>(`/api/products/admin/products/${p.slug}/bundle`);
      setEditBundleCompanions(bundle.companions.map((c) => c.slug));
      setEditBundleDiscount(String(bundle.discountPercent));
    } catch {
      // no bundle configured yet — the fields above stay at their defaults
    }
  };

  const toggleVisible = async (p: AdminProduct) => {
    try {
      const updated = await apiFetch<AdminProduct>(
        `/api/products/admin/products/${p.slug}`,
        {
          method: "PUT",
          body: JSON.stringify({ active: !p.active }),
        }
      );
      setProducts((list) =>
        list.map((item) => (item.slug === p.slug ? { ...item, ...updated } : item))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể cập nhật trạng thái");
    }
  };

  const remove = async (slug: string) => {
    if (!isAdmin) return;
    try {
      await apiFetch(`/api/products/admin/products/${slug}`, { method: "DELETE" });
      setProducts((list) => list.filter((p) => p.slug !== slug));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể xóa sản phẩm");
    }
  };

  const openCreate = () => {
    setCreating(true);
    setNewSlug("");
    setEditName("");
    setEditPrice("");
    setNewMaterial("");
    setEditCategory(CATEGORY_OPTIONS[0]);
    setEditCollections([]);
    setEditSortOrder("0");
    setEditStock("0");
    setEditDescription("");
    setEditImages([]);
    setEditThumbnail(null);
    setCreateError(null);
  };

  const createProduct = async () => {
    setSaving(true);
    setCreateError(null);
    try {
      const slug = (newSlug || editName)
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const parsedPrice = Number(editPrice);
      const parsedStock = Number.parseInt(editStock, 10);
      const parsedSortOrder = Number.parseInt(editSortOrder, 10);
      const created = await apiFetch<AdminProduct>("/api/products/admin/products", {
        method: "POST",
        body: JSON.stringify({
          slug,
          name: editName,
          category: editCategory,
          collections: editCollections,
          material: newMaterial,
          price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
          stock: Number.isInteger(parsedStock) ? parsedStock : 0,
          sortOrder: Number.isInteger(parsedSortOrder) ? parsedSortOrder : 0,
          description: editDescription,
          images: editImages.filter((img) => img.trim().length > 0),
          thumbnailUrl: editThumbnail,
        }),
      });
      setProducts((list) => [created, ...list]);
      setCreating(false);
      openEdit(created);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Không thể tạo sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const bundleCandidates = products
    .filter((p) => p.slug !== editing?.slug)
    .filter((p) => p.name.toLowerCase().includes(bundleSearch.trim().toLowerCase()));

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setModalError(null);
    try {
      const parsedPrice = Number(editPrice);
      const parsedSortOrder = Number.parseInt(editSortOrder, 10);
      const parsedStock = Number.parseInt(editStock, 10);
      const parsedDiscountPercent = Number(editDiscountPercent);
      const updated = await apiFetch<AdminProduct>(
        `/api/products/admin/products/${editing.slug}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: editName,
            price: Number.isFinite(parsedPrice) ? parsedPrice : editing.price,
            category: editCategory,
            collections: editCollections,
            sortOrder: Number.isInteger(parsedSortOrder) ? parsedSortOrder : 0,
            stock: Number.isInteger(parsedStock) ? parsedStock : editing.stock,
            videoUrl: editVideoUrl,
            description: editDescription,
            features: editFeatures.filter((f) => f.trim().length > 0),
            images: editImages.filter((img) => img.trim().length > 0),
            brand: editBrand.trim() || null,
            thumbnailUrl: editThumbnail,
            discountPercent: Number.isFinite(parsedDiscountPercent) ? parsedDiscountPercent : 0,
            badgeLabel: editBadgeLabel.trim() || null,
            stickerImageUrl: editStickerImage,
            metaTitle: editMetaTitle.trim() || null,
            metaDescription: editMetaDescription.trim() || null,
            showAtHome: editShowAtHome,
          }),
        }
      );

      const originalById = new Map(
        originalAttributes.filter((a) => a.id !== undefined).map((a) => [a.id, a])
      );
      const remainingIds = new Set(
        editAttributes.filter((a) => a.id !== undefined).map((a) => a.id)
      );

      const savedAttributes: AdminAttribute[] = [];

      for (const attr of editAttributes) {
        if (attr.id === undefined) {
          if (!attr.name.trim() || !attr.value.trim()) continue;
          const created = await apiFetch<AdminAttribute>(
            `/api/products/admin/products/${editing.slug}/attributes`,
            {
              method: "POST",
              body: JSON.stringify({ name: attr.name, value: attr.value }),
            }
          );
          savedAttributes.push(created);
        } else {
          const original = originalById.get(attr.id);
          if (original && original.name === attr.name && original.value === attr.value) {
            savedAttributes.push(attr);
            continue;
          }
          const result = await apiFetch<AdminAttribute>(
            `/api/products/admin/products/${editing.slug}/attributes/${attr.id}`,
            {
              method: "PUT",
              body: JSON.stringify({ name: attr.name, value: attr.value }),
            }
          );
          savedAttributes.push(result);
        }
      }

      for (const original of originalAttributes) {
        if (original.id !== undefined && !remainingIds.has(original.id)) {
          await apiFetch(
            `/api/products/admin/products/${editing.slug}/attributes/${original.id}`,
            { method: "DELETE" }
          );
        }
      }

      const parsedBundleDiscount = Number(editBundleDiscount);
      await apiFetch(`/api/products/admin/products/${editing.slug}/bundle`, {
        method: "PUT",
        body: JSON.stringify({
          companions: editBundleCompanions,
          discountPercent: Number.isFinite(parsedBundleDiscount) ? parsedBundleDiscount : 0,
        }),
      });

      const variantRemainingIds = new Set(
        editVariants.filter((v) => v.id !== undefined).map((v) => v.id)
      );
      for (const variant of editVariants) {
        const body = JSON.stringify({
          colorName: variant.color_name.trim() || null,
          colorSwatch: variant.color_swatch || null,
          size: variant.size.trim() || null,
          price: Number(variant.price) || 0,
          compareAtPrice: variant.compare_at_price.trim()
            ? Number(variant.compare_at_price)
            : null,
          stock: Number.parseInt(variant.stock, 10) || 0,
          sku: variant.sku.trim() || null,
          frontImage: variant.front_image,
          isDefault: variant.is_default,
          active: variant.active,
        });
        if (variant.id === undefined) {
          await apiFetch(`/api/products/admin/products/${editing.slug}/variants`, {
            method: "POST",
            body,
          });
        } else {
          await apiFetch(
            `/api/products/admin/products/${editing.slug}/variants/${variant.id}`,
            { method: "PUT", body }
          );
        }
      }
      for (const original of originalVariants) {
        if (original.id !== undefined && !variantRemainingIds.has(original.id)) {
          await apiFetch(
            `/api/products/admin/products/${editing.slug}/variants/${original.id}`,
            { method: "DELETE" }
          );
        }
      }

      setProducts((list) =>
        list.map((p) =>
          p.slug === editing.slug
            ? { ...p, ...updated, attributes: savedAttributes }
            : p
        )
      );
      setEditing(null);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {loading ? "Đang tải..." : `${filteredProducts.length}/${products.length} sản phẩm`}
        </span>
        <Button variant="secondary" onClick={openCreate}>
          + Thêm sản phẩm
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-4 text-xs text-red-700 border border-red-700/30 bg-red-50 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm theo tên sản phẩm..."
        className="mb-4 max-w-sm"
      />

      <TableCard>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-black/10">
              <Th>Ảnh</Th>
              <Th>Tên sản phẩm</Th>
              <Th>Danh mục</Th>
              <Th align="center">Ưu tiên</Th>
              <Th align="right">Giá</Th>
              <Th align="center">Trạng thái</Th>
              <Th align="right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>
                  <EmptyState>Đang tải...</EmptyState>
                </td>
              </tr>
            )}
            {!loading && products.length > 0 && filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState>Không tìm thấy sản phẩm nào khớp &quot;{search}&quot;.</EmptyState>
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState>Chưa có sản phẩm nào.</EmptyState>
                </td>
              </tr>
            )}
            {filteredProducts.map((p) => (
              <tr key={p.slug} className={TR_HOVER}>
                <Td>
                  <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-[#f5f2ee]">
                    {p.images?.[0] && (
                      <Image src={p.images[0]} alt={p.name} fill sizes="40px" className="object-cover" />
                    )}
                  </div>
                </Td>
                <Td>{p.name}</Td>
                <Td>{p.category}</Td>
                <Td align="center">
                  {p.sort_order > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-white">
                      {p.sort_order}
                    </span>
                  ) : (
                    <span className="text-black/25">—</span>
                  )}
                </Td>
                <Td align="right">${Number(p.price).toFixed(2)}</Td>
                <Td align="center">
                  <button
                    onClick={() => toggleVisible(p)}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap border transition-all duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                      p.active
                        ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        : "border-black/15 bg-black/5 text-black/40 hover:bg-black/10"
                    }`}
                  >
                    {p.active ? "Đang hiển thị" : "Đã ẩn"}
                  </button>
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => remove(p.slug)}
                      disabled={!isAdmin}
                      title={!isAdmin ? "Chỉ Quản trị viên được xóa sản phẩm" : ""}
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

      {creating && (
        <ModalBackdrop onClose={() => setCreating(false)}>
          <ModalPanel maxWidth="max-w-md">
            <ModalHeader title="Thêm sản phẩm" onClose={() => setCreating(false)} />
            <div className="px-6 py-4">
              {createError && (
                <div className="mb-4 text-xs text-red-700 border border-red-700/30 bg-red-50 rounded-xl px-3 py-2">
                  {createError}
                </div>
              )}

              <Label>Tên sản phẩm</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="VD: Layered Opal Necklace"
                className="mb-4"
                disabled={saving}
              />

              <Label>Slug (để trống để tự tạo từ tên)</Label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="vd-layered-opal-necklace"
                className="mb-4"
                disabled={saving}
              />

              <Label>Danh mục (Brand)</Label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                disabled={saving}
                className="mb-4 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-ink"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <Label>Chất liệu</Label>
              <Input
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                placeholder="VD: 18k Gold Vermeil"
                className="mb-4"
                disabled={saving}
              />

              <Label>Category (bộ sưu tập)</Label>
              <div className="mb-4 flex flex-wrap gap-2">
                {collections.length === 0 && (
                  <p className="text-xs text-black/30 italic">Chưa có bộ sưu tập nào.</p>
                )}
                {collections.map((c) => {
                  const active = editCollections.includes(c.slug);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setEditCollections((list) =>
                          active
                            ? list.filter((s) => s !== c.slug)
                            : [...list, c.slug]
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        active
                          ? "border-ink bg-ink text-white"
                          : "border-black/15 bg-white text-black/70 hover:border-ink"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                <div>
                  <Label>Giá (USD)</Label>
                  <Input
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    type="number"
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label>Tồn kho</Label>
                  <Input
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    type="number"
                    min={0}
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label>Ưu tiên</Label>
                  <Input
                    value={editSortOrder}
                    onChange={(e) => setEditSortOrder(e.target.value)}
                    type="number"
                    disabled={saving}
                  />
                </div>
              </div>

              <Label>Mô tả sản phẩm</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="Mô tả hiển thị ở mục &quot;Why You'll Love It&quot;"
                className="mb-4"
                disabled={saving}
              />

              <div className="mb-2 grid grid-cols-2 gap-3">
                <ImageField
                  label="Ảnh bìa"
                  value={editImages[0] ?? null}
                  onChange={(url) => setEditImages((list) => [url ?? "", ...list.slice(1)])}
                  disabled={saving}
                />
                <ImageField
                  label="Thumbnail riêng (tùy chọn)"
                  value={editThumbnail}
                  onChange={setEditThumbnail}
                  disabled={saving}
                />
              </div>
              <p className="text-xs text-black/40 mb-2 mt-1">
                Sau khi tạo, form sửa chi tiết (thêm ảnh, điểm nổi bật, biến
                thể, thuộc tính, SEO...) sẽ mở ra ngay để bạn điền tiếp.
              </p>
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setCreating(false)} disabled={saving}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={createProduct}
                disabled={saving || !editName.trim() || !newMaterial.trim() || !editPrice.trim()}
              >
                {saving ? "Đang tạo..." : "Tạo sản phẩm"}
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {editing && (
        <ModalBackdrop onClose={() => setEditing(null)}>
          <ModalPanel maxWidth="max-w-lg">
            <ModalHeader title="Sửa sản phẩm" onClose={() => setEditing(null)} />
            <div className="px-6 py-4">
              {modalError && (
                <div className="mb-4 text-xs text-red-700 border border-red-700/30 bg-red-50 rounded-xl px-3 py-2">
                  {modalError}
                </div>
              )}

              <Label>Tên sản phẩm</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mb-4"
              />
              <Label>Giá (USD)</Label>
              <Input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                type="number"
                className="mb-6"
              />

              <Label>Danh mục (Brand)</Label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                disabled={saving}
                className="mb-6 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-ink"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <Label>Category (bộ sưu tập)</Label>
              <div className="mb-6 flex flex-wrap gap-2">
                {collections.length === 0 && (
                  <p className="text-xs text-black/30 italic">Chưa có bộ sưu tập nào.</p>
                )}
                {collections.map((c) => {
                  const active = editCollections.includes(c.slug);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setEditCollections((list) =>
                          active
                            ? list.filter((s) => s !== c.slug)
                            : [...list, c.slug]
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        active
                          ? "border-ink bg-ink text-white"
                          : "border-black/15 bg-white text-black/70 hover:border-ink"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>

              <Label>Thứ tự ưu tiên</Label>
              <Input
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(e.target.value)}
                type="number"
                disabled={saving}
                className="mb-1"
              />
              <p className="text-xs text-black/40 mb-6">
                Số càng nhỏ (lớn hơn 0) càng được ưu tiên xuất hiện đầu trang. Để
                0 nếu không cần ưu tiên.
              </p>

              <Label>Tồn kho (Stock)</Label>
              <Input
                value={editStock}
                onChange={(e) => setEditStock(e.target.value)}
                type="number"
                min={0}
                disabled={saving}
                className="mb-6"
              />

              <details className="mb-6 rounded-lg border border-black/10 group">
                <summary className="cursor-pointer select-none list-none px-3 py-2.5 text-xs font-semibold text-black/60 flex items-center justify-between">
                  Nâng cao (Brand, SEO, badge, sticker...)
                  <span className="text-black/30 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-3 pb-4 pt-1 border-t border-black/10">
                  <Label>Brand (tên nhà thiết kế/bộ sưu tập, tùy chọn)</Label>
                  <Input
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    placeholder="VD: The Sacred Alignment"
                    className="mb-4"
                    disabled={saving}
                  />

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div>
                      <Label>Giảm giá thẻ sản phẩm (%)</Label>
                      <Input
                        value={editDiscountPercent}
                        onChange={(e) => setEditDiscountPercent(e.target.value)}
                        type="number"
                        min={0}
                        max={100}
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <Label>Badge (VD: HOT, LIMITED)</Label>
                      <Input
                        value={editBadgeLabel}
                        onChange={(e) => setEditBadgeLabel(e.target.value)}
                        placeholder="Để trống để ẩn"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <ImageField
                      label="Thumbnail riêng"
                      value={editThumbnail}
                      onChange={setEditThumbnail}
                      disabled={saving}
                    />
                    <ImageField
                      label="Sticker (góc thẻ sản phẩm)"
                      value={editStickerImage}
                      onChange={setEditStickerImage}
                      disabled={saving}
                    />
                  </div>

                  <label className="mb-4 flex items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={editShowAtHome}
                      onChange={(e) => setEditShowAtHome(e.target.checked)}
                      disabled={saving}
                      className="h-4 w-4 accent-ink"
                    />
                    Hiện ở băng video trang chủ
                  </label>

                  <Label>SEO — Meta title</Label>
                  <Input
                    value={editMetaTitle}
                    onChange={(e) => setEditMetaTitle(e.target.value)}
                    placeholder="Để trống để dùng tên sản phẩm"
                    className="mb-4"
                    disabled={saving}
                  />
                  <Label>SEO — Meta description</Label>
                  <Textarea
                    value={editMetaDescription}
                    onChange={(e) => setEditMetaDescription(e.target.value)}
                    rows={2}
                    placeholder="Để trống để dùng mô tả sản phẩm"
                    disabled={saving}
                  />
                </div>
              </details>

              <div className="mb-6">
                <VideoField
                  label="Video sản phẩm"
                  hint="Video MP4 ngắn, lặp — hiển thị ở băng video trên trang chủ. Để trống nếu sản phẩm không có video."
                  value={editVideoUrl}
                  onChange={setEditVideoUrl}
                  disabled={saving}
                />
              </div>

              <Label>Mô tả sản phẩm</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={5}
                placeholder="Mô tả hiển thị ở mục &quot;Why You'll Love It&quot; trên trang sản phẩm"
                className="mb-6"
                disabled={saving}
              />

              <div className="flex items-center justify-between mb-2">
                <Label className="mb-0">Điểm nổi bật (bullet list)</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditFeatures((list) => [...list, ""])}
                  disabled={saving}
                >
                  + Thêm dòng
                </Button>
              </div>
              <div className="space-y-2 mb-6">
                {editFeatures.length === 0 && (
                  <p className="text-xs text-black/30 italic">Chưa có điểm nổi bật nào.</p>
                )}
                {editFeatures.map((feature, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex flex-col">
                      <IconButton
                        type="button"
                        tone="default"
                        aria-label="Di chuyển lên"
                        disabled={saving || i === 0}
                        onClick={() => moveFeature(i, -1)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="5 15.5 12 8.5 19 15.5" />
                        </svg>
                      </IconButton>
                      <IconButton
                        type="button"
                        tone="default"
                        aria-label="Di chuyển xuống"
                        disabled={saving || i === editFeatures.length - 1}
                        onClick={() => moveFeature(i, 1)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="5 8.5 12 15.5 19 8.5" />
                        </svg>
                      </IconButton>
                    </div>
                    <Input
                      value={splitFeature(feature).label}
                      onChange={(e) => updateFeatureLabel(i, e.target.value)}
                      placeholder="Tên (VD: Metal) — để trống nếu không cần"
                      className="w-1/3 text-xs"
                      disabled={saving}
                    />
                    <Input
                      value={splitFeature(feature).value}
                      onChange={(e) => updateFeatureValue(i, e.target.value)}
                      placeholder="VD: 100% Waterproof & Tarnish-Free Guarantee"
                      className="flex-1 text-xs"
                      disabled={saving}
                    />
                    <IconButton
                      type="button"
                      tone="danger"
                      className="shrink-0"
                      aria-label="Xóa dòng"
                      disabled={saving}
                      onClick={() => removeFeature(i)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </IconButton>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-2">
                <Label className="mb-0">Ảnh sản phẩm</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditImages((list) => [...list, ""])}
                  disabled={saving}
                >
                  + Thêm ảnh
                </Button>
              </div>
              <p className="text-xs text-black/40 mb-3">
                Ảnh đầu tiên là ảnh bìa trên trang danh mục; ảnh thứ hai hiện khi
                di chuột qua. Dùng mũi tên để đổi thứ tự.
              </p>
              <div className="space-y-3 mb-2">
                {editImages.length === 0 && (
                  <p className="text-xs text-black/30 italic">Chưa có ảnh nào.</p>
                )}
                {editImages.map((image, i) => (
                  <div key={i} className="flex gap-2 border border-black/10 p-3">
                    <div className="flex flex-col shrink-0">
                      <span className="mb-1 text-[10px] font-semibold text-black/40">
                        #{i + 1}
                      </span>
                      <IconButton
                        type="button"
                        tone="default"
                        aria-label="Di chuyển lên"
                        disabled={saving || i === 0}
                        onClick={() => moveImage(i, -1)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="5 15.5 12 8.5 19 15.5" />
                        </svg>
                      </IconButton>
                      <IconButton
                        type="button"
                        tone="default"
                        aria-label="Di chuyển xuống"
                        disabled={saving || i === editImages.length - 1}
                        onClick={() => moveImage(i, 1)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="5 8.5 12 15.5 19 8.5" />
                        </svg>
                      </IconButton>
                    </div>
                    <div className="min-w-0 flex-1">
                      <ImageField
                        value={image || null}
                        onChange={(url) => updateImage(i, url)}
                        disabled={saving}
                      />
                    </div>
                    <IconButton
                      type="button"
                      tone="danger"
                      className="shrink-0"
                      aria-label="Xóa ảnh"
                      disabled={saving}
                      onClick={() => removeImage(i)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </IconButton>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-2">
                <Label className="mb-0">Thuộc tính sản phẩm</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEditAttributes((list) => [...list, { name: "", value: "" }])
                  }
                >
                  + Thêm thuộc tính
                </Button>
              </div>
              <p className="text-xs text-black/40 mb-3">
                Cặp tên/giá trị tự do, ví dụ: Chất liệu, Kích thước, Trọng lượng,
                Kiểu khóa...
              </p>
              <div className="space-y-2 mb-2">
                {editAttributes.length === 0 && (
                  <p className="text-xs text-black/30 italic">
                    Chưa có thuộc tính nào.
                  </p>
                )}
                {editAttributes.map((attr, i) => (
                  <div key={attr.id ?? `new-${i}`} className="flex gap-2">
                    <Input
                      value={attr.name}
                      onChange={(e) => updateAttribute(i, "name", e.target.value)}
                      placeholder="Tên (VD: Chất liệu)"
                      className="w-1/3 text-xs"
                    />
                    <Input
                      value={attr.value}
                      onChange={(e) => updateAttribute(i, "value", e.target.value)}
                      placeholder="Giá trị (VD: 18k Gold Vermeil)"
                      className="flex-1 text-xs"
                    />
                    <IconButton
                      type="button"
                      tone="danger"
                      className="shrink-0"
                      aria-label="Xóa thuộc tính"
                      onClick={() => removeAttribute(i)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </IconButton>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between mb-2">
                <Label className="mb-0">Biến thể (màu/size)</Label>
                <Button size="sm" variant="ghost" onClick={addVariant} disabled={saving}>
                  + Thêm biến thể
                </Button>
              </div>
              <p className="text-xs text-black/40 mb-3">
                Mỗi biến thể có giá/tồn kho/ảnh riêng. Để trống nếu sản phẩm
                không có nhiều màu/size — sản phẩm vẫn dùng giá/tồn kho ở
                trên như bình thường.
              </p>
              <div className="space-y-3 mb-2">
                {editVariants.length === 0 && (
                  <p className="text-xs text-black/30 italic">
                    Chưa có biến thể nào.
                  </p>
                )}
                {editVariants.map((v, i) => (
                  <div key={v.id ?? `new-${i}`} className="rounded-lg border border-black/10 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        value={v.color_swatch}
                        onChange={(e) => updateVariant(i, { color_swatch: e.target.value })}
                        disabled={saving}
                        className="h-8 w-8 shrink-0 rounded border border-black/10 cursor-pointer"
                        aria-label="Màu swatch"
                      />
                      <Input
                        value={v.color_name}
                        onChange={(e) => updateVariant(i, { color_name: e.target.value })}
                        placeholder="Tên màu (VD: Gold)"
                        className="flex-1 text-xs"
                        disabled={saving}
                      />
                      <Input
                        value={v.size}
                        onChange={(e) => updateVariant(i, { size: e.target.value })}
                        placeholder="Size (VD: One Size)"
                        className="flex-1 text-xs"
                        disabled={saving}
                      />
                      <IconButton
                        type="button"
                        tone="danger"
                        className="shrink-0"
                        aria-label="Xóa biến thể"
                        disabled={saving}
                        onClick={() => removeVariant(i)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                        </svg>
                      </IconButton>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2 sm:grid-cols-4">
                      <Input
                        value={v.price}
                        onChange={(e) => updateVariant(i, { price: e.target.value })}
                        type="number"
                        placeholder="Giá"
                        className="text-xs"
                        disabled={saving}
                      />
                      <Input
                        value={v.compare_at_price}
                        onChange={(e) => updateVariant(i, { compare_at_price: e.target.value })}
                        type="number"
                        placeholder="Giá gốc (gạch)"
                        className="text-xs"
                        disabled={saving}
                      />
                      <Input
                        value={v.stock}
                        onChange={(e) => updateVariant(i, { stock: e.target.value })}
                        type="number"
                        min={0}
                        placeholder="Tồn kho"
                        className="text-xs"
                        disabled={saving}
                      />
                      <Input
                        value={v.sku}
                        onChange={(e) => updateVariant(i, { sku: e.target.value })}
                        placeholder="SKU"
                        className="text-xs"
                        disabled={saving}
                      />
                    </div>

                    <div className="mb-2">
                      <ImageField
                        label="Ảnh biến thể (để trống dùng ảnh mặc định)"
                        value={v.front_image}
                        onChange={(url) => updateVariant(i, { front_image: url })}
                        disabled={saving}
                      />
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="variant-default"
                          checked={v.is_default}
                          onChange={() => updateVariant(i, { is_default: true })}
                          disabled={saving}
                          className="accent-ink"
                        />
                        Mặc định
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={v.active}
                          onChange={(e) => updateVariant(i, { active: e.target.checked })}
                          disabled={saving}
                          className="h-3.5 w-3.5 accent-ink"
                        />
                        Đang bán
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <Label className="mt-6">Mua cùng nhau (Frequently bought together)</Label>
              <p className="text-xs text-black/40 mb-3">
                Chọn 1-2 sản phẩm gợi ý mua kèm ở trang chi tiết sản phẩm này.
              </p>
              <Input
                value={bundleSearch}
                onChange={(e) => setBundleSearch(e.target.value)}
                placeholder="Tìm sản phẩm theo tên..."
                className="mb-2 text-xs"
                disabled={saving}
              />
              <div className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-black/10 p-2">
                {bundleCandidates.length === 0 && (
                  <p className="text-xs text-black/30 italic px-1 py-1">
                    {bundleSearch.trim()
                      ? `Không tìm thấy sản phẩm nào khớp "${bundleSearch}".`
                      : "Chưa có sản phẩm nào khác."}
                  </p>
                )}
                {bundleCandidates.map((p) => {
                    const active = editBundleCompanions.includes(p.slug);
                    return (
                      <label
                        key={p.slug}
                        className="flex items-center gap-2.5 rounded px-1 py-1.5 text-sm hover:bg-black/[0.03]"
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          disabled={saving}
                          onChange={() =>
                            setEditBundleCompanions((list) =>
                              active
                                ? list.filter((s) => s !== p.slug)
                                : [...list, p.slug]
                            )
                          }
                          className="h-4 w-4 accent-ink"
                        />
                        <span className="truncate">{p.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-black/40">
                          ${Number(p.price).toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
              </div>

              <Label>Giảm giá khi mua cùng nhau (%)</Label>
              <Input
                value={editBundleDiscount}
                onChange={(e) => setEditBundleDiscount(e.target.value)}
                type="number"
                min={0}
                max={100}
                disabled={saving}
                className="mb-1"
              />
              <p className="text-xs text-black/40 mb-2">
                Áp dụng lên tổng tiền khi khách chọn đủ tất cả sản phẩm mua kèm ở
                trên. Để 0 nếu không giảm giá.
              </p>
            </div>

            <ModalFooter>
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
                Hủy
              </Button>
              <Button variant="primary" onClick={saveEdit} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </ModalFooter>
          </ModalPanel>
        </ModalBackdrop>
      )}
    </AdminShell>
  );
}
