import { NextResponse, type NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { verifyGoogleCredential } from "@/lib/server/google-verify";
import { fail, json, rateLimit, readBody, serverError, str } from "@/lib/server/member-write";

export const runtime = "nodejs";

/**
 * GET /api/du-an/tham-gia?projectId=123
 * Trả về danh sách/số lượng đoàn viên đăng ký tham gia dự án.
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const projectId = Number(sp.get("projectId")) || 0;
  if (!projectId) return fail("Thiếu mã dự án.");

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token).catch(() => null) : null;
  const emailParam = sp.get("email")?.toLowerCase().trim() || "";

  try {
    const proj = (await query<{ id: number; project_name: string; participants: number }>(
      "SELECT id, project_name, participants FROM volunteer_projects WHERE id = $1",
      [projectId]
    ))[0];
    if (!proj) return fail("Dự án không tồn tại.", 404);

    // Kiểm tra người dùng hiện tại đã đăng ký chưa
    let userRegistered = false;
    const checkEmail = session?.username || emailParam;
    if (checkEmail) {
      const reg = await query<{ id: number }>(
        "SELECT id FROM volunteer_project_participants WHERE project_id = $1 AND lower(email) = lower($2) LIMIT 1",
        [projectId, checkEmail]
      );
      userRegistered = reg.length > 0;
    }

    // Nếu là cán bộ quản trị hoặc đăng nhập xem chi tiết, trả danh sách tham gia
    const isManager = session && session.role !== "DOAN_VIEN";
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
      totalParticipants: proj.participants,
      registered: userRegistered,
      participants: isManager ? participants : undefined,
    });
  } catch (err) {
    return serverError("THAM-GIA-DU-AN-GET", err);
  }
}

/**
 * POST /api/du-an/tham-gia
 * Đoàn viên đăng ký tham gia dự án tình nguyện:
 * - Xác thực bằng Google Gmail (credential) HOẶC tài khoản Đoàn viên (session).
 * - Không bắt buộc đăng ký tài khoản nội bộ.
 * - Khi đoàn viên tạo tài khoản trên cổng sau này bằng Gmail đó, hệ thống tự động cộng điểm bù.
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
    email = session.username;
    defaultName = session.contactPerson ?? "";
  } else {
    const cred = str(body.credential);
    const googleUser = cred ? await verifyGoogleCredential(cred) : null;
    if (!googleUser) {
      return json(
        { ok: false, error: "Cần xác thực Google Gmail để đăng ký tham gia — không cần tạo tài khoản.", needAuth: true },
        401
      );
    }
    email = googleUser.email;
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
    const proj = (await query<{ id: number; project_name: string; status: string }>(
      "SELECT id, project_name, status FROM volunteer_projects WHERE id = $1",
      [projectId]
    ))[0];
    if (!proj) return fail("Dự án không tồn tại.", 404);

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
      await client.query(
        `INSERT INTO volunteer_project_participants (project_id, account_id, email, full_name, phone, school_name, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [projectId, accountId, email, fullName, phone, schoolName, note]
      );
      // Tăng số lượng đoàn viên tham gia trên dự án
      await client.query(
        "UPDATE volunteer_projects SET participants = participants + 1, updated_at = now() WHERE id = $1",
        [projectId]
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
