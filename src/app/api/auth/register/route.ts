import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { hashPassword } from "@/lib/server/auth";

export const runtime = "nodejs";

/** POST /api/auth/register — đăng ký đoàn viên (công khai) → tạo tài khoản ACTIVE, role DOAN_VIEN. */
export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as
    | {
        username?: string;
        password?: string;
        email?: string;
        fullName?: string;
        position?: string;
        className?: string;
        orgUnitId?: number;
      }
    | null;
  const username = String(payload?.username ?? "").trim();
  const password = String(payload?.password ?? "");
  const email = String(payload?.email ?? "").trim();
  const orgUnitId = Number(payload?.orgUnitId);
  if (!username || !password || !email || !orgUnitId) {
    return NextResponse.json({ ok: false, error: "Thiếu thông tin đăng ký." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Mật khẩu cần ít nhất 6 ký tự." },
      { status: 400 },
    );
  }
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  try {
    const units = await query<{ id: number; org_level: number; name: string }>(
      "SELECT id, org_level, name FROM org_units WHERE id = $1 AND deleted_at IS NULL AND is_active",
      [orgUnitId],
    );
    const unit = units[0];
    if (!unit) {
      return NextResponse.json({ ok: false, error: "Đơn vị không hợp lệ." }, { status: 400 });
    }
    // Đoàn viên cá nhân chỉ thuộc đơn vị cơ sở (cấp 4 — trường)
    if (unit.org_level !== 4) {
      return NextResponse.json(
        { ok: false, error: "Tài khoản đoàn viên chỉ đăng ký theo trường/đơn vị cơ sở." },
        { status: 400 },
      );
    }
    const dup = await query<{ id: number }>(
      "SELECT id FROM accounts WHERE (username = $1 OR email = $2) AND deleted_at IS NULL LIMIT 1",
      [username, email],
    );
    if (dup[0]) {
      return NextResponse.json(
        { ok: false, error: "Tên đăng nhập hoặc email đã tồn tại." },
        { status: 409 },
      );
    }
    const passwordHash = await hashPassword(password);
    const rows = await query<{ id: number }>(
      `INSERT INTO accounts (org_unit_id, username, email, password_hash, contact_person,
         contact_position, status, role_code, class_name, must_change_password, password_changed_at)
       OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', 'DOAN_VIEN', $7, false, now())
       RETURNING id`,
      [
        orgUnitId,
        username,
        email,
        passwordHash,
        String(payload?.fullName ?? username).trim() || username,
        String(payload?.position ?? "Đoàn viên").trim() || "Đoàn viên",
        payload?.className?.trim() || null,
      ],
    );
    await query(
      "SELECT setval(pg_get_serial_sequence('accounts', 'id'), (SELECT max(id) FROM accounts))",
    );
    return NextResponse.json({ ok: true, accountId: Number(rows[0].id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "REGISTER_FAILED";
    if (message === "DB_UNAVAILABLE") {
      return NextResponse.json({ ok: false, error: message }, { status: 503 });
    }
    console.warn("[TNTH][AUTH] Lỗi đăng ký:", message);
    return NextResponse.json({ ok: false, error: "REGISTER_FAILED" }, { status: 500 });
  }
}
