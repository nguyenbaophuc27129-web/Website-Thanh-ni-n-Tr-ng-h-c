import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import {
  SESSION_COOKIE,
  hashPassword,
  sessionFromToken,
  type RoleCode,
} from "@/lib/server/auth";

export const runtime = "nodejs";

const VALID_ROLES: RoleCode[] = [
  "QUAN_TRI_TW",
  "QUAN_TRI_TINH",
  "QUAN_TRI_CAP3",
  "DON_VI",
  "BIEN_TAP_VIEN",
  "DOAN_VIEN",
];

/** POST /api/accounts — quản trị tạo tài khoản (trang Hệ thống › Tài khoản, kèm nhập file). */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  try {
    const session = token ? await sessionFromToken(token) : null;
    if (!session) {
      return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });
    }
    const body = (await request.json().catch(() => null)) as
      | {
          accounts?: {
            orgUnitId?: number;
            username?: string;
            email?: string;
            phone?: string;
            contactPerson?: string;
            contactPosition?: string;
            className?: string;
            role?: string;
            status?: string;
            password?: string;
          }[];
        }
      | null;
    const inputs = body?.accounts ?? [];
    if (inputs.length === 0) {
      return NextResponse.json({ ok: false, error: "KHÔNG CÓ TÀI KHOẢN NÀO" }, { status: 400 });
    }
    const created: number[] = [];
    const errors: { username: string; error: string }[] = [];
    for (const input of inputs) {
      const username = String(input.username ?? "").trim();
      const email = String(input.email ?? "").trim();
      const orgUnitId = Number(input.orgUnitId);
      const role = String(input.role ?? "") as RoleCode;
      const password = String(input.password ?? "").trim() || "demo123";
      try {
        if (!username || !email || !orgUnitId || !VALID_ROLES.includes(role)) {
          throw new Error("Thiếu thông tin hoặc vai trò không hợp lệ.");
        }
        const units = await query<{ org_level: number }>(
          "SELECT org_level FROM org_units WHERE id = $1 AND deleted_at IS NULL",
          [orgUnitId],
        );
        const orgLevel = units[0]?.org_level;
        if (!orgLevel) throw new Error("Đơn vị không tồn tại.");
        if (orgLevel >= 2) {
          // Quy tắc chốt: đơn vị cơ sở chỉ 01 tài khoản dùng chung (trừ đoàn viên cá nhân)
          const taken = await query<{ id: number }>(
            "SELECT id FROM accounts WHERE org_unit_id = $1 AND deleted_at IS NULL AND role_code <> 'DOAN_VIEN' LIMIT 1",
            [orgUnitId],
          );
          if (taken[0]) {
            throw new Error("Đơn vị cơ sở chỉ có 01 tài khoản dùng chung.");
          }
        }
        const dup = await query<{ id: number }>(
          "SELECT id FROM accounts WHERE (username = $1 OR email = $2) AND deleted_at IS NULL LIMIT 1",
          [username, email],
        );
        if (dup[0]) throw new Error("Tên đăng nhập hoặc email đã tồn tại.");
        const passwordHash = await hashPassword(password);
        const status = ["PENDING", "ACTIVE", "LOCKED", "DISABLED"].includes(
          String(input.status ?? "ACTIVE"),
        )
          ? String(input.status ?? "ACTIVE")
          : "ACTIVE";
        const rows = await query<{ id: number }>(
          `INSERT INTO accounts (org_unit_id, username, email, phone, password_hash, contact_person,
             contact_position, class_name, status, role_code, must_change_password, password_changed_at)
           OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, now())
           RETURNING id`,
          [
            orgUnitId,
            username,
            email,
            input.phone?.trim() || null,
            passwordHash,
            input.contactPerson?.trim() || username,
            input.contactPosition?.trim() || null,
            input.className?.trim() || null,
            status,
            role,
          ],
        );
        created.push(Number(rows[0].id));
      } catch (e) {
        errors.push({ username: username || "?", error: e instanceof Error ? e.message : "Lỗi" });
      }
    }
    if (created.length > 0) {
      await query(
        "SELECT setval(pg_get_serial_sequence('accounts', 'id'), (SELECT max(id) FROM accounts))",
      );
    }
    return NextResponse.json({ ok: errors.length === 0, created, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ACCOUNT_CREATE_FAILED";
    if (message === "DB_UNAVAILABLE") {
      return NextResponse.json({ ok: false, error: message }, { status: 503 });
    }
    console.warn("[TNTH][AUTH] Lỗi tạo tài khoản:", message);
    return NextResponse.json({ ok: false, error: "ACCOUNT_CREATE_FAILED" }, { status: 500 });
  }
}
