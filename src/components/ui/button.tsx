"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-doan-600 text-white hover:bg-doan-700 shadow-sm disabled:bg-doan-300",
  secondary:
    "bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200",
  outline:
    "border border-doan-600 text-doan-700 hover:bg-doan-50 bg-white",
  ghost: "text-stone-700 hover:bg-stone-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  gold: "bg-vang-300 text-stone-900 hover:bg-vang-400 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9.5 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2",
  icon: "h-9 w-9 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-doan-600",
        "disabled:opacity-60 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
