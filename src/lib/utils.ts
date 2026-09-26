import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Định dạng ngày kiểu Việt Nam: 22/09/2026 */
export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Ngày + giờ: 22/09/2026 14:30 */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  );
}

/** Số ngày còn lại tới hạn (âm = quá hạn) */
export function daysUntil(dateStr?: string | null): number {
  if (!dateStr) return 999;
  const target = new Date(dateStr);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** Nhãn deadline: D-7 / D-3 / QUÁ HẠN */
export function deadlineLabel(dueDate?: string | null): {
  label: string;
  tone: "danger" | "warn" | "ok" | "muted";
} {
  const d = daysUntil(dueDate);
  if (d < 0) return { label: `QUÁ HẠN ${Math.abs(d)} ngày`, tone: "danger" };
  if (d === 0) return { label: "HẾT HẠN HÔM NAY", tone: "danger" };
  if (d <= 3) return { label: `D-${d}`, tone: "warn" };
  if (d <= 7) return { label: `D-${d}`, tone: "warn" };
  return { label: `Còn ${d} ngày`, tone: "ok" };
}

/** Chuỗi thành slug thân thiện SEO (không dấu) */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function formatNumber(n?: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("vi-VN");
}

export function formatPercent(n?: number | null): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(1).replace(/\.0$/, "")}%`;
}

/** Sinh mã phản ánh PA-2026-XXXXX */
export function genFeedbackCode(existing: string[]): string {
  let n = 1;
  for (const code of existing) {
    const m = code.match(/PA-\d{4}-(\d+)/);
    if (m) n = Math.max(n, parseInt(m[1], 10) + 1);
  }
  return `PA-2026-${String(n).padStart(5, "0")}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
