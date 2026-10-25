import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query, withTransaction } from "@/lib/db";
import { hashPassword } from "@/lib/server/auth";
import { sendMail, smtpConfigured } from "@/lib/server/mailer";
import { recordAttempt, retryAfterSeconds } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const CODE_TTL_MINUTES = 10;
const MAX_CODE_FAILS = 5;
const REQUEST_LIMIT = 3;
const REQUEST_WINDOW_MS = 15 * 60_000;
const RESEND_COOLDOWN_SECONDS = 60;

/** Câu trả lời chung cho bước gửi mã — không tiết lộ tài khoản có tồn tại hay không */
const SENT_MESSAGE =
  "Nếu tài khoản tồn tại, mã xác nhận 6 số đã được gửi tới email đăng ký của tài khoản. Mã có hiệu lực trong 10 phút.";
const BAD_CODE = "Mã xác nhận không đúng hoặc đã hết hạn.";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function findAccount(identifier: string) {
  const rows = await query<{ id: number; username: string; email: string; status: string }>(
    `SELECT id, username, email, status
     FROM accounts
     WHERE (lower(username) = lower($1) OR lower(email) = lower($1))
       AND deleted_at IS NULL
     LIMIT 1`,
    [identifier],
  );
  const account = rows[0];
  return account && account.status !== "DISABLED" ? account : null;
}

/**
 * POST /api/auth/reset-password — đặt lại mật khẩu qua mã xác nhận gửi email.
 * Bước 1: { action: "request", identifier }                 → gửi mã 6 số tới email của tài khoản
 * Bước 2: { action: "confirm", identifier, code, newPassword } → đúng mã thì đổi mật khẩu,
 *         thu hồi mọi phiên đăng nhập đang chạy.
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) return fail("Hệ thống cơ sở dữ liệu đang không khả dụng.", 503);
  if (!smtpConfigured()) {
    return fail(
      "Chức năng đặt lại mật khẩu qua email chưa được kích hoạt. Vui lòng liên hệ quản trị đơn vị cấp trên.",
      503,
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: string; identifier?: string; code?: string; newPassword?: string }
    | null;
  const action = String(body?.action ?? "");
  const identifier = String(body?.identifier ?? "").trim();
  if (!identifier) return fail("Vui lòng nhập tên đăng nhập hoặc email đơn vị.", 400);

  try {
    if (action === "request") {
      const limitKey = `reset-request:${identifier.toLowerCase()}`;
      const wait = retryAfterSeconds(limitKey, REQUEST_LIMIT);
      if (wait > 0) {
        return fail(`Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(wait / 60)} phút.`, 429);
      }
      recordAttempt(limitKey, REQUEST_WINDOW_MS);

      const account = await findAccount(identifier);
      if (!account) return NextResponse.json({ ok: true, message: SENT_MESSAGE });

      const recent = await query<{ id: number }>(
        `SELECT id FROM password_reset_codes
         WHERE account_id = $1 AND created_at > now() - ($2 || ' seconds')::interval
         LIMIT 1`,
        [account.id, String(RESEND_COOLDOWN_SECONDS)],
      );
      if (recent.length > 0) return NextResponse.json({ ok: true, message: SENT_MESSAGE });

      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      await withTransaction(async (client) => {
        await client.query(
          "UPDATE password_reset_codes SET used_at = now() WHERE account_id = $1 AND used_at IS NULL",
          [account.id],
        );
        await client.query(
          `INSERT INTO password_reset_codes (account_id, code_hash, expires_at)
           VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
          [account.id, sha256(code), String(CODE_TTL_MINUTES)],
        );
      });
      await sendMail(
        account.email,
        "Mã xác nhận đặt lại mật khẩu - Cổng Thanh niên Trường học",
        [
          `Xin chào ${account.username},`,
          "",
          `Mã xác nhận đặt lại mật khẩu của bạn là: ${code}`,
          `Mã có hiệu lực trong ${CODE_TTL_MINUTES} phút và chỉ dùng được một lần.`,
          "",
          "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên.",
        ].join("\n"),
      );
      return NextResponse.json({ ok: true, message: SENT_MESSAGE });
    }

    if (action === "confirm") {
      const code = String(body?.code ?? "").trim();
      const newPassword = String(body?.newPassword ?? "").trim();
      if (!/^\d{6}$/.test(code)) return fail("Mã xác nhận gồm 6 chữ số.", 400);
      if (newPassword.length < 6) return fail("Mật khẩu mới bắt buộc và phải có ít nhất 6 ký tự.", 400);

      const account = await findAccount(identifier);
      if (!account) return fail(BAD_CODE, 400);

      const codes = await query<{ id: number; code_hash: string; failed_attempts: number }>(
        `SELECT id, code_hash, failed_attempts FROM password_reset_codes
         WHERE account_id = $1 AND used_at IS NULL AND expires_at > now()
         ORDER BY created_at DESC
         LIMIT 1`,
        [account.id],
      );
      const pending = codes[0];
      if (!pending || pending.failed_attempts >= MAX_CODE_FAILS) return fail(BAD_CODE, 400);

      const given = Buffer.from(sha256(code), "hex");
      const expected = Buffer.from(pending.code_hash, "hex");
      if (!timingSafeEqual(given, expected)) {
        await query(
          `UPDATE password_reset_codes
           SET failed_attempts = failed_attempts + 1,
               used_at = CASE WHEN failed_attempts + 1 >= $2 THEN now() ELSE used_at END
           WHERE id = $1`,
          [pending.id, MAX_CODE_FAILS],
        );
        return fail(BAD_CODE, 400);
      }

      const newHash = await hashPassword(newPassword);
      await withTransaction(async (client) => {
        await client.query("UPDATE password_reset_codes SET used_at = now() WHERE id = $1", [pending.id]);
        await client.query(
          `UPDATE accounts
           SET password_hash = $1, failed_login_count = 0, locked_until = NULL,
               must_change_password = false, password_changed_at = now(), updated_at = now()
           WHERE id = $2`,
          [newHash, account.id],
        );
        await client.query(
          "UPDATE auth_sessions SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL",
          [account.id],
        );
      });
      return NextResponse.json({
        ok: true,
        username: account.username,
        message: `Đã đặt lại mật khẩu cho tài khoản "${account.username}" thành công!`,
      });
    }

    return fail("Yêu cầu không hợp lệ.", 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "RESET_PASSWORD_FAILED";
    console.warn("[TNTH][AUTH] Lỗi đặt lại mật khẩu:", msg);
    return fail("Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại sau.", 500);
  }
}
