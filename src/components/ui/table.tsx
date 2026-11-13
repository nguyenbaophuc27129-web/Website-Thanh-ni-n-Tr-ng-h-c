import { Children, isValidElement, type ReactNode, type TdHTMLAttributes, type ThHTMLAttributes, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  const childArray = Children.toArray(children);
  const isTable = childArray.some(
    (c) => isValidElement(c) && (c.type === "table" || (typeof c.type === "string" && c.type.toLowerCase() === "table"))
  );

  return (
    <div className={cn("thin-scrollbar overflow-x-auto", className)}>
      {isTable ? (
        children
      ) : (
        <table className="w-full min-w-full border-collapse text-sm">
          {children}
        </table>
      )}
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  const childArray = Children.toArray(children);
  const isRow = childArray.some(
    (c) => isValidElement(c) && (c.type === "tr" || c.type === Tr || (typeof c.type === "string" && c.type.toLowerCase() === "tr"))
  );

  return (
    <thead>
      {isRow ? (
        children
      ) : (
        <tr className="border-b border-stone-200 bg-stone-50 text-left">
          {children}
        </tr>
      )}
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
