import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken, type RoleCode } from "@/lib/server/auth";

export const runtime = "nodejs";

const ALLOWED_ADMIN_ROLES: RoleCode[] = [
  "QUAN_TRI_TW",
  "QUAN_TRI_TINH",
  "QUAN_TRI_CAP3",
];

/** PATCH /api/accounts/[id] — đổi trạng thái tài khoản (ACTIVE/PENDING/LOCKED/DISABLED). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  try {
    const session = token ? await sessionFromToken(token) : null;
    if (!session) {
      return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });
    }
    if (!ALLOWED_ADMIN_ROLES.includes(session.role as RoleCode)) {
      return NextResponse.json(
        { ok: false, error: "BẠN KHÔNG CÓ QUYỀN THAY ĐỔI TRẠNG THÁI TÀI KHOẢN" },
        { status: 403 },
      );
    }
    const { id } = await params;
    const accountId = Number(id);
    const body = (await request.json().catch(() => null)) as { status?: string } | null;
    const status = String(body?.status ?? "");
    if (!accountId || !["PENDING", "ACTIVE", "LOCKED", "DISABLED"].includes(status)) {
      return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });
    }

    // Không cho phép tự khóa tài khoản của chính mình
    if (accountId === session.accountId) {
      return NextResponse.json(
        { ok: false, error: "KHÔNG THỂ TỰ THAY ĐỔI TRẠNG THÁI TÀI KHOẢN CỦA CHÍNH MÌNH" },
        { status: 400 },
      );
    }

    const targetAccounts = await query<{
      id: number;
      role_code: string;
      org_unit_id: number;
      username: string;
    }>(
      "SELECT id, role_code, org_unit_id, username FROM accounts WHERE id = $1 AND deleted_at IS NULL",
      [accountId],
    );
    const target = targetAccounts[0];
    if (!target) {
      return NextResponse.json({ ok: false, error: "KHÔNG TÌM THẤY TÀI KHOẢN" }, { status: 404 });
    }

    // Tài khoản gốc Trung ương (id=1, tw.admin) không thể bị khóa
    if (target.id === 1 && (status === "LOCKED" || status === "DISABLED")) {
      return NextResponse.json(
        { ok: false, error: "KHÔNG THỂ KHÓA TÀI KHOẢN QUẢN TRỊ TRUNG ƯƠNG TỐI CAO" },
        { status: 403 },
      );
    }

    // Chỉ QUAN_TRI_TW mới được chỉnh sửa tài khoản QUAN_TRI_TW
    if (target.role_code === "QUAN_TRI_TW" && session.role !== "QUAN_TRI_TW") {
      return NextResponse.json(
        { ok: false, error: "BẠN KHÔNG CÓ QUYỀN THAY ĐỔI TÀI KHOẢN CẤP TRUNG ƯƠNG" },
        { status: 403 },
      );
    }

    // Cấp tỉnh và cấp 3 chỉ được chỉnh sửa tài khoản thuộc phạm vi cây đơn vị của mình
    if (session.role !== "QUAN_TRI_TW") {
      if (session.role === "QUAN_TRI_CAP3" && target.role_code === "QUAN_TRI_TINH") {
        return NextResponse.json(
          { ok: false, error: "QUẢN TRỊ CẤP 3 KHÔNG THỂ THAY ĐỔI TÀI KHOẢN CẤP TỈNH" },
          { status: 403 },
        );
      }
      const callerUnits = await query<{ path: string }>(
        "SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL",
        [session.orgUnitId],
      );
      const targetUnits = await query<{ path: string }>(
        "SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL",
        [target.org_unit_id],
      );
      const callerPath = callerUnits[0]?.path;
      const targetPath = targetUnits[0]?.path;
      if (
        !callerPath ||
        !targetPath ||
        (!targetPath.startsWith(`${callerPath}.`) && target.org_unit_id !== session.orgUnitId)
      ) {
        return NextResponse.json(
          { ok: false, error: "TÀI KHOẢN NẰM NGOÀI PHẠM VI QUẢN LÝ CỦA BẠN" },
          { status: 403 },
        );
      }
    }

    const rows = await query<{ id: number }>(
      `UPDATE accounts SET status = $2, locked_until = NULL, failed_login_count = 0, updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [accountId, status],
    );
    if (!rows[0]) {
      return NextResponse.json({ ok: false, error: "KHÔNG TÌM THẤY TÀI KHOẢN" }, { status: 404 });
    }
    // Khoá/vô hiệu → thu hồi mọi phiên đăng nhập đang chạy
    if (status === "LOCKED" || status === "DISABLED") {
      await query(
        "UPDATE auth_sessions SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL",
        [accountId],
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ACCOUNT_UPDATE_FAILED";
    if (message === "DB_UNAVAILABLE") {
      return NextResponse.json({ ok: false, error: message }, { status: 503 });
    }
    console.warn("[TNTH][AUTH] Lỗi đổi trạng thái tài khoản:", message);
    return NextResponse.json({ ok: false, error: "ACCOUNT_UPDATE_FAILED" }, { status: 500 });
  }
}
