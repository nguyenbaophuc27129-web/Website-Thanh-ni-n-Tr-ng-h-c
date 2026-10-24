import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query, withTransaction } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { effectivePermissions, hasPerm } from "@/lib/permissions";
import { permissionsList } from "@/data/org-units";

export const runtime = "nodejs";

/**
 * Quyền RIÊNG của 1 tài khoản (bảng account_permissions):
 * - GET: xem các quyền được gán.
 * - PUT: Admin phân quyền trực tiếp cho các tài khoản — tick mục nào xem mục đó.
 *   Danh sách rỗng = xoá hết quyền riêng → trở lại quyền mặc định theo vai trò.
 */

async function callerPerms(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session || !dbEnabled()) return null;
  const perms = effectivePermissions({
    role: session.role,
    contactPosition: session.contactPosition,
    grantedPerms: session.grantedPerms,
  });
  return { session, perms };
}

/** Admin có thẩm quyền phân quyền trực tiếp cho mọi tài khoản */
async function canGrantPermissions(
  callerRole: string,
  callerAccountId: number,
  callerUnitId: number,
  callerPerms: string[],
  targetAccountId: number,
  targetUnitId: number,
): Promise<boolean> {
  // Không tự phân quyền cho chính mình
  if (callerAccountId === targetAccountId) return false;
  // Quản trị viên Trung ương hoặc tài khoản có quyền toàn phần / quản lý tài khoản được phân quyền cho bất kỳ ai
  if (callerRole === "QUAN_TRI_TW" || hasPerm(callerPerms, "*") || hasPerm(callerPerms, "system.account.manage")) {
    return true;
  }
  if (callerUnitId === targetUnitId) return true;
  const [cPath, tPath] = await Promise.all([
    query<{ path: string }>("SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL", [callerUnitId]),
    query<{ path: string }>("SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL", [targetUnitId]),
  ]);
  const c = cPath[0]?.path;
  const t = tPath[0]?.path;
  return Boolean(c && t && t.startsWith(c));
}

/** GET /api/accounts/[id]/permissions */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const ctx = await callerPerms(request);
  if (!ctx) return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });

  const { id } = await params;
  const accountId = Number(id);
  if (!accountId) return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });

  const rows = await query<{ perm_code: string }>(
    "SELECT perm_code FROM account_permissions WHERE account_id = $1 ORDER BY perm_code",
    [accountId],
  );
  return NextResponse.json({ ok: true, perms: rows.map((r) => r.perm_code) });
}

/** PUT /api/accounts/[id]/permissions — body { perms: string[] } */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  const ctx = await callerPerms(request);
  if (!ctx) return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });

  const { id } = await params;
  const accountId = Number(id);
  if (!accountId) return NextResponse.json({ ok: false, error: "DỮ LIỆU KHÔNG HỢP LỆ" }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { perms?: string[] } | null;
  const perms = Array.isArray(body?.perms) ? body!.perms.map(String) : [];
  const validCodes = new Set(permissionsList.map((p) => p.code));
  if (perms.some((p) => p !== "*" && !validCodes.has(p))) {
    return NextResponse.json({ ok: false, error: "CÓ MÃ QUYỀN KHÔNG HỢP LỆ" }, { status: 400 });
  }

  const targets = await query<{ id: number; org_unit_id: number; role_code: string }>(
    "SELECT id, org_unit_id, role_code FROM accounts WHERE id = $1 AND deleted_at IS NULL",
    [accountId],
  );
  const target = targets[0];
  if (!target) return NextResponse.json({ ok: false, error: "KHÔNG TÌM THẤY TÀI KHOẢN" }, { status: 404 });

  if (
    !(await canGrantPermissions(
      ctx.session.role,
      ctx.session.accountId,
      ctx.session.orgUnitId,
      ctx.perms,
      accountId,
      Number(target.org_unit_id),
    ))
  ) {
    return NextResponse.json(
      { ok: false, error: "BẠN KHÔNG CÓ THẨM QUYỀN PHÂN QUYỀN CHO TÀI KHOẢN NÀY" },
      { status: 403 },
    );
  }

  await withTransaction(async (client) => {
    await client.query("DELETE FROM account_permissions WHERE account_id = $1", [accountId]);
    for (const code of perms) {
      await client.query(
        "INSERT INTO account_permissions (account_id, perm_code, granted_by_account_id) VALUES ($1, $2, $3)",
        [accountId, code, ctx.session.accountId],
      );
    }
  });

  return NextResponse.json({ ok: true, perms });
}
