"use client";

import { useMemo, useState } from "react";
import { FileText, Search, CalendarDays, Landmark, Download } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/public/empty-state";
import { formatDate } from "@/lib/utils";

export default function VanBanPublicPage() {
  const { documents, documentCategories, orgName } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const list = useMemo(
    () =>
      documents
        .filter((d) => d.status === "ISSUED")
        .filter((d) => (cat === "all" ? true : d.documentCategoryId === Number(cat)))
        .filter((d) => (q.trim() === "" ? true : `${d.title} ${d.docNumber}`.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => b.issuedDate.localeCompare(a.issuedDate)),
    [documents, cat, q]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-serif-display text-2xl font-bold text-stone-900">Văn bản chỉ đạo</h1>
      <p className="mt-1 text-sm text-stone-500">Các văn bản đã ban hành, công khai cho toàn hệ thống.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên hoặc số hiệu văn bản…" className="pl-9" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="sm:w-56">
          <option value="all">Tất cả loại văn bản</option>
          {documentCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      <div className="mt-6 space-y-3">
        {list.map((d) => (
          <article key={d.id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {d.docNumber ? <span className="text-xs font-semibold text-doan-700">{d.docNumber}</span> : null}
                  <Badge tone="blue">{documentCategories.find((c) => c.id === d.documentCategoryId)?.name ?? "Khác"}</Badge>
                </div>
                <h2 className="mt-1 font-serif-display text-base font-bold leading-snug text-stone-900">{d.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{d.summary}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-400">
                  <span className="inline-flex items-center gap-1"><Landmark className="h-3 w-3" /> {orgName(d.issuingOrgUnitId)}</span>
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Ban hành {formatDate(d.issuedDate)}</span>
                  {d.effectiveDate ? <span>Hiệu lực {formatDate(d.effectiveDate)}</span> : null}
                  <button className="ml-auto inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 font-medium text-stone-600 hover:bg-stone-50">
                    <Download className="h-3 w-3" /> Tải văn bản (PDF)
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {list.length === 0 ? <div className="mt-6"><EmptyState message="Không có văn bản phù hợp." icon={FileText} /></div> : null}
    </div>
  );
}
