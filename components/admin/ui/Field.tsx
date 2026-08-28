"use client";

import { forwardRef } from "react";

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

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = "", ...props }, ref) {
  return (
    <select ref={ref} className={`${FIELD_BASE} cursor-pointer ${className}`} {...props} />
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
