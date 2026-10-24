import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { hashPassword } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/reset-password
 * Tự động đặt lại mật khẩu cho cán bộ Đoàn cơ sở / Đoàn viên mà không cần liên hệ email trung ương
 * Body: { identifier: string (username hoặc email), newPassword: string }
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Hệ thống cơ sở dữ liệu đang không khả dụng." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { identifier?: string; newPassword?: string }
    | null;

  const identifier = String(body?.identifier ?? "").trim();
  const newPassword = String(body?.newPassword ?? "").trim();

  if (!identifier) {
    return NextResponse.json(
      { ok: false, error: "Vui lòng nhập tên đăng nhập hoặc email đơn vị." },
      { status: 400 },
    );
  }

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Mật khẩu mới bắt buộc và phải có ít nhất 6 ký tự." },
      { status: 400 },
    );
  }

  try {
    const rows = await query<{
      id: number;
      username: string;
      email: string;
      status: string;
    }>(
      `SELECT id, username, email, status
       FROM accounts
       WHERE (lower(username) = lower($1) OR lower(email) = lower($1))
         AND deleted_at IS NULL
       LIMIT 1`,
      [identifier],
    );

    const account = rows[0];
    if (!account) {
      return NextResponse.json(
        {
          ok: false,
          error: `Không tìm thấy tài khoản với tên đăng nhập hoặc email "${identifier}". Vui lòng kiểm tra lại.`,
        },
        { status: 404 },
      );
    }

    if (account.status === "DISABLED") {
      return NextResponse.json(
        {
          ok: false,
          error: "Tài khoản này đã bị vô hiệu hoá trên hệ thống. Vui lòng liên hệ ban quản trị.",
        },
        { status: 403 },
      );
    }

    const newHash = await hashPassword(newPassword);

    await query(
      `UPDATE accounts
       SET password_hash = $1,
           status = 'ACTIVE',
           failed_login_count = 0,
           locked_until = NULL,
           must_change_password = false,
           password_changed_at = now()
       WHERE id = $2`,
      [newHash, account.id],
    );

    return NextResponse.json({
      ok: true,
      username: account.username,
      message: `Đã đặt lại mật khẩu mới cho tài khoản "${account.username}" thành công!`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "RESET_PASSWORD_FAILED";
    console.warn("[TNTH][AUTH] Lỗi đặt lại mật khẩu:", msg);
    return NextResponse.json(
      { ok: false, error: "Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
