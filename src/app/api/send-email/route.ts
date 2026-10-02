import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/send-email — gửi email thật qua SMTP cấu hình trong .env.local */
export async function POST(request: Request) {
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

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return NextResponse.json(
      { ok: false, error: "SMTP_NOT_CONFIGURED — chưa điền SMTP_HOST/SMTP_USER/SMTP_PASS trong .env.local" },
      { status: 503 }
    );
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM?.trim() || user,
      to,
      subject,
      text: body,
    });
    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SEND_FAILED";
    console.error("[TNTH][SMTP] Lỗi gửi email:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
