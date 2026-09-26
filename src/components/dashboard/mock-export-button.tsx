"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast-context";

/**
 * Nút xuất file giả lập — hiển thị spinner ngắn rồi toast "đã xuất file".
 * Prototype không tạo tệp thật.
 */
export function MockExportButton({
  fileName,
  format = "DOCX",
  label,
  size = "sm",
  variant = "secondary",
}: {
  fileName: string;
  format?: "DOCX" | "PDF" | "XLSX";
  label?: string;
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "outline";
}) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const run = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      toast(`Đã xuất tệp "${fileName}.${format.toLowerCase()}" (giả lập demo).`);
    }, 900);
  };

  return (
    <Button onClick={run} size={size} variant={variant} disabled={busy}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
      {label ?? `Xuất ${format}`}
    </Button>
  );
}
