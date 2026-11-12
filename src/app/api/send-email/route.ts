import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { sendMail, smtpConfigured } from "@/lib/server/mailer";
import { recordAttempt, retryAfterSeconds } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS_PER_HOUR = 50;

/** POST /api/send-email — gửi email thật qua SMTP cấu hình trong .env.production.
 *  Chỉ cán bộ đã đăng nhập (không phải đoàn viên) được gọi, và chỉ gửi tới email người gửi
 *  phản ánh có trong DB — tránh biến hộp thư đơn vị thành chỗ gửi thư tuỳ ý. */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token).catch(() => null) : null;
  if (!session) {
    return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });
  }
  if (session.role === "DOAN_VIEN") {
    return NextResponse.json({ ok: false, error: "BẠN KHÔNG CÓ QUYỀN GỬI EMAIL" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { to?: string; subject?: string; body?: string }
    | null;
  const to = payload?.to?.trim();
  const subject = payload?.subject?.trim();
  const body = payload?.body ?? "";

  if (!to || !subject || !body) {
    return NextResponse.json({ ok: false, error: "Thiếu to/subject/body." }, { status: 400 });
  }
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json({ ok: false, error: "Địa chỉ email người nhận không hợp lệ." }, { status: 400 });
  }

  if (!smtpConfigured()) {
    return NextResponse.json(
      { ok: false, error: "SMTP_NOT_CONFIGURED — chưa điền SMTP_HOST/SMTP_USER/SMTP_PASS trong .env.local" },
      { status: 503 }
    );
  }

  try {
    const known = await query<{ found: number }>(
      "SELECT 1 AS found FROM feedbacks WHERE sender_email = $1 LIMIT 1",
      [to],
    );
    if (known.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Chỉ gửi được email tới người gửi phản ánh có trong hệ thống." },
        { status: 403 },
      );
    }
    const limitKey = `send-email:${session.accountId}`;
    if (retryAfterSeconds(limitKey, MAX_EMAILS_PER_HOUR) > 0) {
      return NextResponse.json({ ok: false, error: "Đã gửi quá nhiều email, vui lòng thử lại sau." }, { status: 429 });
    }
    recordAttempt(limitKey, 60 * 60_000);

    const messageId = await sendMail(to, subject, body);
    return NextResponse.json({ ok: true, messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SEND_FAILED";
    console.error("[TNTH][SMTP] Lỗi gửi email:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
