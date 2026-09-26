"use client";

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 " +
  "focus:border-doan-500 focus:outline-none focus:ring-2 focus:ring-doan-100 disabled:bg-stone-50";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(baseField, "h-9.5", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(baseField, "min-h-24 py-2", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(baseField, "h-9.5 pr-8", className)}
    {...props}
  />
));
Select.displayName = "Select";

export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-xs font-medium text-stone-700">
        {label}
        {required ? <span className="text-doan-600"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-stone-400">{hint}</p> : null}
    </div>
  );
}
