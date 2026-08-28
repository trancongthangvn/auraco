"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Quote as QuoteIcon,
  Minus as MinusIcon,
  Link2 as Link2Icon,
  Eraser as EraserIcon,
  Image as ImageIcon,
  Film as FilmIcon,
  SquarePlay as YoutubeIcon,
  Undo2 as Undo2Icon,
  Redo2 as Redo2Icon,
  Eye as EyeIcon,
  Pencil as PencilIcon,
  type LucideIcon,
} from "lucide-react";
import Video, { Youtube } from "./VideoExtension";
import { apiFetch, ApiError } from "@/lib/api";

const UPLOAD_PATH = "/api/content/admin/posts/upload";

// Mirrors the server's upload whitelist (server/lib/upload.js) so an oversized
// or wrong-format file is rejected before it is pushed over the wire.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4"];
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

/**
 * Typography shared by the editing surface and the preview so the preview is
 * an honest picture of the stored HTML.
 */
const TYPOGRAPHY =
  "prose prose-sm max-w-none text-[#2b261f] prose-headings:font-serif-display prose-a:text-gold " +
  "[&_img]:my-3 [&_img]:max-w-full [&_video]:my-3 [&_video]:w-full [&_hr]:my-6 [&_hr]:border-black/20";

function uploadErrorMessage(err: unknown, kind: "image" | "video"): string {
  const raw = err instanceof ApiError || err instanceof Error ? err.message : "";
  if (/too large/i.test(raw)) {
    return kind === "image"
      ? "Ảnh vượt quá dung lượng cho phép (tối đa 2MB)."
      : "Video vượt quá dung lượng cho phép (tối đa 50MB).";
  }
  if (/unsupported file type/i.test(raw)) {
    return kind === "image"
      ? "Định dạng ảnh không được hỗ trợ (chỉ JPG, PNG, WEBP, GIF)."
      : "Định dạng video không được hỗ trợ (chỉ MP4).";
  }
  if (/does not match/i.test(raw)) {
    return "Nội dung tệp không khớp với định dạng khai báo.";
  }
  return raw || "Tải tệp lên thất bại. Vui lòng thử lại.";
}

/** Accepts watch?v=, youtu.be/, /embed/, /shorts/ and /v/ forms, with any extra query params. */
export function extractYoutubeId(url: string): string | null {
  const match = url
    .trim()
    .match(
      /(?:youtube\.com\/(?:.*[?&]v=|embed\/|shorts\/|v\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
  if (match) return match[1];
  // A bare id pasted on its own.
  return /^[A-Za-z0-9_-]{11}$/.test(url.trim()) ? url.trim() : null;
}

function isEmptyHtml(html: string): boolean {
  return html.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "").trim() === "";
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  icon: Icon,
  text,
  busy,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  icon: LucideIcon;
  text?: string;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 items-center gap-1.5 px-2 text-xs border ${
        active
          ? "bg-[#2b261f] text-white border-[#2b261f]"
          : "bg-white text-[#2b261f] border-black/20 hover:bg-black/5"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      <Icon size={14} className={busy ? "animate-pulse" : undefined} />
      {text && <span>{text}</span>}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
}: {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Link is configured explicitly below, so keep StarterKit from
      // registering a second copy of it.
      StarterKit.configure({ link: false }),
      Image.configure({ HTMLAttributes: { class: "rounded-none max-w-full" } }),
      Link.configure({ openOnClick: false }),
      Video,
      Youtube,
      Placeholder.configure({
        placeholder: placeholder ?? "Viết nội dung bài viết…",
      }),
    ],
    content: content ?? "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `${TYPOGRAPHY} min-h-[360px] px-4 py-3 focus:outline-none`,
      },
    },
  });

  /**
   * useEditor only reads `content` once, so opening a different post in the
   * same modal (or switching edit -> create) would otherwise keep the previous
   * body. Re-seed whenever the prop diverges from what the editor holds.
   * Skipped while the editor has focus so it can never fight live typing —
   * during typing the two are in sync anyway via onUpdate.
   */
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isFocused) return;
    const incoming = content ?? "";
    const current = editor.getHTML();
    if (incoming === current) return;
    if (isEmptyHtml(incoming) && isEmptyHtml(current)) return;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [content, editor]);

  if (!editor) return null;

  const uploadFile = async (file: File, kind: "image" | "video") => {
    setUploadError(null);
    const types = kind === "image" ? IMAGE_TYPES : VIDEO_TYPES;
    const maxBytes = kind === "image" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
    if (!types.includes(file.type)) {
      setUploadError(
        kind === "image"
          ? "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF."
          : "Chỉ hỗ trợ video MP4."
      );
      return;
    }
    if (file.size > maxBytes) {
      setUploadError(
        kind === "image"
          ? `Ảnh tối đa 2MB (tệp của bạn ${(file.size / 1024 / 1024).toFixed(1)}MB).`
          : `Video tối đa 50MB (tệp của bạn ${(file.size / 1024 / 1024).toFixed(1)}MB).`
      );
      return;
    }

    setUploading(kind);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await apiFetch<{ url: string; kind: "image" | "video" }>(
        UPLOAD_PATH,
        { method: "POST", body: form }
      );
      if (kind === "image") {
        editor.chain().focus().setImage({ src: res.url }).run();
      } else {
        editor.chain().focus().setVideo(res.url).run();
      }
    } catch (err) {
      setUploadError(uploadErrorMessage(err, kind));
    } finally {
      setUploading(null);
    }
  };

  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file, "image");
  };

  const addVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file, "video");
  };

  const setLink = () => {
    const url = window.prompt("Nhập đường dẫn liên kết:");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  const addYoutube = () => {
    const url = window.prompt("Dán đường dẫn video YouTube:");
    if (!url) return;
    const id = extractYoutubeId(url);
    if (!id) {
      setUploadError("Không nhận ra đường dẫn YouTube. Hãy dán link dạng https://www.youtube.com/watch?v=…");
      return;
    }
    setUploadError(null);
    editor.chain().focus().setYoutubeVideo(`https://www.youtube.com/embed/${id}`).run();
  };

  const togglePreview = () => {
    setPreviewHtml(editor.getHTML());
    setPreview((p) => !p);
  };

  const busy = uploading !== null;

  return (
    <div className="border border-black/20">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-black/10 bg-[#f7f4f0] px-2 py-2">
        <ToolbarButton
          label="Đậm"
          icon={BoldIcon}
          disabled={preview}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Nghiêng"
          icon={ItalicIcon}
          disabled={preview}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Tiêu đề cấp 2"
          icon={Heading2Icon}
          disabled={preview}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <ToolbarButton
          label="Tiêu đề cấp 3"
          icon={Heading3Icon}
          disabled={preview}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />
        <ToolbarButton
          label="Danh sách gạch đầu dòng"
          icon={ListIcon}
          disabled={preview}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Danh sách đánh số"
          icon={ListOrderedIcon}
          disabled={preview}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Trích dẫn"
          icon={QuoteIcon}
          disabled={preview}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          label="Đường kẻ ngang"
          icon={MinusIcon}
          disabled={preview}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
        <ToolbarButton
          label="Liên kết"
          icon={Link2Icon}
          disabled={preview}
          active={editor.isActive("link")}
          onClick={setLink}
        />
        <ToolbarButton
          label="Xóa định dạng"
          icon={EraserIcon}
          disabled={preview}
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        />

        <span className="w-px h-6 bg-black/10 mx-1" />

        <ToolbarButton
          label={uploading === "image" ? "Đang tải ảnh…" : "Chèn ảnh"}
          icon={ImageIcon}
          busy={uploading === "image"}
          disabled={preview || busy}
          onClick={() => imageInputRef.current?.click()}
        />
        <ToolbarButton
          label={uploading === "video" ? "Đang tải video…" : "Chèn video"}
          icon={FilmIcon}
          busy={uploading === "video"}
          disabled={preview || busy}
          onClick={() => videoInputRef.current?.click()}
        />
        <ToolbarButton
          label="Nhúng YouTube"
          icon={YoutubeIcon}
          disabled={preview}
          onClick={addYoutube}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={addImage}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4"
          className="hidden"
          onChange={addVideo}
        />

        <span className="w-px h-6 bg-black/10 mx-1" />

        <ToolbarButton
          label="Hoàn tác"
          icon={Undo2Icon}
          disabled={preview || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          label="Làm lại"
          icon={Redo2Icon}
          disabled={preview || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />

        <span className="w-px h-6 bg-black/10 mx-1" />

        <ToolbarButton
          label={preview ? "Soạn thảo" : "Xem trước"}
          icon={preview ? PencilIcon : EyeIcon}
          active={preview}
          onClick={togglePreview}
          text={preview ? "Soạn thảo" : "Xem trước"}
        />
      </div>

      {uploadError && (
        <p className="border-b border-black/10 bg-red-50 px-4 py-2 text-xs text-red-700">
          {uploadError}
        </p>
      )}
      {busy && !uploadError && (
        <p className="border-b border-black/10 bg-[#f7f4f0] px-4 py-2 text-xs text-black/50">
          Đang tải tệp lên máy chủ…
        </p>
      )}

      {/* The editor stays mounted while previewing so history/selection survive. */}
      <div className={preview ? "hidden" : ""}>
        <EditorContent editor={editor} />
      </div>
      {preview && (
        <div className={`${TYPOGRAPHY} min-h-[360px] px-4 py-3`}>
          {isEmptyHtml(previewHtml) ? (
            <p className="text-sm text-black/40">Chưa có nội dung để xem trước.</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          )}
        </div>
      )}
    </div>
  );
}
