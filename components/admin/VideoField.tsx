"use client";

import { useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import Button from "@/components/admin/ui/Button";
import { Input, Label } from "@/components/admin/ui/Field";

const UPLOAD_ENDPOINT = "/api/products/admin/products/upload-video";

type UploadResult = {
  url: string;
  filename?: string;
};

export type VideoFieldProps = {
  /** Current video path or URL ("" / null when empty). */
  value: string | null;
  /** Called with the new path/URL, or null when the video is removed. */
  onChange: (url: string | null) => void;
  /** Small uppercase label above the field. */
  label?: string;
  /** Helper text under the label. */
  hint?: string;
  /** Disables every control (e.g. while the parent form is saving). */
  disabled?: boolean;
};

/**
 * Upload-or-paste-URL widget for a product's looping homepage video — the
 * video sibling of components/admin/ImageField.tsx, built on the shared admin
 * primitives (Button / Input / Label) instead of hand-rolled classes.
 */
export default function VideoField({
  value,
  onChange,
  label,
  hint,
  disabled = false,
}: VideoFieldProps) {
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
    body.append("video", file);
    apiFetch<UploadResult>(UPLOAD_ENDPOINT, { method: "POST", body })
      .then((res) => {
        if (res?.url) onChange(res.url);
        else setError("Máy chủ không trả về đường dẫn video");
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Không thể tải video lên"
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
      {label && <Label>{label}</Label>}
      {hint && <p className="text-xs text-black/40 mb-2">{hint}</p>}

      <div className="flex items-center gap-2 mb-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "upload" ? "primary" : "secondary"}
          onClick={() => setMode("upload")}
          disabled={busy}
        >
          Tải video lên
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "url" ? "primary" : "secondary"}
          onClick={() => setMode("url")}
          disabled={busy}
        >
          Dán đường dẫn
        </Button>
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
          className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
            busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          } ${
            dragging
              ? "border-gold bg-gold/5"
              : "border-black/20 hover:border-black/40"
          }`}
        >
          <span className="text-sm text-black/60">
            {uploading ? "Đang tải video lên..." : "Kéo thả video vào đây"}
          </span>
          {!uploading && (
            <span className="text-xs text-black/40">
              hoặc bấm để chọn video MP4 (tối đa 50MB)
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4"
            className="hidden"
            disabled={busy}
            onChange={onPick}
          />
        </div>
      ) : (
        <Input
          type="text"
          value={value ?? ""}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.value.trim();
            onChange(next === "" ? null : next);
          }}
          placeholder="/uploads/vi-du.mp4"
        />
      )}

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      {value && (
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-black/10 p-2">
          <video
            src={`${value}#t=0.1`}
            muted
            loop
            playsInline
            controls
            preload="metadata"
            className="h-24 w-[72px] shrink-0 rounded-lg bg-black object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="break-all text-xs text-black/50">{value}</p>
            <Button
              type="button"
              size="sm"
              variant="danger"
              className="mt-2"
              onClick={() => {
                setError(null);
                onChange(null);
              }}
              disabled={busy}
            >
              Xóa video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
