import { NextResponse, type NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import { fail, json, requireSession, serverError } from "@/lib/server/member-write";

export const runtime = "nodejs";

/**
 * POST /api/hs3t/ho-so — lấy hoặc tạo hồ sơ Học sinh 3 tốt của CHÍNH người đăng nhập
 *   (không nhận tham số) → { ok, row, created }
 * - Idempotent: mỗi tài khoản 1 hồ sơ (UNIQUE account_id) — gọi lại trả hồ sơ cũ.
 * - Mã HS3T-<năm>-<số> cấp tuần tự ở máy chủ (khoá tư vấn để 2 người tạo cùng lúc không trùng mã).
 * - Chỉ dành cho đoàn viên; hồ sơ của cán bộ / xét danh hiệu làm ở khu quản trị.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  if (session.role !== "DOAN_VIEN") return fail("Hồ sơ Học sinh 3 tốt chỉ dành cho tài khoản đoàn viên.", 403);

  try {
    const result = await withTransaction(async (client) => {
      const found = await client.query("SELECT * FROM hs3t_profiles WHERE account_id = $1", [session.accountId]);
      if (found.rows[0]) return { row: found.rows[0] as Record<string, unknown>, created: false };

      await client.query("SELECT pg_advisory_xact_lock(hashtext('tnth:hs3t_profile_code'))");
      const max = await client.query(
        `SELECT COALESCE(MAX((substring(code FROM '^HS3T-[0-9]{4}-([0-9]+)$'))::bigint), 1000) AS n FROM hs3t_profiles`,
      );
      const code = `HS3T-${new Date().getFullYear()}-${Number(max.rows[0]?.n ?? 1000) + 1}`;
      const ins = await client.query(
        `INSERT INTO hs3t_profiles (code, account_id, student_name, school_org_unit_id)
         VALUES ($1, $2, $3, $4) ON CONFLICT (account_id) DO NOTHING RETURNING *`,
        [code, session.accountId, session.contactPerson.slice(0, 150), session.orgUnitId],
      );
      if (ins.rows[0]) return { row: ins.rows[0] as Record<string, unknown>, created: true };
      // Một yêu cầu khác của cùng tài khoản vừa tạo xong → trả hồ sơ đó
      const again = await client.query("SELECT * FROM hs3t_profiles WHERE account_id = $1", [session.accountId]);
      return { row: again.rows[0] as Record<string, unknown>, created: false };
    });
    return json({ ok: true, row: toObj("hs3tProfiles", result.row), created: result.created });
  } catch (err) {
    return serverError("HS3T", err);
  }
}
