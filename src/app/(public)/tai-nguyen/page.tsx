"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Download,
  FolderOpen,
  Search,
  Check,
  Loader2,
  CalendarDays,
  Upload,
  Play,
  ExternalLink,
  Files,
  UserRound,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import { EmptyState } from "@/components/public/empty-state";
import { Modal } from "@/components/ui/modal";
import { MultiUploadField } from "@/components/ui/multi-upload";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { useMultiUpload } from "@/lib/use-multi-upload";
import {
  FORMAT_FILTERS,
  downloadStoredFile,
  documentToEntry,
  fileExt,
  formatMeta,
  formatSizeKb,
  isImageExt,
  isSafeYoutubeUrl,
  resourceFiles,
  resourceHasFormat,
  resourceToEntry,
  triggerDownload,
  ytEmbedSrc,
  ytThumb,
  ytWatchUrl,
  type ResourceEntry,
} from "@/lib/resource-files";

/* Staggered fade-up — mỗi dòng lệch nhau 50ms */
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function TaiNguyenPage() {
  const { resources, resourceTypes, documents, downloadResource, submitResourceDraft } = useStore();
  const vanBanTypeId = resourceTypes.find((t) => t.code === "VAN_BAN")?.id ?? 4;

  /** Văn bản đã ban hành → dòng tài nguyên trong nhóm "Tài nguyên văn bản" (gộp Văn bản vào Tài nguyên) */
  const docRows = useMemo<ResourceEntry[]>(
    () => documents.filter((d) => d.status === "ISSUED").map((d) => documentToEntry(d, vanBanTypeId)),
    [documents, vanBanTypeId]
  );
  const publicPool = useMemo<ResourceEntry[]>(
    () => [...resources.filter((r) => r.status === "PUBLISHED" && r.isPublic).map(resourceToEntry), ...docRows],
    [resources, docRows]
  );
  const { session } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<string>("all");
  const [fmt, setFmt] = useState<string>("all");
  const [q, setQ] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [playing, setPlaying] = useState<ResourceEntry | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ===== Đóng góp tài nguyên (login-gated) ===== */
  const [contribOpen, setContribOpen] = useState(false);
  const [rTitle, setRTitle] = useState("");
  const [rType, setRType] = useState(String(resourceTypes[0]?.id ?? 1));
  const [rDesc, setRDesc] = useState("");
  // Nhiều tệp (≤10, mỗi tệp ≤25MB), tải song song tối đa 3 — lưu trên máy chủ, chỉ giữ đường dẫn /uploads/...
  const upload = useMultiUpload("tai-nguyen", { onReject: (m) => toast(m, "warning") });

  const openResourceContribute = () => {
    if (!session) {
      toast("Bạn cần đăng nhập để đóng góp tài nguyên.", "warning");
      return;
    }
    setContribOpen(true);
  };

  const [rBusy, setRBusy] = useState(false);

  const submitResourceContribute = async () => {
    if (!session) return;
    if (upload.uploading) {
      toast("Tệp đang được tải lên máy chủ — vui lòng đợi trong giây lát.", "warning");
      return;
    }
    if (rTitle.trim().length < 6 || upload.uploaded.length === 0) {
      toast("Cần tên tài nguyên tối thiểu 6 ký tự và chọn ít nhất một tệp đính kèm.", "warning");
      return;
    }
    if (upload.hasError) {
      toast("Có tệp tải lên bị lỗi — hãy thử lại hoặc xoá tệp đó trước khi gửi.", "warning");
      return;
    }
    if (rBusy) return;
    setRBusy(true);
    const res = await submitResourceDraft({
      resourceTypeId: Number(rType),
      title: rTitle,
      description: rDesc || "Tài nguyên do đoàn viên đóng góp, chờ Ban Biên tập duyệt.",
      attachments: upload.uploaded.map((f) => ({ name: f.name, url: f.url, sizeKb: f.sizeKb, mime: f.mime })),
    });
    setRBusy(false);
    if (!res.ok) {
      toast(res.error, "warning");
      return;
    }
    setContribOpen(false);
    setRTitle(""); setRDesc(""); upload.reset();
    toast("Đã gửi tài nguyên — ở trạng thái nháp, chờ Ban Biên tập duyệt công khai (+10 điểm khi được duyệt).");
  };

  // Phím tắt ⌘K / Ctrl+K
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
      publicPool
        .filter((r) => (type === "all" ? true : r.resourceTypeId === Number(type)))
        .filter((r) => {
          if (fmt === "all") return true;
          const f = FORMAT_FILTERS.find((x) => x.key === fmt);
          return f ? resourceHasFormat(r, f.match) : true;
        })
        .filter((r) => (q.trim() === "" ? true : r.title.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => b.downloadCount - a.downloadCount || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
    [publicPool, type, fmt, q]
  );

  /** Đếm theo định dạng trên nhóm đã lọc theo loại + tìm kiếm (không tính fmt) */
  const fmtCounts = useMemo(() => {
    const pool = publicPool
      .filter((r) => (type === "all" ? true : r.resourceTypeId === Number(type)))
      .filter((r) => (q.trim() === "" ? true : r.title.toLowerCase().includes(q.toLowerCase())));
    return Object.fromEntries(
      FORMAT_FILTERS.map((f) => [f.key, pool.filter((r) => resourceHasFormat(r, f.match)).length])
    );
  }, [publicPool, type, q]);

  /**
   * Tải tệp thật từ máy chủ: 1 tệp → tải thẳng; nhiều tệp → gói .zip do máy chủ tạo.
   * Chưa có tệp thì báo rõ thay vì giả lập. Số lượt tải do máy chủ đếm (chống trùng).
   */
  const handleDownload = (r: ResourceEntry) => {
    if (busyKey !== null) return;
    const files = resourceFiles(r);
    if (files.length === 0) {
      toast(`"${r.title}" chưa có tệp đính kèm — nội dung sẽ được bổ sung sau.`, "warning");
      return;
    }
    setBusyKey(r.key);
    if (files.length > 1 && r.docId === undefined) triggerDownload(`/api/tai-nguyen/${r.id}/zip`);
    else downloadStoredFile(files[0].url, files[0].name);
    if (r.docId === undefined) void downloadResource(r.id);
    setBusyKey(null);
    setDoneKey(r.key);
    toast(files.length > 1 ? `Đang tải gói ${files.length} tệp của "${r.title}".` : `Đã tải "${r.title}".`);
    window.setTimeout(() => setDoneKey(null), 1600);
  };

  /** Mở clip YouTube trong modal — tính là 1 lượt xem */
  const playClip = (r: ResourceEntry) => {
    setPlaying(r);
    if (r.docId === undefined) void downloadResource(r.id);
  };

  const playingEmbed = playing?.videoUrl ? ytEmbedSrc(playing.videoUrl) : null;
  const playingWatch = playing?.videoUrl ? ytWatchUrl(playing.videoUrl) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600" />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Kho tài nguyên
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Thiết kế, văn bản, truyền thông và biểu mẫu nghiệp vụ — dùng chung toàn hệ thống.
          </p>
        </div>
        <button
          type="button"
          onClick={openResourceContribute}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30"
        >
          <Upload className="h-4 w-4" /> Đóng góp tài nguyên
        </button>
      </div>

      {/* ===== Search bar giữa trang — kích thước lớn, glow khi focus ===== */}
      <div className="relative mx-auto mt-8 w-full max-w-2xl">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm tài liệu, biểu mẫu, sản phẩm truyền thông…"
          className="w-full rounded-full border border-transparent bg-slate-500/[0.06] py-3 pl-13 pr-16 text-[15px] text-slate-800 outline-none backdrop-blur transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-500/70 focus:bg-white focus:shadow-[0_0_0_4px_rgba(6,182,212,0.14)]"
        />
        <kbd className="pointer-events-none absolute right-4.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
          ⌘K
        </kbd>
      </div>

      {/* ===== Dải tab phân loại — sub nhộng căn giữa, có số lượng ===== */}
      <div className="mt-5 flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {([
          { value: "all", label: "Tất cả", count: publicPool.length },
          ...resourceTypes.map((t) => ({
            value: String(t.id),
            label: t.short ?? t.name,
            count: publicPool.filter((r) => r.resourceTypeId === t.id).length,
          })),
        ] as { value: string; label: string; count: number }[]).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200",
              type === t.value
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                type === t.value ? "bg-white/20 text-white" : "bg-white text-slate-400"
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ===== Dải lọc định dạng file — chip icon màu riêng kèm số lượng ===== */}
      <div className="mt-3 flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <span className="hidden shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 sm:inline">
          Định dạng
        </span>
        <button
          type="button"
          onClick={() => setFmt("all")}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200",
            fmt === "all"
              ? "border-cyan-500/60 bg-cyan-50 text-cyan-700 shadow-sm shadow-cyan-500/15"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
          )}
        >
          Mọi định dạng
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
            {Object.values(fmtCounts).reduce((s, n) => s + n, 0)}
          </span>
        </button>
        {FORMAT_FILTERS.map((f) => {
          const FIcon = f.icon;
          const activeF = fmt === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFmt(f.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border py-1.5 pl-2.5 pr-3 text-[12px] font-medium transition-all duration-200",
                activeF
                  ? "border-cyan-500/60 bg-cyan-50 text-cyan-700 shadow-sm shadow-cyan-500/15"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              )}
            >
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-md", f.tint)}>
                <FIcon className="h-3 w-3" strokeWidth={1.75} />
              </span>
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  activeF ? "bg-white text-cyan-600" : "bg-slate-100 text-slate-400"
                )}
              >
                {fmtCounts[f.key] ?? 0}
              </span>
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
            key={`${type}|${q}`}
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="divide-y divide-slate-100"
          >
            {list.map((r) => {
              const files = resourceFiles(r);
              const main = files[0];
              const fm = formatMeta(main ? main.url : r.fileName);
              const FmIcon = fm.icon;
              const typeName = resourceTypes.find((t) => t.id === r.resourceTypeId)?.short ?? resourceTypes.find((t) => t.id === r.resourceTypeId)?.name;
              const busy = busyKey === r.key;
              const done = doneKey === r.key;
              const isClip = !!r.videoUrl && isSafeYoutubeUrl(r.videoUrl);
              const clipThumb = isClip ? ytThumb(r.videoUrl!) : null;
              const imgThumb = !isClip ? files.find((f) => isImageExt(fileExt(f)))?.url ?? null : null;
              const totalKb = r.fileSizeKb > 0 ? r.fileSizeKb : files.reduce((s, f) => s + f.sizeKb, 0);
              const sizeText = isClip ? "Xem trực tuyến" : formatSizeKb(totalKb);
              return (
                <motion.div
                  key={r.key}
                  variants={itemVariants}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-slate-50 sm:px-6"
                >
                  {/* Clip YouTube: thumbnail thật với nút play đè — mở trình phát, KHÔNG điều hướng */}
                  {clipThumb && (
                    <button
                      type="button"
                      onClick={() => playClip(r)}
                      className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900 transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-label={`Xem clip: ${r.title}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={clipThumb} alt="" className="h-full w-full object-cover opacity-90" />
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-900/25 transition-colors group-hover:bg-slate-900/10">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/40">
                          <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                        </span>
                      </span>
                    </button>
                  )}

                  {/* Khối nội dung — bấm để mở trang chi tiết */}
                  <Link href={`/tai-nguyen/${r.key}`} className="flex min-w-0 flex-1 items-center gap-4" aria-label={r.title}>
                    {!clipThumb &&
                      (imgThumb ? (
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 transition-transform duration-300 group-hover:translate-x-0.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgThumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:translate-x-0.5",
                            fm.tint
                          )}
                        >
                          <FmIcon className="h-5 w-5" strokeWidth={1.5} />
                        </span>
                      ))}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[11px] font-semibold text-cyan-600">{typeName}</span>
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-[0.1em]",
                            fm.chip
                          )}
                        >
                          .{fm.label}
                        </span>
                        {files.length > 1 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            <Files className="h-3 w-3" strokeWidth={1.75} /> {files.length} tệp
                          </span>
                        )}
                        {sizeText && (
                          <span className="hidden text-[11px] font-light text-slate-400 sm:inline">{sizeText}</span>
                        )}
                      </div>
                      <h2 className="mt-1 truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
                        {r.title}
                      </h2>
                      <p className="mt-0.5 hidden line-clamp-1 text-xs font-light text-slate-400 sm:block">
                        {r.description}
                      </p>
                      {r.contributorName && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400">
                          <UserRound className="h-3 w-3 shrink-0" strokeWidth={1.5} /> Đóng góp bởi {r.contributorName}
                        </p>
                      )}
                    </div>

                    {/* Meta phải — chỉ hiện khi có số liệu/ngày thật (clip nhúng YouTube để trống) */}
                    {(r.downloadCount > 0 || r.publishedAt) && (
                      <div className="hidden shrink-0 flex-col items-end gap-0.5 text-[11px] font-light text-slate-400 lg:flex">
                        {r.downloadCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Download className="h-3 w-3" strokeWidth={1.5} /> {formatNumber(r.downloadCount)} {isClip ? "lượt xem" : "lượt tải"}
                          </span>
                        )}
                        {r.publishedAt && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" strokeWidth={1.5} /> {formatDate(r.publishedAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>

                  {/* Hành động — clip mở trình phát, tài liệu tải xuống; ẩn mờ, hiện rõ khi hover dòng */}
                  <div className="flex shrink-0 items-center opacity-100 transition-all duration-300 sm:translate-x-1 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-x-0 sm:group-focus-within:opacity-100">
                    {isClip ? (
                      <button
                        type="button"
                        onClick={() => playClip(r)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-3.5 py-2 text-[11px] font-semibold text-white transition-colors hover:brightness-110"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span className="hidden md:inline">Xem clip</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDownload(r)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-semibold text-white transition-colors",
                          done ? "bg-emerald-500" : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110"
                        )}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : done ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                        <span className="hidden md:inline">
                          {busy ? "Đang tải…" : done ? "Đã tải" : files.length > 1 ? "Tải (.zip)" : "Tải xuống"}
                        </span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      ) : (
        <div className="mt-8">
          <EmptyState
            message={
              type === String(resourceTypes.find((t) => t.code === "THONG_DIEP")?.id ?? -1)
                ? "Nhóm dành cho các thông điệp tuổi trẻ (slogan, quote, sản phẩm truyền thông) — nội dung sẽ sớm được cập nhật."
                : fmt === "all"
                  ? "Chưa có tài nguyên công khai ở danh mục này."
                  : "Chưa có tài nguyên công khai ở định dạng này."
            }
            icon={FolderOpen}
          />
        </div>
      )}

      {/* ===== Modal phát clip YouTube ===== */}
      <Modal
        open={playing !== null}
        onClose={() => setPlaying(null)}
        title={
          <span className="inline-flex items-center gap-2">
            <Play className="h-4 w-4 fill-rose-600 text-rose-600" /> {playing?.title ?? ""}
          </span>
        }
        wide
        footer={
          playingWatch ? (
            <a
              href={playingWatch}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              <ExternalLink className="h-4 w-4" /> Mở trên YouTube
            </a>
          ) : undefined
        }
      >
        {playing && playingEmbed && (
          <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-xl">
            <div className="aspect-video w-full">
              <iframe
                key={playing.key}
                src={playingEmbed}
                title={playing.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        )}
        {playing && <p className="mt-3 text-sm leading-relaxed text-stone-500">{playing.description}</p>}
      </Modal>

      {/* ===== Modal đóng góp tài nguyên ===== */}
      <Modal
        open={contribOpen}
        onClose={() => setContribOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4 text-cyan-500" /> Đóng góp tài nguyên
          </span>
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setContribOpen(false)}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submitResourceContribute}
              disabled={rBusy || upload.uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {rBusy || upload.uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {upload.uploading ? "Đang tải tệp…" : "Gửi cho Ban Biên tập duyệt"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Loại tài nguyên">
            <Select value={rType} onChange={(e) => setRType(e.target.value)}>
              {resourceTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tên tài nguyên" required hint="Tối thiểu 6 ký tự">
            <Input value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Ví dụ: Bộ slide hướng dẫn an toàn không gian mạng" />
          </Field>
          <Field label="Mô tả">
            <Textarea value={rDesc} onChange={(e) => setRDesc(e.target.value)} className="min-h-20" placeholder="Mô tả ngắn về tài nguyên và đối tượng sử dụng" />
          </Field>
          <Field label="Tệp đính kèm" required hint="PDF, Word, Excel, PowerPoint, ảnh, video, tệp nén… — tệp đầu tiên là tệp chính">
            <MultiUploadField upload={upload} />
          </Field>
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-700">
            Tài nguyên ở trạng thái nháp — Ban Biên tập duyệt sẽ công khai trên kho dùng chung và cộng
            10 điểm đóng góp vào trang Tài khoản của bạn.
          </p>
        </div>
      </Modal>
    </div>
  );
}
