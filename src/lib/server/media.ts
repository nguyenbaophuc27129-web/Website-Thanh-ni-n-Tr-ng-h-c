import { createHash, randomBytes } from "node:crypto";
import { access, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { dbEnabled, query } from "../db.ts";
import { fetchPublic, readBodyLimited } from "./safe-fetch.ts";

/**
 * Lưu tệp người dùng tải lên (ảnh, video, văn bản) vào ổ đĩa máy chủ.
 *
 * - Thư mục gốc: UPLOAD_DIR (mặc định ./uploads). Production gắn thư mục
 *   /srv/tnth/uploads của máy chủ vào /app/uploads (docker-compose.yml);
 *   Caddy phục vụ thẳng /uploads/* từ thư mục đó, không qua Next.js.
 * - Đường dẫn công khai: /uploads/<phân hệ>/<năm>/<tháng>/<sha256>.<đuôi>
 *   Tên tệp theo mã băm nội dung → không đoán được, không ghi đè, trùng thì dùng lại.
 * - Ảnh luôn chuyển sang WebP (xoay đúng chiều, xoá EXIF/GPS, cạnh dài ≤ 2000px).
 *   Video và văn bản giữ nguyên, chỉ nhận định dạng trong danh sách cho phép
 *   và kiểm tra chữ ký tệp (magic bytes) chứ không tin đuôi tệp.
 * - Mỗi tệp được ghi một dòng vào bảng media_files (migration 0026).
 */

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
export const UPLOAD_URL_PREFIX = "/uploads/";

const MB = 1024 * 1024;

export type MediaKind = "bai-viet" | "dong-gop" | "dien-dan" | "van-ban" | "tai-nguyen" | "du-an";
type FileClass = "image" | "video" | "document";

export const KIND_RULES: Record<MediaKind, { classes: FileClass[]; maxBytes: number; staffOnly: boolean }> = {
  "bai-viet": { classes: ["image"], maxBytes: 10 * MB, staffOnly: true },
  "van-ban": { classes: ["document", "image"], maxBytes: 25 * MB, staffOnly: true },
  "dong-gop": { classes: ["image"], maxBytes: 10 * MB, staffOnly: false },
  "dien-dan": { classes: ["image", "video"], maxBytes: 15 * MB, staffOnly: false },
  "tai-nguyen": { classes: ["document", "image", "video"], maxBytes: 25 * MB, staffOnly: false },
  "du-an": { classes: ["document"], maxBytes: 25 * MB, staffOnly: false },
};

export const isMediaKind = (v: unknown): v is MediaKind =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(KIND_RULES, v);

/** Đuôi tệp được phép lưu và Content-Type tương ứng (Caddy cũng suy theo đuôi) */
export const MIME_BY_EXT: Record<string, string> = {
  webp: "image/webp",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
  pdf: "application/pdf",
  doc: "application/msword", xls: "application/vnd.ms-excel", ppt: "application/vnd.ms-powerpoint",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed",
  txt: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8",
  mp3: "audio/mpeg",
};

/** Lỗi trả thẳng cho người dùng (thông điệp tiếng Việt + mã HTTP) */
export class MediaError extends Error {
  // Không dùng parameter property — scripts/migrate-media.mts chạy file này bằng node (chỉ bỏ kiểu)
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface StoredMedia {
  url: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  name?: string;
}

const IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "gif", "heif", "avif", "tiff"]);
const IMAGE_MAX_SIDE = 2000;

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

function extOf(name?: string): string {
  const m = (name ?? "").toLowerCase().match(/\.([a-z0-9]{1,5})$/);
  return m ? m[1] : "";
}

function detectVideo(buf: Buffer): string | null {
  // ISO-BMFF: "ftyp" ở byte 4 — brand "qt  " là QuickTime (.mov)
  if (startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) {
    return buf.toString("latin1", 8, 12) === "qt  " ? "mov" : "mp4";
  }
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return "webm";
  return null;
}

/** Văn bản: chữ ký tệp phải khớp nhóm của đuôi tệp người dùng đặt */
function detectDocument(buf: Buffer, name?: string): string | null {
  const ext = extOf(name);
  const isZip = startsWith(buf, [0x50, 0x4b, 0x03, 0x04]);
  const isOle = startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  if (isZip) return ["docx", "xlsx", "pptx"].includes(ext) ? ext : "zip";
  if (isOle) return ["doc", "xls", "ppt"].includes(ext) ? ext : null;
  if (startsWith(buf, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07])) return "rar";
  if (startsWith(buf, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return "7z";
  if (ext === "mp3" && (startsWith(buf, [0x49, 0x44, 0x33]) || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0))) return "mp3";
  if ((ext === "txt" || ext === "csv") && !buf.subarray(0, 8192).includes(0)) return ext;
  return null;
}

async function processImage(buf: Buffer): Promise<{ data: Buffer; width?: number; height?: number }> {
  let format: string | undefined;
  try {
    format = (await sharp(buf).metadata()).format;
  } catch {
    format = undefined;
  }
  // SVG cố tình không nhận: có thể chứa mã script
  if (!format || !IMAGE_FORMATS.has(format)) {
    throw new MediaError("Định dạng ảnh không được hỗ trợ — dùng JPG, PNG, WebP, GIF hoặc AVIF.", 415);
  }
  try {
    const { data, info } = await sharp(buf, { animated: true, limitInputPixels: 100_000_000 })
      .rotate()
      .resize({ width: IMAGE_MAX_SIDE, height: IMAGE_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.pageHeight ?? info.height };
  } catch {
    throw new MediaError("Không đọc được ảnh — tệp có thể bị hỏng hoặc định dạng không hỗ trợ.", 415);
  }
}

const exists = (p: string) => access(p).then(() => true, () => false);

/** Kiểm tra, xử lý và ghi 1 tệp xuống ổ đĩa. Trả về đường dẫn công khai /uploads/... */
export async function storeMedia(input: {
  buffer: Buffer;
  kind: MediaKind;
  originalName?: string;
  accountId?: number | null;
}): Promise<StoredMedia> {
  const { buffer, kind, originalName } = input;
  const rule = KIND_RULES[kind];
  if (buffer.length === 0) throw new MediaError("Tệp rỗng.");
  if (buffer.length > rule.maxBytes) {
    throw new MediaError(`Tệp vượt quá ${Math.round(rule.maxBytes / MB)}MB.`, 413);
  }

  let data: Buffer;
  let ext: string;
  let width: number | undefined;
  let height: number | undefined;

  const video = detectVideo(buffer);
  const doc = video ? null : detectDocument(buffer, originalName);
  if (video) {
    if (!rule.classes.includes("video")) throw new MediaError("Mục này không nhận video.", 415);
    data = buffer;
    ext = video;
  } else if (doc) {
    if (!rule.classes.includes("document")) throw new MediaError("Mục này chỉ nhận hình ảnh.", 415);
    data = buffer;
    ext = doc;
  } else {
    if (!rule.classes.includes("image")) {
      throw new MediaError("Định dạng tệp không được hỗ trợ — dùng PDF, Word, Excel, PowerPoint hoặc tệp nén.", 415);
    }
    try {
      ({ data, width, height } = await processImage(buffer));
    } catch (err) {
      // Mục nhận cả văn bản lẫn ảnh → báo định dạng chung, không chỉ nói về ảnh
      if (err instanceof MediaError && rule.classes.includes("document")) {
        throw new MediaError("Định dạng tệp không được hỗ trợ — dùng PDF, Word, Excel, PowerPoint, tệp nén hoặc ảnh JPG/PNG/WebP.", 415);
      }
      throw err;
    }
    ext = "webp";
  }

  const sha256 = createHash("sha256").update(data).digest("hex");
  const mime = MIME_BY_EXT[ext];

  // Trùng nội dung trong cùng phân hệ → dùng lại tệp cũ
  if (dbEnabled()) {
    try {
      const prev = await query<{ path: string }>(
        "SELECT path FROM media_files WHERE sha256 = $1 AND kind = $2 ORDER BY id LIMIT 1",
        [sha256, kind],
      );
      const prevPath = prev[0]?.path;
      if (prevPath && (await exists(path.join(UPLOAD_DIR, prevPath.slice(UPLOAD_URL_PREFIX.length))))) {
        return { url: prevPath, mime, size: data.length, width, height, name: originalName };
      }
    } catch (err) {
      console.warn("[TNTH][MEDIA] Không tra được media_files:", err instanceof Error ? err.message : err);
    }
  }

  const now = new Date();
  const rel = `${kind}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${sha256.slice(0, 32)}.${ext}`;
  const abs = path.join(UPLOAD_DIR, rel);
  if (!(await exists(abs))) {
    await mkdir(path.dirname(abs), { recursive: true });
    // Ghi ra tệp tạm rồi đổi tên → không bao giờ phục vụ tệp ghi dở
    const tmp = `${abs}.${randomBytes(6).toString("hex")}.tmp`;
    await writeFile(tmp, data, { mode: 0o644 });
    await rename(tmp, abs);
  }

  const url = UPLOAD_URL_PREFIX + rel;
  if (dbEnabled()) {
    try {
      await query(
        `INSERT INTO media_files (path, sha256, kind, mime_type, size_bytes, width, height, original_name, uploaded_by_account_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (path) DO NOTHING`,
        [url, sha256, kind, mime, data.length, width ?? null, height ?? null,
          originalName?.slice(0, 255) ?? null, input.accountId ?? null],
      );
    } catch (err) {
      // Tệp đã nằm trên đĩa — thiếu dòng nhật ký không làm hỏng thao tác của người dùng
      console.warn("[TNTH][MEDIA] Không ghi được media_files:", err instanceof Error ? err.message : err);
    }
  }
  return { url, mime, size: data.length, width, height, name: originalName };
}

/** Máy chủ tự tải tệp từ URL công khai (có chặn SSRF) rồi lưu như tệp tải lên */
export async function storeMediaFromUrl(rawUrl: string, kind: MediaKind, accountId?: number | null): Promise<StoredMedia> {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new MediaError("Đường dẫn không hợp lệ.");
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new MediaError("Đường dẫn phải bắt đầu bằng http:// hoặc https://");
  }
  let buffer: Buffer;
  try {
    const res = await fetchPublic(target, undefined, "image/avif,image/webp,image/*,*/*;q=0.8", 20_000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buffer = await readBodyLimited(res, KIND_RULES[kind].maxBytes);
  } catch (err) {
    const why = err instanceof Error ? err.message : "lỗi không rõ";
    throw new MediaError(`Không tải được tệp từ đường dẫn (${why}).`, 502);
  }
  const lastSegment = target.pathname.split("/").pop() || "";
  let name: string | undefined;
  try {
    name = decodeURIComponent(lastSegment) || undefined;
  } catch {
    name = lastSegment || undefined;
  }
  return storeMedia({ buffer, kind, originalName: name, accountId });
}

/** "data:<mime>;base64,<...>" → Buffer */
export function decodeDataUrl(value: string): Buffer {
  const comma = value.indexOf(",");
  if (!value.startsWith("data:") || comma < 0) throw new MediaError("Dữ liệu tệp không hợp lệ.");
  const meta = value.slice(5, comma);
  const payload = value.slice(comma + 1);
  return meta.endsWith(";base64")
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");
}

/**
 * Lưới an toàn cho POST /api/store: chuỗi base64 (data:) lọt vào các cột tệp
 * — tab cũ chưa tải lại, hoặc client gửi thẳng — được chuyển thành tệp trên đĩa
 * trước khi ghi DB, để database và snapshot /api/store không phình to.
 * Tệp không hợp lệ → để trống cột thay vì làm hỏng cả lần đồng bộ.
 */
export async function externalizeDataUrls(
  entity: string,
  objs: Record<string, unknown>[],
  accountId: number | null,
): Promise<number> {
  let converted = 0;
  const conv = async (value: unknown, kind: MediaKind, name?: unknown): Promise<unknown> => {
    if (typeof value !== "string" || !value.startsWith("data:")) return value;
    try {
      const stored = await storeMedia({
        buffer: decodeDataUrl(value),
        kind,
        originalName: typeof name === "string" ? name : undefined,
        accountId,
      });
      converted++;
      return stored.url;
    } catch (err) {
      console.warn(`[TNTH][MEDIA] Bỏ tệp base64 không hợp lệ (${entity}):`, err instanceof Error ? err.message : err);
      return "";
    }
  };

  for (const o of objs) {
    switch (entity) {
      case "publishedPosts":
        o.coverDataUrl = await conv(o.coverDataUrl, "bai-viet");
        break;
      case "memberContributions":
        o.coverDataUrl = await conv(o.coverDataUrl, "dong-gop");
        break;
      case "documents":
        o.fileDataUrl = await conv(o.fileDataUrl, "van-ban", o.fileName);
        break;
      case "resources":
        o.fileDataUrl = await conv(o.fileDataUrl, "tai-nguyen", o.fileName);
        break;
      case "volunteerProjects": {
        const rf = o.reportFile as { name?: string; dataUrl?: string } | undefined;
        if (rf) rf.dataUrl = (await conv(rf.dataUrl, "du-an", rf.name)) as string | undefined;
        break;
      }
      case "forumThreads":
      case "forumComments":
        if (Array.isArray(o.media)) {
          for (const m of o.media as { dataUrl?: string; name?: string }[]) {
            m.dataUrl = (await conv(m.dataUrl, "dien-dan", m.name)) as string | undefined;
          }
        }
        break;
    }
  }
  return converted;
}
