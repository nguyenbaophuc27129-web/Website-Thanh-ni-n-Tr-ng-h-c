import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";

export const runtime = "nodejs";

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
    const { id } = await params;
    const accountId = Number(id);
    const body = (await request.json().catch(() => null)) as { status?: string } | null;
    const status = String(body?.status ?? "");
    if (!accountId || !["PENDING", "ACTIVE", "LOCKED", "DISABLED"].includes(status)) {
      return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });
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
