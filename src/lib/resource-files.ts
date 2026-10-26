import {
  FileArchive,
  FileText,
  FileSpreadsheet,
  Presentation,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { isSafeFileUrl, isSafeYoutubeUrl } from "@/lib/safe-urls";
import type { DocumentRecord, Resource, ResourceAttachment } from "@/types";

/**
 * Tiện ích dùng chung cho kho tài nguyên (trang danh sách, trang chi tiết, modal đóng góp)
 * và trang văn bản: nhận diện định dạng, đường dẫn an toàn, YouTube, tải tệp.
 * Chạy phía trình duyệt; phần kiểm đường dẫn/liên kết an toàn nằm ở safe-urls.ts (dùng chung với máy chủ).
 */

/** Số tệp tối đa / tài nguyên và dung lượng tối đa / tệp (khớp KIND_RULES["tai-nguyen"] ở media.ts) */
export const RESOURCE_MAX_FILES = 10;
export const RESOURCE_MAX_FILE_BYTES = 25 * 1024 * 1024;

/* ---------------- Đuôi tệp & định dạng ---------------- */

export const extOf = (fileName: string) => fileName.split(".").pop()?.toLowerCase() ?? "";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"];
export const isImageExt = (ext: string) => IMAGE_EXTS.includes(ext);
export const isVideoExt = (ext: string) => ["mp4", "mov", "webm"].includes(ext);

/** Đuôi thật của tệp: ưu tiên đuôi trong đường dẫn lưu trên máy chủ (ảnh luôn thành .webp), sau đó tới tên tệp */
export function fileExt(f: { name: string; url?: string }): string {
  const fromUrl = f.url ? extOf(f.url.split("?")[0]) : "";
  return fromUrl && fromUrl.length <= 5 && !fromUrl.includes("/") ? fromUrl : extOf(f.name);
}

/** Định dạng file → khối icon bo tròn nền màu nhạt tương ứng (PDF đỏ nhạt, Word xanh…) */
export function formatMeta(fileName: string): {
  label: string;
  tint: string;
  chip: string;
  icon: typeof FileArchive;
} {
  const ext = extOf(fileName);
  if (ext === "zip" || ext === "rar" || ext === "7z")
    return { label: "ZIP", tint: "bg-amber-50 text-amber-600", chip: "bg-amber-400/90 text-slate-900", icon: FileArchive };
  if (ext === "pdf")
    return { label: "PDF", tint: "bg-rose-50 text-rose-600", chip: "bg-rose-500/90 text-white", icon: FileText };
  if (ext === "docx" || ext === "doc")
    return { label: "DOCX", tint: "bg-blue-50 text-blue-600", chip: "bg-blue-500/90 text-white", icon: FileText };
  if (ext === "xlsx" || ext === "xls")
    return { label: "XLSX", tint: "bg-emerald-50 text-emerald-600", chip: "bg-emerald-500/90 text-white", icon: FileSpreadsheet };
  if (ext === "pptx" || ext === "ppt")
    return { label: "PPTX", tint: "bg-orange-50 text-orange-600", chip: "bg-orange-500/90 text-white", icon: Presentation };
  if (isVideoExt(ext) || ext === "avi")
    return { label: ext.toUpperCase(), tint: "bg-violet-50 text-violet-600", chip: "bg-violet-500/90 text-white", icon: Video };
  if (isImageExt(ext))
    return { label: ext === "jpeg" ? "JPG" : ext.toUpperCase(), tint: "bg-pink-50 text-pink-600", chip: "bg-pink-500/90 text-white", icon: ImageIcon };
  return { label: ext ? ext.toUpperCase().slice(0, 5) : "FILE", tint: "bg-slate-100 text-slate-500", chip: "bg-slate-600/90 text-white", icon: FileText };
}

/** Bộ lọc định dạng file — mỗi nhóm gộp các đuôi tương ứng, tint màu riêng */
export const FORMAT_FILTERS: {
  key: string;
  label: string;
  match: (ext: string) => boolean;
  tint: string;
  icon: typeof FileText;
}[] = [
  { key: "pdf", label: "PDF", match: (e) => e === "pdf", tint: "bg-rose-50 text-rose-600", icon: FileText },
  { key: "doc", label: "DOC", match: (e) => e === "doc" || e === "docx", tint: "bg-blue-50 text-blue-600", icon: FileText },
  { key: "xls", label: "EXCEL", match: (e) => e === "xls" || e === "xlsx", tint: "bg-emerald-50 text-emerald-600", icon: FileSpreadsheet },
  { key: "ppt", label: "PPT", match: (e) => e === "ppt" || e === "pptx", tint: "bg-orange-50 text-orange-600", icon: Presentation },
  { key: "mp4", label: "MP4", match: (e) => isVideoExt(e) || e === "avi", tint: "bg-violet-50 text-violet-600", icon: Video },
  { key: "img", label: "ẢNH", match: isImageExt, tint: "bg-pink-50 text-pink-600", icon: ImageIcon },
  { key: "zip", label: "ZIP", match: (e) => e === "zip" || e === "rar" || e === "7z", tint: "bg-amber-50 text-amber-600", icon: FileArchive },
];

/** Dung lượng dễ đọc: "850 KB" / "3.2 MB" */
export function formatSizeKb(kb: number): string {
  if (!Number.isFinite(kb) || kb <= 0) return "";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

/**
 * Tên hiển thị khớp đuôi tệp thật trên máy chủ: ảnh tải lên luôn chuyển thành WebP
 * nên "anh.jpg" → "anh.webp"; tên không có đuôi thì thêm đuôi thật.
 */
export function nameWithStoredExt(name: string, url: string): string {
  const real = extOf(url);
  if (!real) return name;
  const cur = extOf(name);
  if (cur === real) return name;
  const dot = name.lastIndexOf(".");
  // Chỉ coi là đuôi khi ngắn & không có khoảng trắng ("Báo cáo. Bản cuối" không phải đuôi)
  const hasExt = dot > 0 && name.length - dot <= 6 && !/\s/.test(name.slice(dot));
  return `${hasExt ? name.slice(0, dot) : name}.${real}`;
}

/* ---------------- Đường dẫn an toàn ---------------- */

// Tách riêng (safe-urls.ts, không kéo theo thư viện icon) để luật ghi phía máy chủ dùng chung
export { isSafeFileUrl, isSafeYoutubeUrl };

/* ---------------- YouTube ---------------- */

/** videoId từ link YouTube (watch/youtu.be/shorts) — trả null nếu là playlist */
export function ytVideoId(url: string): string | null {
  return url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1] ?? null;
}
/** Ảnh thumbnail clip YouTube, null nếu không lấy được (playlist) hoặc link không an toàn */
export function ytThumb(url: string): string | null {
  if (!isSafeYoutubeUrl(url)) return null;
  const id = ytVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
/** Link nhúng phát được — giữ nguyên link embed (playlist), watch → embed. null nếu link không an toàn */
export function ytEmbedSrc(url: string, autoplay = true): string | null {
  if (!isSafeYoutubeUrl(url)) return null;
  const ap = autoplay ? "autoplay=1&" : "";
  if (url.includes("/embed/")) return `${url}${url.includes("?") ? "&" : "?"}${ap}rel=0`;
  const id = ytVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?${ap}rel=0` : null;
}
/** Link mở trên YouTube; null nếu link không an toàn */
export function ytWatchUrl(url: string): string | null {
  if (!isSafeYoutubeUrl(url)) return null;
  const id = ytVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : url;
}

/* ---------------- Danh sách tệp của tài nguyên ---------------- */

/**
 * Mọi tệp của tài nguyên: attachments; dữ liệu cũ chưa có attachments thì suy từ fileName/fileDataUrl.
 * Chỉ trả tệp có đường dẫn an toàn (isSafeFileUrl) — nơi gọi dùng thẳng làm href/src.
 */
export function resourceFiles(r: Pick<Resource, "attachments" | "fileName" | "fileDataUrl" | "fileSizeKb">): ResourceAttachment[] {
  const list = Array.isArray(r.attachments) ? r.attachments.filter((a) => a && isSafeFileUrl(a.url)) : [];
  if (list.length > 0) return list;
  if (isSafeFileUrl(r.fileDataUrl)) {
    return [{ name: r.fileName || "tai-lieu", url: r.fileDataUrl, sizeKb: Math.max(0, r.fileSizeKb || 0) }];
  }
  return [];
}

/** Tài nguyên có ít nhất 1 tệp thuộc nhóm định dạng `match` */
export const resourceHasFormat = (r: Parameters<typeof resourceFiles>[0], match: (ext: string) => boolean) =>
  resourceFiles(r).some((f) => match(fileExt(f)));

/* ---------------- Văn bản ban hành gộp vào kho ---------------- */

/** Dòng trong kho = tài nguyên thường (key "12") hoặc văn bản ISSUED (key "vb-3"; id âm để không đụng id tài nguyên) */
export interface ResourceEntry extends Resource {
  key: string;
  docId?: number;
}

export const resourceKey = (id: number) => String(id);
export const docKey = (docId: number) => `vb-${docId}`;

/** Phân tích tham số đường dẫn /tai-nguyen/[id]: số → tài nguyên, vb-<số> → văn bản */
export function parseEntryKey(raw: string): { kind: "resource" | "document"; id: number } | null {
  const m = /^(vb-)?(\d{1,16})$/.exec(raw);
  if (!m) return null;
  const id = Number(m[2]);
  return Number.isSafeInteger(id) && id > 0 ? { kind: m[1] ? "document" : "resource", id } : null;
}

export function documentToEntry(d: DocumentRecord, vanBanTypeId: number): ResourceEntry {
  const safe = isSafeFileUrl(d.fileDataUrl);
  const name = d.fileName || "";
  return {
    id: -d.id,
    key: docKey(d.id),
    docId: d.id,
    resourceTypeId: vanBanTypeId,
    title: d.title,
    description: [d.docNumber, d.summary].filter(Boolean).join(" · "),
    fileName: safe ? name || "van-ban" : "",
    fileSizeKb: 0, // văn bản chưa lưu dung lượng — không rõ thì ẩn
    fileDataUrl: safe ? d.fileDataUrl : undefined,
    isPublic: true,
    downloadCount: 0,
    publishedByOrgUnitId: d.issuingOrgUnitId,
    publishedAt: d.createdAt,
    status: "PUBLISHED",
  };
}

export function resourceToEntry(r: Resource): ResourceEntry {
  return { ...r, key: resourceKey(r.id) };
}

/* ---------------- Tải tệp ---------------- */

/** Kích hoạt tải xuống bằng thẻ <a download> (cùng nguồn gốc nên trình duyệt lưu tệp thay vì mở) */
export function triggerDownload(href: string, fileName?: string): void {
  const a = document.createElement("a");
  a.href = href;
  if (fileName) a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Tải 1 tệp trên máy chủ; trả false nếu đường dẫn không an toàn (không tải gì) */
export function downloadStoredFile(url: string | undefined, fileName: string): boolean {
  if (!isSafeFileUrl(url)) return false;
  triggerDownload(url, fileName);
  return true;
}
