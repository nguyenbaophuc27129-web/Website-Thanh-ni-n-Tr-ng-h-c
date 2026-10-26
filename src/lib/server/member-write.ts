import { NextResponse, type NextRequest } from "next/server";
import { dbEnabled } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken, type SessionDto } from "@/lib/server/auth";
import { recordAttempt, retryAfterSeconds } from "@/lib/server/rate-limit";
import { MIME_BY_EXT, UPLOAD_URL_PREFIX, type MediaKind } from "@/lib/server/media";

/**
 * Tiện ích chung cho các API ghi của đoàn viên (diễn đàn, đóng góp, tài nguyên,
 * dự án, HS3T) — thay cho việc ghi qua đồng bộ chung /api/store:
 *   - bắt buộc đăng nhập, giới hạn tần suất theo tài khoản;
 *   - kiểm tra đường dẫn tệp chỉ thuộc /uploads/<phân hệ>/ do /api/uploads tạo;
 *   - gửi thông báo cho Ban biên tập ngay trong transaction ghi.
 */

export const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Phiên đăng nhập hoặc phản hồi lỗi (503 khi chưa nối DB, 401 khi chưa đăng nhập) */
export async function requireSession(request: NextRequest): Promise<SessionDto | NextResponse> {
  if (!dbEnabled()) return fail("Cơ sở dữ liệu chưa sẵn sàng.", 503);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token).catch(() => null) : null;
  if (!session) return fail("Bạn cần đăng nhập để thực hiện thao tác này.", 401);
  return session;
}

/** Đọc body JSON dạng object — sai định dạng trả null */
export async function readBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  const body = (await request.json().catch(() => null)) as unknown;
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

/**
 * Đếm 1 lượt thao tác cho tài khoản; vượt ngưỡng trong cửa sổ → trả phản hồi 429.
 * Khoá theo tài khoản (IP qua OneShield không phải IP thật).
 */
export function rateLimit(key: string, max: number, windowMs: number): NextResponse | null {
  const wait = retryAfterSeconds(key, max);
  if (wait > 0) {
    return NextResponse.json(
      { ok: false, error: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${Math.max(1, Math.ceil(wait / 60))} phút.` },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }
  recordAttempt(key, windowMs);
  return null;
}

/** Chuỗi đã cắt khoảng trắng; không phải chuỗi → "" */
export const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Nhóm đuôi tệp theo loại — khớp cách media.ts lưu tệp (ảnh luôn chuyển WebP) */
const IMAGE_EXTS = ["webp"];
const VIDEO_EXTS = ["mp4", "mov", "webm"];
const DOCUMENT_EXTS = Object.keys(MIME_BY_EXT).filter((e) => !IMAGE_EXTS.includes(e) && !VIDEO_EXTS.includes(e));

export const UPLOAD_EXTS = { image: IMAGE_EXTS, video: VIDEO_EXTS, document: DOCUMENT_EXTS } as const;

/**
 * Đường dẫn tệp hợp lệ của phân hệ `kind`: /uploads/<kind>/<năm>/<tháng>/<băm>.<đuôi>
 * đúng như storeMedia sinh ra — không nhận URL ngoài, data:, hay "../".
 */
export function isUploadPath(value: unknown, kind: MediaKind, exts: readonly string[]): value is string {
  if (typeof value !== "string" || value.length > 300) return false;
  const m = value.match(/^\/uploads\/([a-z-]+)\/(\d{4})\/(\d{2})\/([a-f0-9]{16,64})\.([a-z0-9]{1,5})$/);
  return !!m && value.startsWith(UPLOAD_URL_PREFIX) && m[1] === kind && exts.includes(m[5]);
}

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
}

/**
 * Thông báo cho Quản trị TW (tài khoản id 1 — như luồng cũ phía trình duyệt).
 * Bỏ qua nếu tài khoản không tồn tại, không làm hỏng thao tác của người dùng.
 */
export async function notifyAdmin(
  client: Queryable,
  n: { type: string; title: string; message: string; refType: string; refId: number; linkUrl: string },
): Promise<void> {
  await client.query(
    `INSERT INTO notifications (recipient_account_id, notification_type, title, message, ref_type, ref_id, link_url)
     SELECT 1, $1, $2, $3, $4, $5, $6 WHERE EXISTS (SELECT 1 FROM accounts WHERE id = 1 AND deleted_at IS NULL)`,
    [n.type, n.title.slice(0, 255), n.message, n.refType, n.refId, n.linkUrl],
  );
}

/** Lỗi ghi DB → 500 kèm log, không lộ chi tiết SQL cho người dùng */
export function serverError(tag: string, err: unknown): NextResponse {
  console.warn(`[TNTH][${tag}] Lỗi ghi:`, err instanceof Error ? err.message : err);
  return fail("Máy chủ không lưu được dữ liệu. Vui lòng thử lại.", 500);
}
