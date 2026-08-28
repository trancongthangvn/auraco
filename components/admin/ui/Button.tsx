"use client";

import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-[#2b261f] text-white border border-[#2b261f] hover:bg-black hover:border-black shadow-sm hover:shadow",
  secondary:
    "bg-white text-[#2b261f] border border-black/15 hover:border-black/30 hover:bg-black/[0.03]",
  danger:
    "bg-white text-red-700 border border-red-200 hover:bg-red-50 hover:border-red-300",
  ghost:
    "bg-transparent text-black/60 border border-transparent hover:text-black hover:bg-black/5",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * Shared admin action button. Rounded, with a hover lift and a click-down
 * scale so every button in the admin gets the same tactile feedback instead
 * of each page hand-rolling its own border/hover classes.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className = "", disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-medium
        transition-all duration-150 ease-out
        active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1
        ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
});

export default Button;
