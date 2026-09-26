import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("thin-scrollbar overflow-x-auto", className)}>
      <table className="w-full min-w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-stone-200 bg-stone-50 text-left">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-500",
        className
      )}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-stone-100 transition-colors hover:bg-stone-50/70", className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-stone-700", className)} {...props} />;
}

export function EmptyRow({ colSpan, message = "Chưa có dữ liệu" }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-stone-400">
        {message}
      </td>
    </tr>
  );
}
