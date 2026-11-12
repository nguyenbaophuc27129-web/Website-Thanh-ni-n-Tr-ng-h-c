import { open, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken, type SessionDto } from "@/lib/server/auth";
import { fail, rateLimit } from "@/lib/server/member-write";
import { UPLOAD_DIR, UPLOAD_URL_PREFIX } from "@/lib/server/media";
import { countResourceDownload, parseResourceId, viewerFingerprint } from "@/lib/server/resource-download";
import { buildReadViewer } from "@/lib/server/store-read-policy";
import { RESOURCE_EXTS, isUploadPath } from "@/lib/server/upload-path";
import { cleanZipName, uniqueZipName, zipChunks, zipTotalSize, type ZipFileInput } from "@/lib/server/zip-stream";
import { nameWithStoredExt } from "@/lib/resource-files";

export const runtime = "nodejs";

/** Số gói ZIP được phát cùng lúc (mỗi gói giữ vài tệp mở + 1 luồng đọc) */
const MAX_ACTIVE_ZIPS = 8;
let activeZips = 0;

interface ResourceRow {
  id: number;
  title: string;
  status: string;
  is_public: boolean;
  published_by_org_unit_id: number;
  submitted_by_account_id: number | null;
  attachments: unknown;
  file_name: string | null;
  file_data_url: string | null;
}

/** Tệp của tài nguyên: attachments; dữ liệu cũ chưa có thì dùng tệp chính */
function filesOf(row: ResourceRow): { name: string; url: string }[] {
  const out: { name: string; url: string }[] = [];
  if (Array.isArray(row.attachments)) {
    for (const a of row.attachments as { name?: unknown; url?: unknown }[]) {
      if (a && isUploadPath(a.url, "tai-nguyen", RESOURCE_EXTS)) {
        out.push({ name: typeof a.name === "string" && a.name ? a.name : "tai-lieu", url: a.url });
      }
    }
  }
  if (out.length === 0 && isUploadPath(row.file_data_url, "tai-nguyen", RESOURCE_EXTS)) {
    out.push({ name: row.file_name || "tai-lieu", url: row.file_data_url });
  }
  return out;
}

/** Tài nguyên chưa công khai: chỉ chủ đóng góp, hoặc cán bộ có quyền đọc dòng đó (như chính sách đọc /api/store) */
async function canViewPrivate(session: SessionDto, row: ResourceRow): Promise<boolean> {
  if (row.submitted_by_account_id !== null && Number(row.submitted_by_account_id) === session.accountId) return true;
  if (session.role === "DOAN_VIEN") return false;
  if (session.role === "QUAN_TRI_TW" || row.status === "PUBLISHED") return true;
  const viewer = await buildReadViewer(session);
  if (viewer.tree.includes(Number(row.published_by_org_unit_id))) return true;
  if (row.submitted_by_account_id === null) return false;
  const owner = await query(
    "SELECT 1 FROM accounts WHERE id = $1 AND org_unit_id = ANY($2::bigint[])",
    [row.submitted_by_account_id, viewer.tree],
  );
  return owner.length > 0;
}

/** Content-Disposition có tên tiếng Việt: bản ASCII dự phòng + filename* UTF-8 (RFC 5987) */
function attachmentHeader(title: string): string {
  const base = title.replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "tai-nguyen";
  const full = `${base}.zip`;
  const ascii = full
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const star = encodeURIComponent(full).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${star}`;
}

/** Mở tệp trong UPLOAD_DIR theo đường dẫn /uploads/...; null nếu thiếu / không phải tệp thường / thoát khỏi thư mục gốc */
async function openUpload(url: string): Promise<{ handle: FileHandle; size: number } | null> {
  const root = path.resolve(UPLOAD_DIR);
  const abs = path.resolve(root, url.slice(UPLOAD_URL_PREFIX.length));
  if (!abs.startsWith(root + path.sep)) return null;
  let handle: FileHandle | null = null;
  try {
    handle = await open(abs, "r");
    const st = await handle.stat();
    if (!st.isFile() || st.size <= 0) {
      await handle.close();
      return null;
    }
    return { handle, size: st.size };
  } catch {
    await handle?.close().catch(() => {});
    return null;
  }
}

/**
 * GET /api/tai-nguyen/[id]/zip — tải tất cả tệp của tài nguyên thành một gói .zip (phát dạng stream).
 * Công khai với tài nguyên đã duyệt; tài nguyên chưa công khai chỉ chủ đóng góp / cán bộ có quyền đọc.
 * Tính 1 lượt tải (cùng cơ chế chống đếm trùng với luot-tai). Tệp thiếu trên đĩa bị bỏ qua, ghi log.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = parseResourceId((await params).id);
  if (id === null) return fail("Mã tài nguyên không hợp lệ.");
  if (!dbEnabled()) return fail("Cơ sở dữ liệu chưa sẵn sàng.", 503);

  const limited = rateLimit(`zip:${viewerFingerprint(request)}`, 20, 10 * 60_000);
  if (limited) return limited;
  if (activeZips >= MAX_ACTIVE_ZIPS) {
    return NextResponse.json(
      { ok: false, error: "Máy chủ đang bận tạo nhiều gói tải xuống. Vui lòng thử lại sau ít phút." },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }

  let row: ResourceRow | undefined;
  try {
    row = (
      await query<ResourceRow>(
        `SELECT id, title, status, is_public, published_by_org_unit_id, submitted_by_account_id,
                attachments, file_name, file_data_url
           FROM resources WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      )
    )[0];
  } catch (err) {
    console.warn("[TNTH][ZIP] Lỗi đọc DB:", err instanceof Error ? err.message : err);
    return fail("Máy chủ chưa tạo được gói tải xuống.", 500);
  }
  if (!row) return fail("Không tìm thấy tài nguyên.", 404);

  const isPublic = row.status === "PUBLISHED" && row.is_public;
  if (!isPublic) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await sessionFromToken(token).catch(() => null) : null;
    // Trả 404 (không phải 403) để không lộ tài nguyên nháp tồn tại
    if (!session || !(await canViewPrivate(session, row))) return fail("Không tìm thấy tài nguyên.", 404);
  }

  const wanted = filesOf(row);
  if (wanted.length === 0) return fail("Tài nguyên này chưa có tệp để tải.", 404);

  const used = new Set<string>();
  const files: ZipFileInput[] = [];
  for (const w of wanted) {
    const opened = await openUpload(w.url);
    if (!opened) {
      console.warn(`[TNTH][ZIP] Tệp thiếu trên đĩa, bỏ qua: ${w.url} (tài nguyên #${id})`);
      continue;
    }
    files.push({
      name: uniqueZipName(cleanZipName(nameWithStoredExt(w.name, w.url)), used),
      handle: opened.handle,
      size: opened.size,
    });
  }
  if (files.length === 0) return fail("Tệp của tài nguyên chưa có trên máy chủ.", 404);

  if (isPublic) {
    // Lỗi đếm không được làm hỏng việc tải
    await countResourceDownload(request, id).catch((err) =>
      console.warn("[TNTH][ZIP] Không ghi được lượt tải:", err instanceof Error ? err.message : err),
    );
  }

  activeZips++;
  let released = false;
  const node = Readable.from(zipChunks(files), { objectMode: false });
  // 'close' đến cả khi người dùng huỷ trước khi luồng bắt đầu đọc → luôn trả chỗ và đóng tệp
  node.once("close", () => {
    if (!released) {
      released = true;
      activeZips--;
    }
    void Promise.all(files.map((f) => f.handle.close().catch(() => {})));
  });
  node.on("error", (err) => console.warn(`[TNTH][ZIP] Lỗi khi gửi gói của tài nguyên #${id}:`, err.message));

  return new Response(Readable.toWeb(node) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zipTotalSize(files)),
      "Content-Disposition": attachmentHeader(row.title),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
