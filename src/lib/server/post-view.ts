import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { clientIpOf, ipRateKey } from "@/lib/server/client-ip";
import { clearAttempts, recordAttempt, retryAfterSeconds } from "@/lib/server/rate-limit";

/**
 * Đếm lượt xem bài viết — POST /api/tin-tuc/[id]/luot-xem.
 *
 * - Không cần đăng nhập, chỉ bài PUBLISHED chưa xoá.
 * - Chống đếm trùng: cùng "dấu vết" người xem + cùng bài chỉ tính 1 lần / 30 phút (bộ nhớ tiến trình,
 *   khởi động lại web thì tính lại — chấp nhận được).
 * - Bỏ qua trình thu thập dữ liệu / công cụ dòng lệnh; trần chung toàn hệ thống chặn bơm số liệu bằng script.
 * - Một câu SQL duy nhất: tăng published_posts.view_count (nguyên tử), ghi 1 dòng post_views và cộng
 *   post_view_daily (view_count; unique_visitors chỉ cộng khi người này chưa xem bài đó trong ngày).
 */

const DEDUPE_WINDOW_MS = 30 * 60_000;
const GLOBAL_COUNT_MAX = 5000;
const GLOBAL_WINDOW_MS = 10 * 60_000;

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|httpclient|axios|node-fetch|go-http|java\//i;

/** Muối cố định suy ra từ DATABASE_URL (không thêm biến môi trường): băm người xem không dò ngược được từ IP */
const SALT = createHash("sha256").update(`${process.env.DATABASE_URL ?? ""}|post-view`).digest("hex");

/** Bản băm 64 ký tự (khớp post_views.visitor_hash CHAR(64)) của IP + User-Agent + ngôn ngữ */
export function visitorHash(request: NextRequest): string {
  const ip = ipRateKey(clientIpOf(request));
  const ua = request.headers.get("user-agent")?.slice(0, 300) ?? "";
  const lang = request.headers.get("accept-language")?.slice(0, 100) ?? "";
  return createHash("sha256").update(`${SALT}|${ip}|${ua}|${lang}`).digest("hex");
}

export function isBotUserAgent(ua: string | null): boolean {
  return !ua || ua.length < 10 || BOT_UA.test(ua);
}

export function deviceTypeOf(ua: string): "DESKTOP" | "MOBILE" | "TABLET" {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "TABLET";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "MOBILE";
  return "DESKTOP";
}

/** Nguồn truy cập: chỉ nhận liên kết http(s), cắt 500 ký tự (post_views.referrer) */
export function cleanReferrer(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 500);
  return /^https?:\/\//i.test(s) ? s : null;
}

export interface ViewResult {
  /** true = lượt này được cộng; false = trùng gần đây, là bot hoặc chạm trần chung */
  counted: boolean;
  viewCount: number;
}

const ICT = "'Asia/Ho_Chi_Minh'";

/** Cộng 1 lượt xem cho bài đã xuất bản. null = không có bài công khai với mã này. */
export async function countPostView(request: NextRequest, id: number, referrer: string | null): Promise<ViewResult | null> {
  const ua = request.headers.get("user-agent");
  const hash = visitorHash(request);
  const key = `pv:${id}:${hash}`;
  const skip = isBotUserAgent(ua) || retryAfterSeconds(key, 1) > 0 || retryAfterSeconds("pv:global", GLOBAL_COUNT_MAX) > 0;

  if (!skip) {
    // Giữ chỗ TRƯỚC khi ghi để 2 request song song của cùng người không cùng được cộng
    recordAttempt(key, DEDUPE_WINDOW_MS);
    try {
      const rows = await query<{ view_count: string }>(
        `WITH upd AS (
           UPDATE published_posts SET view_count = view_count + 1
            WHERE id = $1 AND status = 'PUBLISHED' AND deleted_at IS NULL
        RETURNING id, view_count
         ), seen AS (
           SELECT EXISTS (
             SELECT 1 FROM post_views
              WHERE post_id = $1 AND visitor_hash = $2
                AND viewed_at >= date_trunc('day', now() AT TIME ZONE ${ICT}) AT TIME ZONE ${ICT}
           ) AS yes
         ), ins AS (
           INSERT INTO post_views (post_id, visitor_hash, referrer, device_type)
           SELECT id, $2, $3, $4 FROM upd
         ), daily AS (
           INSERT INTO post_view_daily (post_id, view_date, view_count, unique_visitors)
           SELECT id, (now() AT TIME ZONE ${ICT})::date, 1, CASE WHEN (SELECT yes FROM seen) THEN 0 ELSE 1 END FROM upd
           ON CONFLICT (post_id, view_date) DO UPDATE SET
             view_count = post_view_daily.view_count + 1,
             unique_visitors = post_view_daily.unique_visitors + EXCLUDED.unique_visitors
         )
         SELECT view_count FROM upd`,
        [id, hash, referrer, deviceTypeOf(ua ?? "")],
      );
      if (rows[0]) {
        recordAttempt("pv:global", GLOBAL_WINDOW_MS);
        return { counted: true, viewCount: Number(rows[0].view_count) };
      }
    } catch (err) {
      clearAttempts(key);
      throw err;
    }
    clearAttempts(key); // không có bài công khai — không giữ chỗ
    return null;
  }

  const rows = await query<{ view_count: string }>(
    `SELECT view_count FROM published_posts WHERE id = $1 AND status = 'PUBLISHED' AND deleted_at IS NULL`,
    [id],
  );
  return rows[0] ? { counted: false, viewCount: Number(rows[0].view_count) } : null;
}
