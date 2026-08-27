"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Video from "./VideoExtension";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`h-8 min-w-8 px-2 text-xs border ${
        active
          ? "bg-[#2b261f] text-white border-[#2b261f]"
          : "bg-white text-[#2b261f] border-black/20 hover:bg-black/5"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
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

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { class: "rounded-none max-w-full" } }),
      Link.configure({ openOnClick: false }),
      Video,
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
        class:
          "prose prose-sm max-w-none min-h-[220px] px-4 py-3 focus:outline-none [&_img]:my-3 [&_video]:my-3",
      },
    },
  });

  if (!editor) return null;

  const addImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await fileToDataUrl(file);
    editor.chain().focus().setImage({ src: url }).run();
  };

  const addVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    editor.commands.setVideo(url);
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

  return (
    <div className="border border-black/20">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-black/10 bg-[#f7f4f0] px-2 py-2">
        <ToolbarButton
          label="Đậm"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          label="Nghiêng"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          label="Tiêu đề"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Danh sách gạch đầu dòng"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          label="Danh sách đánh số"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          label="Trích dẫn"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          &ldquo; &rdquo;
        </ToolbarButton>
        <ToolbarButton
          label="Liên kết"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          Link
        </ToolbarButton>

        <span className="w-px h-6 bg-black/10 mx-1" />

        <ToolbarButton label="Chèn ảnh" onClick={() => imageInputRef.current?.click()}>
          🖼 Ảnh
        </ToolbarButton>
        <ToolbarButton label="Chèn video" onClick={() => videoInputRef.current?.click()}>
          ▶ Video
        </ToolbarButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={addImage}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={addVideo}
        />

        <span className="w-px h-6 bg-black/10 mx-1" />

        <ToolbarButton
          label="Hoàn tác"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          ↺
        </ToolbarButton>
        <ToolbarButton
          label="Làm lại"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          ↻
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
