import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import {
  SESSION_COOKIE,
  hashPassword,
  sessionFromToken,
  type RoleCode,
} from "@/lib/server/auth";
import { ACCOUNT_ADMIN_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

const VALID_ROLES: RoleCode[] = [
  "QUAN_TRI_TW",
  "QUAN_TRI_TINH",
  "QUAN_TRI_CAP3",
  "DON_VI",
  "BIEN_TAP_VIEN",
  "DOAN_VIEN",
];

const ALLOWED_ADMIN_ROLES = ACCOUNT_ADMIN_ROLES;

/** GET /api/accounts — danh sách tài khoản cho trang Phân quyền (kèm số quyền gán riêng). */
export async function GET(request: NextRequest) {
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session) {
    return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });
  }
  if (!ALLOWED_ADMIN_ROLES.includes(session.role as RoleCode)) {
    return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN XEM TÀI KHOẢN" }, { status: 403 });
  }

  const rows = await query<{
    id: number; org_unit_id: number; username: string; email: string; phone: string | null;
    contact_person: string | null; contact_position: string | null; chuc_danh: string | null;
    class_name: string | null; role_code: string | null; status: string;
    last_login_at: Date | null; org_name: string; org_level: number; perm_count: number | string;
  }>(
    `SELECT a.id, a.org_unit_id, a.username, a.email, a.phone, a.contact_person, a.contact_position,
            a.chuc_danh, a.class_name, a.role_code, a.status, a.last_login_at,
            o.name AS org_name, o.org_level,
            (SELECT count(*) FROM account_permissions ap WHERE ap.account_id = a.id) AS perm_count
     FROM accounts a JOIN org_units o ON o.id = a.org_unit_id
     WHERE a.deleted_at IS NULL
     ORDER BY o.org_level, o.path, a.id`,
  );

  // Phạm vi: TW xem tất cả; tỉnh/cấp 3 chỉ xem tài khoản trong cây đơn vị của mình
  let scoped = rows;
  if (session.role !== "QUAN_TRI_TW") {
    const caller = await query<{ path: string }>(
      "SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL",
      [session.orgUnitId],
    );
    const callerPath = caller[0]?.path;
    const units = await query<{ id: number; path: string }>("SELECT id, path FROM org_units WHERE deleted_at IS NULL");
    const okUnits = new Set(
      units.filter((u) => callerPath && u.path.startsWith(callerPath)).map((u) => Number(u.id)),
    );
    scoped = rows.filter((r) => okUnits.has(Number(r.org_unit_id)));
  }

  return NextResponse.json({
    ok: true,
    accounts: scoped.map((r) => ({
      id: Number(r.id),
      orgUnitId: Number(r.org_unit_id),
      orgUnitName: r.org_name,
      orgLevel: Number(r.org_level),
      username: r.username,
      email: r.email,
      phone: r.phone ?? "",
      contactPerson: r.contact_person ?? r.username,
      contactPosition: r.contact_position ?? "",
      chucDanh: r.chuc_danh ?? "",
      className: r.class_name ?? "",
      role: r.role_code ?? "DON_VI",
      status: r.status,
      lastLoginAt: r.last_login_at ? r.last_login_at.toISOString() : "",
      permCount: Number(r.perm_count ?? 0),
    })),
  });
}

/** POST /api/accounts — quản trị tạo tài khoản (trang Hệ thống › Phân quyền & Tài khoản, kèm nhập file). */
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
    if (!ALLOWED_ADMIN_ROLES.includes(session.role as RoleCode)) {
      return NextResponse.json(
        { ok: false, error: "BẠN KHÔNG CÓ QUYỀN TẠO TÀI KHOẢN QUẢN TRỊ" },
        { status: 403 },
      );
    }

    const callerUnits = await query<{ id: number; path: string; org_level: number }>(
      "SELECT id, path, org_level FROM org_units WHERE id = $1 AND deleted_at IS NULL",
      [session.orgUnitId],
    );
    const callerUnit = callerUnits[0];

    const body = (await request.json().catch(() => null)) as
      | {
          accounts?: {
            orgUnitId?: number;
            username?: string;
            email?: string;
            phone?: string;
            contactPerson?: string;
            contactPosition?: string;
            chucDanh?: string;
            className?: string;
            role?: string;
            status?: string;
            password?: string;
            perms?: string[];
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
      const rawPassword = String(input.password ?? "").trim();

      try {
        if (!username || !email || !orgUnitId || !VALID_ROLES.includes(role)) {
          throw new Error("Thiếu thông tin hoặc vai trò không hợp lệ.");
        }
        if (!rawPassword || rawPassword.length < 6) {
          throw new Error("Mật khẩu khởi tạo là bắt buộc và phải có ít nhất 6 ký tự.");
        }

        // Kiểm tra thẩm quyền tạo vai trò theo cấp
        if (session.role === "QUAN_TRI_TINH") {
          if (role === "QUAN_TRI_TW" || role === "QUAN_TRI_TINH" || role === "BIEN_TAP_VIEN") {
            throw new Error("Quản trị cấp Tỉnh không thể tạo tài khoản Trung ương, Tỉnh hoặc Biên tập viên.");
          }
        } else if (session.role === "QUAN_TRI_CAP3") {
          if (role !== "DON_VI" && role !== "DOAN_VIEN") {
            throw new Error("Quản trị cấp 3 chỉ có thể tạo tài khoản Đơn vị cơ sở hoặc Đoàn viên.");
          }
        }

        const units = await query<{ id: number; org_level: number; path: string }>(
          "SELECT id, org_level, path FROM org_units WHERE id = $1 AND deleted_at IS NULL",
          [orgUnitId],
        );
        const targetUnit = units[0];
        if (!targetUnit) throw new Error("Đơn vị không tồn tại.");

        // Kiểm tra thẩm quyền phạm vi đơn vị (scope)
        if (session.role !== "QUAN_TRI_TW" && callerUnit) {
          const isDescendant =
            targetUnit.id === callerUnit.id ||
            targetUnit.path.startsWith(`${callerUnit.path}.`);
          if (!isDescendant) {
            throw new Error("Đơn vị nằm ngoài phạm vi quản lý của bạn.");
          }
        }

        if (targetUnit.org_level >= 2) {
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

        const passwordHash = await hashPassword(rawPassword);
        const status = ["PENDING", "ACTIVE", "LOCKED", "DISABLED"].includes(
          String(input.status ?? "ACTIVE"),
        )
          ? String(input.status ?? "ACTIVE")
          : "ACTIVE";

        const rows = await query<{ id: number }>(
          `INSERT INTO accounts (org_unit_id, username, email, phone, password_hash, contact_person,
             contact_position, chuc_danh, class_name, status, role_code, must_change_password, password_changed_at)
           OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NULL)
           RETURNING id`,
          [
            orgUnitId,
            username,
            email,
            input.phone?.trim() || null,
            passwordHash,
            input.contactPerson?.trim() || username,
            input.contactPosition?.trim() || null,
            input.chucDanh?.trim() || null,
            input.className?.trim() || null,
            status,
            role,
          ],
        );
        const newId = Number(rows[0].id);
        // Quyền ban đầu: tick mục nào xem mục đó (danh sách rỗng/bỏ trống = theo vai trò)
        const perms = Array.isArray(input.perms) ? input.perms.map(String).filter((p) => p) : [];
        for (const code of perms) {
          await query(
            "INSERT INTO account_permissions (account_id, perm_code, granted_by_account_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            [newId, code, session.accountId],
          );
        }
        created.push(newId);
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
