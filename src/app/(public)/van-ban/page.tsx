"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  CalendarDays,
  Landmark,
  Download,
  Eye,
  Check,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/public/empty-state";
import { formatDate, cn } from "@/lib/utils";
import type { DocumentRecord } from "@/types";

/* Staggered fade-up — mỗi dòng lệch nhau 50ms */
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/* Khối icon định dạng bo tròn — nền màu nhạt luân phiên theo nhóm văn bản */
const TINTS = [
  "bg-blue-50 text-blue-600",
  "bg-cyan-50 text-cyan-600",
  "bg-violet-50 text-violet-600",
  "bg-amber-50 text-amber-600",
  "bg-emerald-50 text-emerald-600",
];

export default function VanBanPublicPage() {
  const { documents, documentCategories, orgName } = useStore();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [viewDoc, setViewDoc] = useState<DocumentRecord | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [doneId, setDoneId] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Phím tắt ⌘K / Ctrl+K focus vào ô tìm kiếm
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const list = useMemo(
    () =>
      documents
        .filter((d) => d.status === "ISSUED")
        .filter((d) => (cat === "all" ? true : d.documentCategoryId === Number(cat)))
        .filter((d) => (q.trim() === "" ? true : `${d.title} ${d.docNumber}`.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => b.issuedDate.localeCompare(a.issuedDate)),
    [documents, cat, q]
  );

  /** Micro-interaction tải file: spinner → check → toast */
  const handleDownload = (d: DocumentRecord) => {
    if (busyId !== null) return;
    setBusyId(d.id);
    window.setTimeout(() => {
      setBusyId(null);
      setDoneId(d.id);
      toast(`Đã tải "${d.docNumber || d.title}" — tệp giả lập cho bản demo.`);
      window.setTimeout(() => setDoneId(null), 1600);
    }, 900);
  };

  const catName = (d: DocumentRecord) =>
    documentCategories.find((c) => c.id === d.documentCategoryId)?.name ?? "Khác";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* ===== Header ===== */}
      <div>
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          Văn bản chỉ đạo
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          Các văn bản đã ban hành, công khai cho toàn hệ thống theo dõi và thi hành.
        </p>
      </div>

      {/* ===== Search bar giữa trang — kích thước lớn, glow khi focus ===== */}
      <div className="relative mx-auto mt-8 w-full max-w-2xl">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên hoặc số hiệu văn bản…"
          className="w-full rounded-full border border-transparent bg-slate-500/[0.06] py-3 pl-13 pr-16 text-[15px] text-slate-800 outline-none backdrop-blur transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500/70 focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
        />
        <kbd className="pointer-events-none absolute right-4.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
          ⌘K
        </kbd>
      </div>

      {/* ===== Dải tab phân loại — sub nhộng căn giữa ===== */}
      <div className="mt-5 flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(["all", ...documentCategories.map((c) => String(c.id))] as string[]).map((c) => {
          const name = c === "all" ? "Tất cả" : documentCategories.find((x) => String(x.id) === c)?.name ?? c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                cat === c
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* ===== Danh sách SaaS — 1 khối card lớn, dòng ngang hover nền ===== */}
      {list.length > 0 ? (
        <motion.div
          layout
          className="mt-8 overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200"
        >
          <motion.div
            key={`${cat}|${q}`}
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="divide-y divide-slate-100"
          >
            {list.map((d, idx) => (
              <motion.div
                key={d.id}
                variants={itemVariants}
                className="group flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-slate-50 sm:px-6"
              >
                {/* Icon định dạng — khối vuông bo tròn nền nhạt, đẩy nhẹ khi hover */}
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:translate-x-0.5",
                    TINTS[idx % TINTS.length]
                  )}
                >
                  <FileText className="h-5 w-5" strokeWidth={1.5} />
                </span>

                {/* Nội dung chính */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {d.docNumber ? (
                      <span className="font-mono text-[11px] font-semibold tracking-wide text-blue-600">{d.docNumber}</span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {catName(d)}
                    </span>
                  </div>
                  <h2 className="mt-1 truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                    {d.title}
                  </h2>
                  <p className="mt-0.5 hidden line-clamp-1 text-xs font-light text-slate-400 sm:block">{d.summary}</p>
                </div>

                {/* Meta phải */}
                <div className="hidden shrink-0 flex-col items-end gap-0.5 text-[11px] font-light text-slate-400 lg:flex">
                  <span className="inline-flex items-center gap-1">
                    <Landmark className="h-3 w-3" strokeWidth={1.5} /> {orgName(d.issuingOrgUnitId)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" strokeWidth={1.5} /> Ban hành {formatDate(d.issuedDate)}
                  </span>
                </div>

                {/* Hành động — ẩn mờ, hiện rõ khi hover dòng */}
                <div className="flex shrink-0 items-center gap-1.5 opacity-100 transition-all duration-300 sm:translate-x-1 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setViewDoc(d)}
                    title="Xem nhanh"
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-600"
                  >
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(d)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-semibold text-white transition-colors",
                      doneId === d.id ? "bg-emerald-500" : "bg-blue-600 hover:bg-blue-700"
                    )}
                  >
                    {busyId === d.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : doneId === d.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                    <span className="hidden md:inline">
                      {busyId === d.id ? "Đang tải…" : doneId === d.id ? "Đã tải" : "Tải xuống"}
                    </span>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      ) : (
        <div className="mt-8">
          <EmptyState message="Không có văn bản phù hợp." icon={FileText} />
        </div>
      )}

      {/* ===== Quick View modal ===== */}
      <Modal
        open={viewDoc !== null}
        onClose={() => setViewDoc(null)}
        title={
          <span className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-600" /> Xem nhanh văn bản
          </span>
        }
      >
        {viewDoc ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {viewDoc.docNumber ? (
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                  {viewDoc.docNumber}
                </span>
              ) : null}
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-600">
                {catName(viewDoc)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600">
                <ShieldCheck className="h-3 w-3" /> Đang hiệu lực
              </span>
            </div>
            <h3 className="mt-4 text-lg font-bold leading-snug text-slate-900">{viewDoc.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{viewDoc.summary}</p>

            <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đơn vị ban hành</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <Landmark className="h-3.5 w-3.5 text-blue-600" strokeWidth={1.5} />
                  {orgName(viewDoc.issuingOrgUnitId)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ngày ban hành</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-600" strokeWidth={1.5} />
                  {formatDate(viewDoc.issuedDate)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hiệu lực từ</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {viewDoc.effectiveDate ? formatDate(viewDoc.effectiveDate) : "Ngay khi ban hành"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phạm vi nhận</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {viewDoc.recipientScope === "ALL_DESCENDANTS"
                    ? "Toàn hệ thống con"
                    : viewDoc.recipientScope === "DIRECT_CHILDREN"
                      ? "Đơn vị trực thuộc"
                      : "Đơn vị được chọn"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDownload(viewDoc)}
              className={cn(
                "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300",
                doneId === viewDoc.id
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/25 hover:shadow-blue-500/30"
              )}
            >
              {busyId === viewDoc.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang chuẩn bị tệp…
                </>
              ) : doneId === viewDoc.id ? (
                <>
                  <Check className="h-4 w-4" /> Đã tải xuống
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Tải văn bản (PDF)
                </>
              )}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-[11px] text-slate-400">
              <X className="h-3 w-3" /> Nhấn Esc hoặc click ngoài để đóng
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
