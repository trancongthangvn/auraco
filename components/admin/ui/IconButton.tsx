"use client";

import { forwardRef } from "react";

type Tone = "default" | "danger" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  default: "text-black/40 hover:text-black hover:bg-black/5",
  danger: "text-black/40 hover:text-red-600 hover:bg-red-50",
  accent: "text-black/40 hover:text-gold hover:bg-gold/10",
};

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
}

/** Small square icon-only action (table row actions, close buttons, etc). */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ tone = "default", className = "", disabled, ...props }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg
          transition-all duration-150 ease-out active:scale-90
          disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50
          ${TONE_CLASSES[tone]} ${className}`}
        {...props}
      />
    );
  }
);

export default IconButton;
