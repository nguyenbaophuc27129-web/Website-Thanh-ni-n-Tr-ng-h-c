"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ExternalLink,
  FileArchive,
  FolderOpen,
  Link2,
  Loader2,
  Play,
  UserRound,
  X,
  ZoomIn,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { EmptyState } from "@/components/public/empty-state";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import {
  documentToEntry,
  downloadStoredFile,
  fileExt,
  formatMeta,
  formatSizeKb,
  isImageExt,
  isSafeYoutubeUrl,
  isVideoExt,
  parseEntryKey,
  resourceFiles,
  resourceToEntry,
  triggerDownload,
  ytEmbedSrc,
  ytThumb,
  ytWatchUrl,
  type ResourceEntry,
} from "@/lib/resource-files";
import type { ResourceAttachment } from "@/types";

/** Sao chép văn bản vào clipboard (có phương án dự phòng cho trình duyệt cũ / trang không bảo mật) */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Phóng to ảnh toàn màn hình — chuyển ảnh bằng nút / phím ← →, đóng bằng Esc hoặc bấm nền */
function ImageLightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: ResourceAttachment[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const total = images.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onIndex((index! - 1 + total) % total);
      else if (e.key === "ArrowRight") onIndex((index! + 1) % total);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, index, total, onIndex, onClose]);

  const img = open ? images[index!] : null;
  return (
    <AnimatePresence>
      {img ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-[#050914]/95 p-4 backdrop-blur-md"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phóng to"
        >
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="Ảnh trước"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndex((index! - 1 + total) % total);
                }}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Ảnh sau"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndex((index! + 1) % total);
                }}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={img.url}
            src={img.url}
            alt={img.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-auto max-w-full rounded-xl border border-white/20 object-contain shadow-2xl"
          />
          <p className="mt-3 max-w-2xl truncate px-6 text-center text-xs text-slate-300">
            {img.name} {total > 1 ? `· ${index! + 1}/${total}` : ""}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function ChiTietTaiNguyenPage() {
  const params = useParams<{ id: string }>();
  const { resources, documents, resourceTypes, orgName, downloadResource, storeReady } = useStore();
  const { session } = useAuth();
  const { toast } = useToast();

  const key = parseEntryKey(params.id ?? "");
  const vanBanTypeId = resourceTypes.find((t) => t.code === "VAN_BAN")?.id ?? 4;

  /** Mục đang xem: tài nguyên đã duyệt + công khai (chủ đóng góp / cán bộ xem được cả bản nháp của mình), hoặc văn bản ISSUED */
  const entry = useMemo<ResourceEntry | null>(() => {
    if (!key) return null;
    if (key.kind === "document") {
      const d = documents.find((x) => x.id === key.id && x.status === "ISSUED");
      return d ? documentToEntry(d, vanBanTypeId) : null;
    }
    const r = resources.find((x) => x.id === key.id);
    if (!r) return null;
    const publicRow = r.status === "PUBLISHED" && r.isPublic;
    const mayPreview = !!session && (session.role !== "DOAN_VIEN" || r.submittedByAccountId === session.accountId);
    return publicRow || mayPreview ? resourceToEntry(r) : null;
  }, [key, documents, resources, vanBanTypeId, session]);

  const related = useMemo<ResourceEntry[]>(() => {
    if (!entry) return [];
    const pool = [
      ...resources.filter((r) => r.status === "PUBLISHED" && r.isPublic).map(resourceToEntry),
      ...documents.filter((d) => d.status === "ISSUED").map((d) => documentToEntry(d, vanBanTypeId)),
    ];
    return pool
      .filter((r) => r.key !== entry.key && r.resourceTypeId === entry.resourceTypeId)
      .sort((a, b) => b.downloadCount - a.downloadCount || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .slice(0, 4);
  }, [entry, resources, documents, vanBanTypeId]);

  const files = useMemo(() => (entry ? resourceFiles(entry) : []), [entry]);
  const images = useMemo(() => files.filter((f) => isImageExt(fileExt(f))), [files]);
  const videos = useMemo(() => files.filter((f) => isVideoExt(fileExt(f))), [files]);
  const pdfs = useMemo(() => files.filter((f) => fileExt(f) === "pdf"), [files]);

  const [lightbox, setLightbox] = useState<number | null>(null);
  const [pdfIdx, setPdfIdx] = useState(0);
  const [playClip, setPlayClip] = useState(false);
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  if (!key || !entry) {
    // Chưa nạp xong dữ liệu → khung chờ, tránh báo "không tìm thấy" chớp nhoáng khi vào thẳng đường dẫn
    if (key && !storeReady) {
      return (
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-24 text-sm text-slate-400" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải tài nguyên…
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState message="Không tìm thấy tài nguyên — có thể đã bị gỡ hoặc chưa được công khai." icon={FolderOpen} />
        <div className="mt-5 text-center">
          <Link href="/tai-nguyen" className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-700 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Về kho tài nguyên
          </Link>
        </div>
      </div>
    );
  }

  const isDoc = entry.docId !== undefined;
  const typeName = resourceTypes.find((t) => t.id === entry.resourceTypeId)?.name ?? "Tài nguyên";
  const isClip = !!entry.videoUrl && isSafeYoutubeUrl(entry.videoUrl);
  const clipThumb = isClip ? ytThumb(entry.videoUrl!) : null;
  const clipEmbed = isClip ? ytEmbedSrc(entry.videoUrl!) : null;
  const clipWatch = isClip ? ytWatchUrl(entry.videoUrl!) : null;
  const totalKb = entry.fileSizeKb > 0 ? entry.fileSizeKb : files.reduce((s, f) => s + f.sizeKb, 0);
  const isPublicNow = entry.status === "PUBLISHED" && entry.isPublic;
  const pdf = pdfs[Math.min(pdfIdx, Math.max(pdfs.length - 1, 0))];

  /** Ghi nhận lượt tải/xem qua máy chủ (chống đếm trùng) — chỉ tài nguyên thật, không phải văn bản */
  const countView = () => {
    if (!isDoc && isPublicNow) void downloadResource(entry.id);
  };

  const flashDone = () => {
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  };

  const onDownloadMain = () => {
    if (files.length === 0) {
      toast(`"${entry.title}" chưa có tệp đính kèm — nội dung sẽ được bổ sung sau.`, "warning");
      return;
    }
    if (files.length > 1 && !isDoc) {
      triggerDownload(`/api/tai-nguyen/${entry.id}/zip`);
      toast(`Đang tải gói ${files.length} tệp (.zip).`);
    } else {
      downloadStoredFile(files[0].url, files[0].name);
      toast(`Đã tải "${files[0].name}".`);
    }
    countView();
    flashDone();
  };

  const onDownloadOne = (f: ResourceAttachment) => {
    if (downloadStoredFile(f.url, f.name)) {
      countView();
      toast(`Đã tải "${f.name}".`);
    }
  };

  const onCopy = async () => {
    const ok = await copyText(window.location.href);
    if (ok) {
      setCopied(true);
      toast("Đã sao chép liên kết.");
      window.setTimeout(() => setCopied(false), 1600);
    } else {
      toast("Không sao chép được — hãy copy địa chỉ trên thanh trình duyệt.", "warning");
    }
  };

  const onPlayClip = () => {
    setPlayClip(true);
    countView(); // mở xem clip = 1 lượt xem
  };

  const previewFile = (f: ResourceAttachment) => {
    const ext = fileExt(f);
    if (isImageExt(ext)) setLightbox(images.findIndex((i) => i.url === f.url));
    else if (ext === "pdf") {
      setPdfIdx(pdfs.findIndex((p) => p.url === f.url));
      document.getElementById("xem-truoc-pdf")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (isVideoExt(ext)) document.getElementById(`video-${files.findIndex((v) => v.url === f.url)}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const canPreview = (f: ResourceAttachment) => {
    const ext = fileExt(f);
    return isImageExt(ext) || isVideoExt(ext) || ext === "pdf";
  };

  const fm = formatMeta(files[0] ? files[0].url : entry.fileName);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto max-w-4xl px-4 py-10"
    >
      <Link href="/tai-nguyen" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-cyan-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Kho tài nguyên
      </Link>

      {!isPublicNow && !isDoc && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Tài nguyên này đang ở trạng thái nháp — chỉ bạn (người đóng góp) và Ban biên tập nhìn thấy. Sau khi được duyệt công khai mới hiện cho mọi người.
        </p>
      )}

      {/* ===== Đầu trang: loại, tiêu đề, người đóng góp, ngày, lượt tải ===== */}
      <div className="mt-4 h-1 w-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-cyan-600">{typeName}</span>
        {files.length > 0 && (
          <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-[0.1em]", fm.chip)}>.{fm.label}</span>
        )}
        {files.length > 1 && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{files.length} tệp</span>
        )}
      </div>
      <h1 className="mt-2 break-words text-2xl font-bold leading-snug tracking-tight text-slate-900 sm:text-3xl">{entry.title}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-slate-200 py-3 text-xs text-slate-500">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {entry.contributorName ? `Đóng góp bởi ${entry.contributorName}` : `Đăng bởi ${orgName(entry.publishedByOrgUnitId)}`}
          </span>
        </span>
        {entry.publishedAt && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(entry.publishedAt)}
          </span>
        )}
        {!isDoc && (
          <span className="inline-flex items-center gap-1.5">
            {isClip ? <Eye className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            {formatNumber(entry.downloadCount)} {isClip ? "lượt xem" : "lượt tải"}
          </span>
        )}
        {totalKb > 0 && !isClip && <span>{formatSizeKb(totalKb)}</span>}
      </div>

      {/* ===== Hành động chính ===== */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {isClip ? (
          clipWatch && (
            <a
              href={clipWatch}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-500/25 transition hover:brightness-110"
            >
              <ExternalLink className="h-4 w-4" /> Mở trên YouTube
            </a>
          )
        ) : (
          <button
            type="button"
            onClick={onDownloadMain}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all",
              done
                ? "bg-emerald-500 shadow-emerald-500/25"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-blue-500/25 hover:-translate-y-0.5 hover:shadow-lg"
            )}
          >
            {done ? <Check className="h-4 w-4" /> : files.length > 1 ? <FileArchive className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {done ? "Đã tải" : files.length > 1 ? "Tải tất cả (.zip)" : "Tải xuống"}
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-700"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
          {copied ? "Đã sao chép" : "Sao chép liên kết"}
        </button>
      </div>

      {/* ===== Mô tả đầy đủ (giữ xuống dòng) ===== */}
      {entry.description && (
        <p className="mt-6 whitespace-pre-line break-words text-[15px] leading-7 text-slate-700">{entry.description}</p>
      )}

      {/* ===== Clip YouTube nhúng ===== */}
      {isClip && clipEmbed && (
        <section className="mt-6">
          <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-xl">
            <div className="relative aspect-video w-full">
              {playClip ? (
                <iframe
                  src={clipEmbed}
                  title={entry.title}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <button type="button" onClick={onPlayClip} className="group absolute inset-0" aria-label={`Phát clip: ${entry.title}`}>
                  {clipThumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={clipThumb} alt="" className="h-full w-full object-cover opacity-90" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-900/30 transition-colors group-hover:bg-slate-900/15">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/40">
                      <Play className="ml-1 h-6 w-6 fill-current" />
                    </span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== Thư viện ảnh ===== */}
      {images.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Hình ảnh ({images.length})</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((im, i) => (
              <button
                key={im.url}
                type="button"
                onClick={() => setLightbox(i)}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"
                aria-label={`Phóng to ảnh ${im.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt={im.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition-colors group-hover:bg-slate-900/25">
                  <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ===== Video tải lên ===== */}
      {videos.length > 0 && (
        <section className="mt-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Video ({videos.length})</h2>
          {videos.map((v) => (
            <div key={v.url} id={`video-${files.findIndex((f) => f.url === v.url)}`} className="overflow-hidden rounded-2xl bg-slate-950 shadow-lg">
              <video controls preload="metadata" playsInline src={v.url} className="aspect-video w-full bg-black" aria-label={v.name}>
                Trình duyệt của bạn không hỗ trợ phát video này — hãy tải tệp về để xem.
              </video>
            </div>
          ))}
        </section>
      )}

      {/* ===== PDF nhúng ===== */}
      {pdf && (
        <section id="xem-truoc-pdf" className="mt-8 scroll-mt-20">
          <h2 className="truncate text-sm font-bold uppercase tracking-wider text-slate-400">Xem trước: {pdf.name}</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <iframe key={pdf.url} src={pdf.url} title={pdf.name} className="h-[70vh] min-h-[420px] w-full" />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Không xem được trên thiết bị này?{" "}
            <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 hover:underline">
              Mở tệp trong thẻ mới
            </a>
            .
          </p>
        </section>
      )}

      {/* ===== Danh sách tệp ===== */}
      {files.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Tệp đính kèm ({files.length})</h2>
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {files.map((f) => {
              const meta = formatMeta(f.url);
              const Icon = meta.icon;
              return (
                <li key={f.url} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.tint)}>
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900" title={f.name}>{f.name}</p>
                    <p className="text-[11px] text-slate-400">
                      <span className="font-semibold">.{meta.label}</span>
                      {f.sizeKb > 0 && ` · ${formatSizeKb(f.sizeKb)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {canPreview(f) && (
                      <button
                        type="button"
                        onClick={() => previewFile(f)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-700"
                      >
                        <Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Xem</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDownloadOne(f)}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700"
                      aria-label={`Tải ${f.name}`}
                    >
                      <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Tải</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {files.some((f) => !canPreview(f)) && (
            <p className="mt-2 text-[11px] text-slate-400">Tệp Word, Excel, PowerPoint và tệp nén không xem trực tiếp được — hãy tải về máy.</p>
          )}
        </section>
      )}

      {/* ===== Tài nguyên cùng loại ===== */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-slate-900">Tài nguyên cùng loại</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((r) => {
              const rf = resourceFiles(r);
              const m = formatMeta(rf[0] ? rf[0].url : r.fileName);
              const RIcon = m.icon;
              return (
                <Link
                  key={r.key}
                  href={`/tai-nguyen/${r.key}`}
                  className="group flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:ring-cyan-300 hover:shadow-md"
                >
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", m.tint)}>
                    <RIcon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-cyan-700">{r.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {r.contributorName ? `Đóng góp bởi ${r.contributorName}` : orgName(r.publishedByOrgUnitId)}
                      {rf.length > 1 ? ` · ${rf.length} tệp` : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <ImageLightbox images={images} index={lightbox} onIndex={setLightbox} onClose={closeLightbox} />
    </motion.article>
  );
}
