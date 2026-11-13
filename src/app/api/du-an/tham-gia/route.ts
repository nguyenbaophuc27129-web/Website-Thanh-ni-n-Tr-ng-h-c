import { type NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken, type SessionDto } from "@/lib/server/auth";
import { verifyGoogleCredential } from "@/lib/server/google-verify";
import { fail, json, rateLimit, readBody, serverError, str } from "@/lib/server/member-write";

export const runtime = "nodejs";

/**
 * Cán bộ được xem danh sách người tham gia (họ tên, email, SĐT) của dự án:
 * - Quản trị TW: mọi dự án.
 * - Cán bộ khác: chỉ dự án thuộc đơn vị mình hoặc đơn vị cấp dưới.
 * Dự án khách gửi bằng Gmail (org_unit_id NULL) chỉ Quản trị TW xem.
 */
async function canViewParticipants(session: SessionDto | null, projectOrgUnitId: number | null): Promise<boolean> {
  if (!session || session.role === "DOAN_VIEN") return false;
  if (session.role === "QUAN_TRI_TW") return true;
  if (projectOrgUnitId === null) return false;
  const rows = await query<{ ok: number }>(
    `SELECT 1 ok FROM org_units o, org_units me
      WHERE me.id = $1 AND o.id = $2 AND o.path LIKE me.path || '%' LIMIT 1`,
    [session.orgUnitId, projectOrgUnitId],
  );
  return rows.length > 0;
}

/**
 * GET /api/du-an/tham-gia?projectId=123
 * Trả về số lượng đoàn viên đăng ký tham gia dự án; người đăng nhập biết mình đã đăng ký chưa;
 * cán bộ trong phạm vi được xem danh sách chi tiết.
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const projectId = Number(sp.get("projectId")) || 0;
  if (!projectId) return fail("Thiếu mã dự án.");

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token).catch(() => null) : null;

  try {
    const proj = (await query<{ id: number; participants: number; org_unit_id: number | null; status: string }>(
      "SELECT id, participants, org_unit_id, status FROM volunteer_projects WHERE id = $1",
      [projectId]
    ))[0];
    const isManager = proj ? await canViewParticipants(session, proj.org_unit_id === null ? null : Number(proj.org_unit_id)) : false;
    // Dự án chưa duyệt chỉ cán bộ trong phạm vi được biết
    if (!proj || (proj.status !== "APPROVED" && !isManager)) return fail("Dự án không tồn tại.", 404);

    const countRows = await query<{ c: string }>(
      "SELECT count(*) c FROM volunteer_project_participants WHERE project_id = $1 AND status <> 'CANCELLED'",
      [projectId]
    );

    // Chỉ kiểm tra theo email của chính tài khoản đang đăng nhập (không nhận email tuỳ ý qua tham số)
    let userRegistered = false;
    const myEmail = session?.email?.trim().toLowerCase() || "";
    if (session) {
      const reg = await query<{ id: number }>(
        `SELECT id FROM volunteer_project_participants
          WHERE project_id = $1 AND (account_id = $2 OR ($3 <> '' AND lower(email) = $3)) LIMIT 1`,
        [projectId, session.accountId, myEmail]
      );
      userRegistered = reg.length > 0;
    }

    let participants: Array<{ id: number; fullName: string; email: string; phone?: string; schoolName?: string; note?: string; createdAt: string }> = [];
    if (isManager) {
      const rows = await query<{
        id: number;
        full_name: string;
        email: string;
        phone: string | null;
        school_name: string | null;
        note: string | null;
        created_at: string;
      }>(
        "SELECT id, full_name, email, phone, school_name, note, created_at FROM volunteer_project_participants WHERE project_id = $1 ORDER BY created_at DESC",
        [projectId]
      );
      participants = rows.map((r) => ({
        id: Number(r.id),
        fullName: r.full_name,
        email: r.email,
        phone: r.phone ?? undefined,
        schoolName: r.school_name ?? undefined,
        note: r.note ?? undefined,
        createdAt: r.created_at,
      }));
    }

    return json({
      ok: true,
      projectId,
      totalParticipants: Number(proj.participants),
      registeredCount: Number(countRows[0]?.c ?? 0),
      registered: userRegistered,
      participants: isManager ? participants : undefined,
    });
  } catch (err) {
    return serverError("THAM-GIA-DU-AN-GET", err);
  }
}

/**
 * POST /api/du-an/tham-gia
 * Đoàn viên đăng ký tham gia dự án tình nguyện (chỉ dự án đã duyệt):
 * - Xác thực bằng Google Gmail (credential) HOẶC tài khoản đang đăng nhập (session).
 * - Không bắt buộc đăng ký tài khoản nội bộ.
 * - Không cộng vào `participants` của dự án (số người tham gia do đơn vị tự khai);
 *   số đăng ký qua cổng đếm riêng từ bảng volunteer_project_participants.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token).catch(() => null) : null;

  const body = await readBody(request);
  if (!body) return fail("Dữ liệu gửi lên không hợp lệ.");

  const projectId = Number(body.projectId) || 0;
  if (!projectId) return fail("Vui lòng chọn dự án muốn tham gia.");

  let accountId: number | null = null;
  let email: string | null = null;
  let defaultName = "";

  if (session) {
    accountId = session.accountId;
    // username tài khoản nội bộ không phải email → dùng email tài khoản
    email = session.email?.trim().toLowerCase() || null;
    defaultName = session.contactPerson ?? "";
    if (!email) return fail("Tài khoản chưa có email — vui lòng cập nhật email trước khi đăng ký tham gia.");
  } else {
    const cred = str(body.credential);
    const googleUser = cred ? await verifyGoogleCredential(cred) : null;
    if (!googleUser) {
      return json(
        { ok: false, error: "Cần xác thực Google Gmail để đăng ký tham gia — không cần tạo tài khoản.", needAuth: true },
        401
      );
    }
    email = googleUser.email.toLowerCase();
    defaultName = googleUser.name ?? "";
  }

  const fullName = (str(body.fullName) || defaultName).trim().slice(0, 255);
  if (!fullName) return fail("Vui lòng điền họ và tên.");

  const phone = str(body.phone).slice(0, 20) || null;
  if (phone && !/^[0-9+()\s.\-]{8,20}$/.test(phone)) return fail("Số điện thoại không hợp lệ.");

  const schoolName = str(body.schoolName).slice(0, 255) || null;
  const note = str(body.note).slice(0, 1000) || null;

  const limited = rateLimit(`tham-gia:${email}`, 10, 5 * 60_000);
  if (limited) return limited;

  try {
    const proj = (await query<{ id: number; status: string }>(
      "SELECT id, status FROM volunteer_projects WHERE id = $1",
      [projectId]
    ))[0];
    if (!proj || proj.status !== "APPROVED") return fail("Dự án không tồn tại hoặc chưa được duyệt.", 404);

    const dup = await query<{ id: number }>(
      "SELECT id FROM volunteer_project_participants WHERE project_id = $1 AND lower(email) = lower($2) LIMIT 1",
      [projectId, email]
    );
    if (dup.length > 0) {
      return json({
        ok: true,
        alreadyRegistered: true,
        message: "Bạn đã đăng ký tham gia dự án này rồi. Đơn vị phụ trách dự án sẽ liên hệ với bạn!",
      });
    }

    await withTransaction(async (client) => {
      // ON CONFLICT: hai yêu cầu cùng lúc với cùng email không làm lỗi 500 (đã có chỉ mục duy nhất project_id + lower(email))
      await client.query(
        `INSERT INTO volunteer_project_participants (project_id, account_id, email, full_name, phone, school_name, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (project_id, lower(email)) DO NOTHING`,
        [projectId, accountId, email, fullName, phone, schoolName, note]
      );
    });

    return json({
      ok: true,
      message: "Đăng ký tham gia dự án thành công! Thông tin của bạn đã được ghi nhận trên cổng.",
    });
  } catch (err) {
    return serverError("THAM-GIA-DU-AN-POST", err);
  }
}
