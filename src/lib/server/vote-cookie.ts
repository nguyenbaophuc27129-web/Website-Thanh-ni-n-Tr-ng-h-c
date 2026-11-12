import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Cookie "Gmail đã xác thực" của bình chọn HS3T (khách không có tài khoản).
 * Giá trị = base64url(email) + "." + HMAC-SHA256 — người dùng không tự sửa được thành
 * Gmail của người khác (trước đây cookie chứa email trần → giả mạo để xem/xoá bài người khác).
 * Khoá: VOTE_COOKIE_SECRET trong .env.production. Chưa cấu hình → không đặt, không tin cookie.
 */

const COOKIE = "tnth_vote_email";

function secret(): string | null {
  const s = process.env.VOTE_COOKIE_SECRET ?? "";
  return s.length >= 32 ? s : null;
}

function mac(key: string, payload: string): string {
  return createHmac("sha256", key).update(`tnth-vote-email:${payload}`).digest("base64url");
}

/** Gmail đã xác thực từ cookie có chữ ký hợp lệ; sai/thiếu chữ ký → "" */
export function readVoteEmail(request: NextRequest): string {
  const key = secret();
  const raw = request.cookies.get(COOKIE)?.value ?? "";
  if (!key || !raw) return "";
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return "";
  const payload = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(mac(key, payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return "";
  try {
    return Buffer.from(payload, "base64url").toString("utf8").trim().toLowerCase();
  } catch {
    return "";
  }
}

/** Đặt cookie Gmail đã xác thực (đã ký) vào response */
export function setVoteEmail(res: NextResponse, email: string, maxAgeSeconds: number): void {
  const key = secret();
  if (!key) return;
  const payload = Buffer.from(email.trim().toLowerCase(), "utf8").toString("base64url");
  res.cookies.set(COOKIE, `${payload}.${mac(key, payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}
