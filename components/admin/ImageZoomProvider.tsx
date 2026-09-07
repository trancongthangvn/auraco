"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Click-to-zoom for admin image thumbnails, site-wide — explicit request:
 * every thumbnail across the admin (products, homepage, brands,
 * collections, certificates, posts, media library, order line items, ...)
 * should open an enlarged preview on click, not just the product edit
 * form's own upload field.
 *
 * A single provider mounted once in app/admin/layout.tsx, rather than each
 * page owning its own open/src state, so any admin component can call
 * `useImageZoom().open(src)` without repeating the same modal markup and
 * state in a dozen places. Plain `<img>`, not next/image: admin thumbnails
 * already render with plain `<img>` everywhere (ImageField.tsx and the
 * list/table thumbnails this covers) specifically because admin-uploaded
 * photos can be arbitrary external URLs, which next/image would reject
 * without an explicit remotePatterns entry per host.
 */
const ImageZoomContext = createContext<{
  open: (src: string, alt?: string) => void;
}>({
  open: () => {},
});

export function useImageZoom() {
  return useContext(ImageZoomContext);
}

export function ImageZoomProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ src: string; alt: string } | null>(null);

  const open = useCallback((src: string, alt = "") => {
    if (src) setState({ src, alt });
  }, []);
  const close = useCallback(() => setState(null), []);

  // Escape to close, and lock page scroll while the overlay is open — same
  // pair of behaviors as the storefront's own Lightbox.tsx.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [state, close]);

  return (
    <ImageZoomContext.Provider value={{ open }}>
      {children}
      {state && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={state.alt || "Xem ảnh phóng to"}
          onClick={close}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.src}
            alt={state.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-default rounded object-contain shadow-2xl"
          />
          <button
            type="button"
            aria-label="Đóng"
            onClick={close}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl leading-none text-black transition-colors hover:bg-white"
          >
            &times;
          </button>
        </div>
      )}
    </ImageZoomContext.Provider>
  );
}
