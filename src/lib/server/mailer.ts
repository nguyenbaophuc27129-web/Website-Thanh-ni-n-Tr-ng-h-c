import nodemailer from "nodemailer";

/** Gửi email qua SMTP cấu hình trong .env.production (SMTP_HOST/PORT/USER/PASS, MAIL_FROM). */

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(to: string, subject: string, text: string): Promise<string> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP_NOT_CONFIGURED");
  const port = Number(process.env.SMTP_PORT ?? 465);
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
    text,
  });
  return info.messageId;
}
