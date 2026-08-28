"use client";

import { useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

const UPLOAD_ENDPOINT = "/api/content/admin/posts/upload";

type UploadResult = {
  url: string;
  filename?: string;
  mimetype?: string;
  kind?: "image" | "video";
};

export type ImageFieldProps = {
  /** Current image path or URL ("" / null when empty). */
  value: string | null;
  /** Called with the new path/URL, or null when the image is removed. */
  onChange: (url: string | null) => void;
  /** Small uppercase label above the field. */
  label?: string;
  /** Helper text under the label. */
  hint?: string;
  /** Disables every control (e.g. while the parent form is saving). */
  disabled?: boolean;
};

export default function ImageField({
  value,
  onChange,
  label,
  hint,
  disabled = false,
}: ImageFieldProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const busy = disabled || uploading;

  const upload = (file: File) => {
    setError(null);
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    apiFetch<UploadResult>(UPLOAD_ENDPOINT, { method: "POST", body })
      .then((res) => {
        if (res?.url) onChange(res.url);
        else setError("Máy chủ không trả về đường dẫn ảnh");
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Không thể tải ảnh lên"
        );
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) upload(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <div>
      {label && (
        <label className="block text-xs uppercase tracking-wide text-black/50 mb-1">
          {label}
        </label>
      )}
      {hint && <p className="text-xs text-black/40 mb-2">{hint}</p>}

      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode("upload")}
          disabled={busy}
          className={`text-xs px-3 py-1.5 border transition-colors ${
            mode === "upload"
              ? "border-[#2b261f] bg-[#2b261f] text-white"
              : "border-black/10 text-black/50 hover:border-black/30"
          }`}
        >
          Tải ảnh lên
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          disabled={busy}
          className={`text-xs px-3 py-1.5 border transition-colors ${
            mode === "url"
              ? "border-[#2b261f] bg-[#2b261f] text-white"
              : "border-black/10 text-black/50 hover:border-black/30"
          }`}
        >
          Dán đường dẫn
        </button>
      </div>

      {mode === "upload" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => {
            if (!busy) inputRef.current?.click();
          }}
          className={`flex flex-col items-center justify-center gap-1 border border-dashed px-4 py-6 text-center transition-colors ${
            busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          } ${
            dragging
              ? "border-gold bg-gold/5"
              : "border-black/20 hover:border-black/40"
          }`}
        >
          <span className="text-sm text-black/60">
            {uploading ? "Đang tải ảnh lên..." : "Kéo thả ảnh vào đây"}
          </span>
          {!uploading && (
            <span className="text-xs text-black/40">
              hoặc bấm để chọn ảnh (tối đa 2MB)
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={onPick}
          />
        </div>
      ) : (
        <input
          type="text"
          value={value ?? ""}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.value.trim();
            // Only same-origin paths. next/image optimization is enabled
            // (next.config.ts), so an absolute external URL would throw at
            // render time on the storefront unless its host is listed in
            // remotePatterns — reject it here instead of shipping a page
            // that 500s. Uploading a file gives a "/uploads/..." path.
            if (/^[a-z][a-z0-9+.-]*:/i.test(next) || next.startsWith("//")) {
              setError(
                "Chỉ nhận đường dẫn trên cùng máy chủ, bắt đầu bằng dấu / (ví dụ /uploads/anh.webp). Ảnh từ website khác vui lòng tải lên bằng tab Tải ảnh lên."
              );
              return;
            }
            setError(null);
            onChange(next === "" ? null : next);
          }}
          placeholder="/images/posts/vi-du.png"
          className="w-full border border-black/10 px-3 py-2 text-sm focus:border-[#2b261f] focus:outline-none"
        />
      )}

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      {value && (
        <div className="mt-3 flex items-start gap-3 border border-black/10 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview: the value can be an
              arbitrary pasted external URL, which next/image would reject without a remotePatterns entry. */}
          <img
            src={value}
            alt="Xem trước ảnh"
            className="h-20 w-20 shrink-0 object-cover bg-black/5"
          />
          <div className="min-w-0 flex-1">
            <p className="break-all text-xs text-black/50">{value}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                onChange(null);
              }}
              disabled={busy}
              className="mt-2 text-xs underline text-red-700 disabled:text-black/20 disabled:no-underline"
            >
              Xóa ảnh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
