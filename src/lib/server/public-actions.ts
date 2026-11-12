import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken, type SessionDto } from "@/lib/server/auth";
import { retryAfterSeconds, recordAttempt } from "@/lib/server/rate-limit";

/**
 * Tiện ích chung cho API ghi của khách / người dùng cổng công khai
 * (phản ánh, điểm danh, thi trực tuyến). Các thao tác này KHÔNG đi qua
 * đồng bộ /api/store nữa: máy chủ tự kiểm tra, tự sinh mã / điểm / sự kiện
 * Trực tiếp rồi trả dòng (dạng client) để StoreProvider adoptServerRows.
 */

/** Client tối thiểu chạy được truy vấn — pool hoặc client của withTransaction */
export interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
}

/** Phiên đăng nhập (nếu có) từ cookie — lỗi DB coi như khách */
export async function requestSession(request: NextRequest): Promise<SessionDto | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return sessionFromToken(token).catch(() => null);
}

export function jsonError(status: number, error: string, retryAfter?: number) {
  return NextResponse.json(
    { ok: false, error },
    { status, headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined },
  );
}

/** Lỗi nghiệp vụ có mã HTTP — route bắt và trả JSON { ok:false, error } */
export class PublicActionError extends Error {
  readonly status: number;
  readonly retryAfter?: number;
  constructor(message: string, status = 400, retryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/** Đổi lỗi ném ra trong route thành phản hồi JSON (lỗi lạ → 500, ghi log) */
export function errorResponse(err: unknown, tag: string) {
  if (err instanceof PublicActionError) return jsonError(err.status, err.message, err.retryAfter);
  if (err instanceof Error && err.message === "DB_UNAVAILABLE") {
    return jsonError(503, "Cơ sở dữ liệu chưa sẵn sàng, vui lòng thử lại sau.");
  }
  console.error(`[TNTH][${tag}]`, err instanceof Error ? err.message : err);
  return jsonError(500, "Máy chủ gặp lỗi, vui lòng thử lại sau.");
}

/**
 * Giới hạn tần suất trong bộ nhớ: chạm ngưỡng thì ném 429, chưa thì đếm thêm 1 lần.
 * Khoá do nơi gọi đặt (email, tài khoản, mã…) — KHÔNG dùng IP (qua OneShield không phải IP thật).
 */
export function enforceRate(key: string, max: number, windowMs: number, message: string) {
  const wait = retryAfterSeconds(key, max);
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60);
    throw new PublicActionError(`${message} Vui lòng thử lại sau ${minutes} phút.`, 429, wait);
  }
  recordAttempt(key, windowMs);
}

/** Đọc 1 giá trị cấu hình hệ thống (system_settings) — không có thì trả null */
export async function readSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string | null }>(
    "SELECT value FROM system_settings WHERE setting_key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

/** Danh sách id hoạt động đang mở điểm danh (setting attendance_open_ids, phân tách dấu phẩy) */
export async function attendanceOpenIds(): Promise<number[]> {
  const raw = (await readSetting("attendance_open_ids")) ?? "";
  return raw
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export type LiveEventType =
  | "ACTIVITY_SUBMITTED" | "ACTIVITY_CONFIRMED" | "TASK_RESULT"
  | "TASK_ASSIGNED" | "ATTENDANCE" | "REPORT_CREATED" | "FEEDBACK_NEW";

/** Ghi 1 sự kiện "Trực tiếp" — do máy chủ sinh, khách không ghi live_events được */
export async function insertLiveEvent(
  client: Queryable,
  orgUnitId: number,
  eventType: LiveEventType,
  title: string,
): Promise<void> {
  await client.query(
    "INSERT INTO live_events (org_unit_id, event_type, title) VALUES ($1, $2, $3)",
    [orgUnitId, eventType, title.slice(0, 500)],
  );
}

/** Chuỗi bắt buộc: cắt khoảng trắng, kiểm tra độ dài — sai thì ném 400 với nhãn trường */
export function requiredText(value: unknown, label: string, min: number, max: number): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length < min) {
    throw new PublicActionError(
      min <= 1 ? `Vui lòng nhập ${label}.` : `${label} cần ít nhất ${min} ký tự.`,
    );
  }
  if (s.length > max) throw new PublicActionError(`${label} tối đa ${max} ký tự.`);
  return s;
}

/** Chuỗi tuỳ chọn: rỗng → null; quá dài → 400 */
export function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new PublicActionError(`${label} không hợp lệ.`);
  const s = value.trim();
  if (!s) return null;
  if (s.length > max) throw new PublicActionError(`${label} tối đa ${max} ký tự.`);
  return s;
}
