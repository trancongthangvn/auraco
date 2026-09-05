"use client";

import { forwardRef, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const FIELD_BASE =
  "w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm text-[#2b261f] " +
  "transition-colors duration-150 outline-none placeholder:text-black/30 " +
  "focus:border-gold focus:ring-2 focus:ring-gold/20 " +
  "disabled:bg-black/[0.03] disabled:text-black/40 disabled:cursor-not-allowed";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return <input ref={ref} className={`${FIELD_BASE} ${className}`} {...props} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return <textarea ref={ref} className={`${FIELD_BASE} resize-none ${className}`} {...props} />;
});

/**
 * A real <select>'s dropdown POPUP is drawn by the OS/browser, not this
 * page — on mobile that positioning is occasionally wrong (confirmed live:
 * the options list opened anchored near the top of the screen instead of
 * right under the field). Since the page can't move a native popup,
 * "Danh mục (Brand)" opening in the wrong place is fixed by not using a
 * native <select> at all: this renders its own button + absolute-
 * positioned list, always anchored to this field, everywhere `Select` is
 * used across the admin (products, homepage, posts, reviews, orders).
 *
 * Kept API-compatible with the native element it replaces — `value`,
 * `onChange` (still receives a `{ target: { value } }` shape), and plain
 * `<option>` children — so no caller needed to change.
 */
export const Select = forwardRef<
  HTMLButtonElement,
  {
    value: string;
    onChange: (e: { target: { value: string } }) => void;
    children?: React.ReactNode;
    className?: string;
    disabled?: boolean;
  }
>(function Select({ value, onChange, children, className = "", disabled }, ref) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const options = useMemo(
    () =>
      Array.from(
        (function* () {
          for (const child of Array.isArray(children) ? children : [children]) {
            if (isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child) && child.type === "option") {
              yield {
                value: String(child.props.value ?? ""),
                label: child.props.children,
                disabled: child.props.disabled,
              };
            }
          }
        })()
      ),
    [children]
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${FIELD_BASE} flex cursor-pointer items-center justify-between gap-2 text-left ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? value}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-black/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-black/15 bg-white py-1 text-sm shadow-lg"
        >
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                disabled={opt.disabled}
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  setOpen(false);
                }}
                className={`block w-full truncate px-3.5 py-2 text-left hover:bg-black/5 disabled:cursor-not-allowed disabled:text-black/30 ${
                  opt.value === value ? "bg-black/[0.04] font-medium" : ""
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export function Label({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`block text-xs font-semibold uppercase tracking-wide text-black/50 mb-1.5 ${className}`}
    >
      {children}
    </label>
  );
}
