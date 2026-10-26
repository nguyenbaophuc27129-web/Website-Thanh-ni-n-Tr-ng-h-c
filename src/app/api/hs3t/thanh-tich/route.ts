import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import { fail, json, rateLimit, readBody, requireSession, serverError, str } from "@/lib/server/member-write";

export const runtime = "nodejs";

const CATEGORIES = new Set(["HOC_TAP", "REN_LUYEN", "PHONG_TRAO", "KHAC"]);

/**
 * POST /api/hs3t/thanh-tich — đoàn viên thêm thành tích vào hồ sơ 3 tốt CỦA MÌNH
 *   { profileId?, title, category, sub?, evidenceNames?, achievedAt } → { ok, row }
 * - Hồ sơ luôn là hồ sơ của tài khoản đăng nhập; gửi profileId của người khác → 403.
 * - Nguồn luôn là "STUDENT"; trường bổ sung hộ (SCHOOL) và xét danh hiệu là
 *   thao tác cán bộ ở khu quản trị.
 * - Hồ sơ chỉ cộng thêm, không sửa/xoá thành tích qua API này.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  if (session.role !== "DOAN_VIEN") return fail("Chức năng này dành cho tài khoản đoàn viên.", 403);
  const body = await readBody(request);
  if (!body) return fail("Dữ liệu gửi lên không hợp lệ.");

  const title = str(body.title);
  const category = str(body.category);
  const sub = str(body.sub);
  const achievedAt = str(body.achievedAt) || new Date().toISOString().slice(0, 10);
  const evidenceRaw = body.evidenceNames ?? [];
  if (title.length < 5 || title.length > 500) return fail("Tên thành tích cần từ 5 đến 500 ký tự.");
  if (!CATEGORIES.has(category)) return fail("Nhóm tiêu chí không hợp lệ.");
  if (sub.length > 255) return fail("Tiêu chí phụ không hợp lệ.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(achievedAt) || Number.isNaN(Date.parse(achievedAt))) {
    return fail("Ngày đạt thành tích không hợp lệ.");
  }
  if (!Array.isArray(evidenceRaw) || evidenceRaw.length > 5 || evidenceRaw.some((e) => typeof e !== "string")) {
    return fail("Tối đa 5 tệp minh chứng mỗi thành tích.");
  }
  const evidenceNames = (evidenceRaw as string[]).map((e) => e.trim().slice(0, 255)).filter(Boolean);

  const profile = (
    await query<{ id: string }>("SELECT id FROM hs3t_profiles WHERE account_id = $1", [session.accountId])
  )[0];
  if (!profile) return fail("Chưa có hồ sơ 3 tốt — hãy mở lại trang Hồ sơ Học sinh 3 tốt.", 404);
  if (body.profileId !== undefined && body.profileId !== null && Number(body.profileId) !== Number(profile.id)) {
    return fail("Bạn chỉ được thêm thành tích vào hồ sơ của chính mình.", 403);
  }

  const limited = rateLimit(`hs3t:${session.accountId}`, 30, 10 * 60_000);
  if (limited) return limited;

  try {
    const rows = await query<Record<string, unknown>>(
      `INSERT INTO hs3t_achievements (profile_id, title, category, sub, evidence_names, achieved_at, added_by_role, added_by_account_id)
       VALUES ($1, $2, $3, $4, $5::text[], $6, 'STUDENT', $7) RETURNING *`,
      [profile.id, title, category, sub || null, evidenceNames, achievedAt, session.accountId],
    );
    return json({ ok: true, row: toObj("hs3tAchievements", rows[0]) });
  } catch (err) {
    return serverError("HS3T", err);
  }
}
