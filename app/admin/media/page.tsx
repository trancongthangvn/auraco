"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { apiFetch, ApiError } from "@/lib/api";

type MediaImage = {
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Every image ever uploaded through any admin form (products, homepage,
 * collections, press logos...) lands in one shared server/uploads directory
 * — this page is just a browser over that directory, so an admin can grab a
 * URL to reuse instead of uploading the same picture twice, or clean up ones
 * nothing needs anymore. Deleting here does NOT check whether a product/
 * page still references the file — deleting a still-referenced image will
 * break wherever it's used, same risk as editing the URL by hand.
 */
export default function AdminMediaPage() {
  const { session } = useAdminAuth();
  const isAdmin = session?.role === "admin";
  const [images, setImages] = useState<MediaImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiFetch<MediaImage[]>("/api/media/admin/images")
      .then((data) => setImages(data))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Không thể tải thư viện ảnh");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("image", file);
        const created = await apiFetch<MediaImage>("/api/media/admin/images", {
          method: "POST",
          body,
        });
        setImages((list) => [created, ...list]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tải ảnh lên");
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (img: MediaImage) => {
    navigator.clipboard
      .writeText(img.url)
      .then(() => {
        setCopiedFilename(img.filename);
        setTimeout(() => setCopiedFilename(null), 1500);
      })
      .catch(() => {
        setError("Không thể sao chép — trình duyệt chặn clipboard.");
      });
  };

  const removeImage = async (img: MediaImage) => {
    if (!isAdmin) return;
    if (!confirm(`Xóa ảnh "${img.filename}"? Nếu ảnh này đang được dùng ở đâu đó, chỗ đó sẽ bị vỡ ảnh.`)) return;
    try {
      await apiFetch(`/api/media/admin/images/${encodeURIComponent(img.filename)}`, {
        method: "DELETE",
      });
      setImages((list) => list.filter((i) => i.filename !== img.filename));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể xóa ảnh");
    }
  };

  return (
    <AdminShell>
      <PageHeader>
        <span className="text-xs text-black/50">
          {loading ? "Đang tải..." : `${images.length} ảnh`}
        </span>
      </PageHeader>

      {error && (
        <div className="mb-4 text-xs text-red-700 border border-red-700/30 bg-red-50 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (uploading) return;
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          if (!uploading) inputRef.current?.click();
        }}
        className={`mb-6 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
          uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${dragging ? "border-gold bg-gold/5" : "border-black/20 hover:border-black/40"}`}
      >
        <span className="text-sm text-black/60">
          {uploading ? "Đang tải ảnh lên..." : "Kéo thả ảnh vào đây"}
        </span>
        {!uploading && (
          <span className="text-xs text-black/40">
            hoặc bấm để chọn nhiều ảnh cùng lúc (mỗi ảnh tối đa 2MB)
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {loading ? (
        <p className="text-sm text-black/50">Đang tải...</p>
      ) : images.length === 0 ? (
        <p className="text-sm text-black/30 italic">Chưa có ảnh nào trong thư viện.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {images.map((img) => (
            <div
              key={img.filename}
              className="group relative overflow-hidden rounded-lg border border-black/10 bg-[#f5f2ee]"
            >
              <div className="relative aspect-square">
                <Image src={img.url} alt={img.filename} fill sizes="200px" className="object-cover" />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => copyUrl(img)}
                  className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink hover:bg-white/90"
                >
                  {copiedFilename === img.filename ? "Đã sao chép" : "Sao chép URL"}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => removeImage(img)}
                    className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-red-700 hover:bg-white/90"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <p className="truncate px-1.5 py-1 text-[10px] text-black/40">
                {formatSize(img.size)}
              </p>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
