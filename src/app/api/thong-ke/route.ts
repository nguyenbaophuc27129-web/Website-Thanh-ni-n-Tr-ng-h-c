import { NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import type { PublicStats } from "@/lib/public-stats";

export const runtime = "nodejs";

/**
 * GET /api/thong-ke — số liệu tổng hợp CÔNG KHAI cho trang chủ (khối thống kê, StoryFlow).
 * Chỉ trả CON SỐ đếm, không trả dòng dữ liệu (snapshot khách không còn chứa hoạt động,
 * hồ sơ HS3T… nên trang công khai không tự đếm được nữa). Cache 30 giây trong tiến trình.
 */

const CACHE_MS = 30_000;
let cache: { at: number; stats: PublicStats } | null = null;

const n = (v: unknown) => Number(v ?? 0) || 0;

async function loadStats(): Promise<PublicStats> {
  const rows = await query<Record<string, string | null>>(
    `SELECT
       (SELECT count(*) FROM published_posts WHERE status = 'PUBLISHED') AS posts,
       (SELECT count(*) FROM activities) AS activities,
       (SELECT count(*) FROM activities WHERE confirm_status = 'CONFIRMED') AS activities_confirmed,
       (SELECT COALESCE(sum(participant_count), 0) FROM activities) AS participants,
       (SELECT count(*) FROM forum_threads WHERE status = 'PUBLISHED') AS forum_threads,
       (SELECT count(*) FROM volunteer_projects WHERE status = 'APPROVED') AS volunteer_projects,
       (SELECT count(*) FROM resources WHERE status = 'PUBLISHED' AND is_public) AS resources,
       (SELECT count(*) FROM hs3t_profiles WHERE awarded_level IS NOT NULL) AS hs3t_awarded,
       (SELECT count(*) FROM org_units WHERE is_active AND deleted_at IS NULL) AS org_units`,
  );
  const r = rows[0] ?? {};
  return {
    posts: n(r.posts),
    activities: n(r.activities),
    activitiesConfirmed: n(r.activities_confirmed),
    participants: n(r.participants),
    forumThreads: n(r.forum_threads),
    volunteerProjects: n(r.volunteer_projects),
    resources: n(r.resources),
    hs3tAwarded: n(r.hs3t_awarded),
    orgUnits: n(r.org_units),
  };
}

export async function GET() {
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  try {
    if (!cache || Date.now() - cache.at > CACHE_MS) {
      cache = { at: Date.now(), stats: await loadStats() };
    }
    return NextResponse.json(
      { ok: true, stats: cache.stats },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } },
    );
  } catch (err) {
    console.warn("[TNTH][THONG-KE] Lỗi đọc số liệu:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "STATS_READ_FAILED" }, { status: 500 });
  }
}
