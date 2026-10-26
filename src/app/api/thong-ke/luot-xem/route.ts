import { type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, json, requireSession } from "@/lib/server/member-write";

export const runtime = "nodejs";

/**
 * GET /api/thong-ke/luot-xem?days=30 — lượt xem tin bài theo ngày (post_view_daily) cho biểu đồ quản trị.
 * Chỉ tài khoản cán bộ (khác DOAN_VIEN). Trả đủ mọi ngày trong khoảng, ngày không có lượt = 0.
 */
export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if ("status" in session) return session;
  if (session.role === "DOAN_VIEN") return fail("Không có quyền xem thống kê.", 403);

  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("days")) || 30, 7), 90);
  try {
    const rows = await query<{ day: string; views: string }>(
      `SELECT to_char(d, 'DD/MM') AS day, COALESCE(sum(v.view_count), 0) AS views
         FROM generate_series((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - ($1::int - 1),
                              (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, interval '1 day') AS d
         LEFT JOIN post_view_daily v ON v.view_date = d::date
        GROUP BY d ORDER BY d`,
      [days],
    );
    return json({ ok: true, days: rows.map((r) => ({ date: r.day, views: Number(r.views) })) });
  } catch (err) {
    console.warn("[TNTH][THONG-KE] Lỗi đọc lượt xem:", err instanceof Error ? err.message : err);
    return fail("Không đọc được số liệu lượt xem.", 500);
  }
}
